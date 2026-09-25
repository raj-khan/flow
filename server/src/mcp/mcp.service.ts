import { HttpException, Inject, Injectable } from '@nestjs/common'

import { CONFIG, type Config } from '../config.js'
import { DiagramsService } from '../diagrams/diagrams.service.js'
import { loadDomain, type FlowDocument } from '../domain.js'

/**
 * The hosted diagrams over MCP: the same tools the local `isketch mcp` has,
 * behind public links. Anyone with a link can read a diagram; only its edit
 * token can change it. Transport framing (HTTP, JSON-RPC) lives in the
 * controller; this class is the protocol and the tools, so it tests alone.
 */

export const SERVER_INFO = Object.freeze({ name: 'isketch', version: '0.1.0' })

/** Newest first; a client asking for one we do not know gets the newest. */
const PROTOCOL_VERSIONS = Object.freeze(['2025-06-18', '2025-03-26', '2024-11-05'])

/** A tool's failure the agent should read and act on, not a protocol error. */
class ToolError extends Error {}

interface Tool {
  name: string
  description: string
  inputSchema: { type: 'object'; properties: Record<string, unknown>; required?: string[] }
  run(args: Record<string, unknown>): Promise<string>
}

export interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: string | number | null
  result?: unknown
  error?: { code: number; message: string }
}

const LINK = {
  type: 'string',
  description:
    'A hosted diagram link, such as https://isketch.example/d/aBcD123efgHiJ, or its id alone',
}

const EMPTY: FlowDocument = { version: 3, title: '', nodes: [], edges: [] }

@Injectable()
export class McpService {
  private readonly tools: Tool[] = [
    {
      name: 'list_diagrams',
      description:
        'List the hosted diagrams at the given links, with title and size. Links are ' +
        'unguessable, so pass every one you know.',
      inputSchema: {
        type: 'object',
        properties: { urls: { type: 'array', items: LINK, description: 'The diagram links' } },
        required: ['urls'],
      },
      run: (args) => this.listDiagrams(args),
    },
    {
      name: 'read_diagram',
      description:
        'Read a hosted diagram. "brief" (the default) explains each shape and connection in ' +
        'Markdown and ends with the source; "flow" is the .flow text alone, to edit and write back.',
      inputSchema: {
        type: 'object',
        properties: { url: LINK, format: { type: 'string', enum: ['brief', 'flow'] } },
        required: ['url'],
      },
      run: (args) => this.readDiagram(args),
    },
    {
      name: 'write_diagram',
      description:
        'Publish or update a hosted diagram with .flow text. Without a url it publishes a new ' +
        "one and returns its link and edit token; with a url it needs that diagram's edit token. " +
        'Nothing is written if the text has errors; they come back with line numbers.',
      inputSchema: {
        type: 'object',
        properties: {
          url: LINK,
          text: { type: 'string', description: 'The whole diagram' },
          edit_token: {
            type: 'string',
            description: 'The token returned when this diagram was published',
          },
        },
        required: ['text'],
      },
      run: (args) => this.writeDiagram(args),
    },
    {
      name: 'render_diagram',
      description: 'Draw a hosted diagram as SVG, in light or dark.',
      inputSchema: {
        type: 'object',
        properties: { url: LINK, theme: { type: 'string', enum: ['light', 'dark'] } },
        required: ['url'],
      },
      run: (args) => this.renderDiagram(args),
    },
    {
      name: 'diff_diagrams',
      description:
        'List what changed between a hosted diagram and other .flow text, such as a proposed ' +
        'edit: shapes and connections added, removed and changed.',
      inputSchema: {
        type: 'object',
        properties: { url: LINK, text: { type: 'string', description: 'The other version' } },
        required: ['url', 'text'],
      },
      run: (args) => this.diffDiagrams(args),
    },
  ]

  private instructions?: Promise<string>

  constructor(
    private readonly diagrams: DiagramsService,
    @Inject(CONFIG) private readonly config: Config,
  ) {}

  /**
   * One JSON-RPC message in, one response out — or null for a notification.
   * @param message a parsed JSON-RPC request or notification
   */
  async handle(message: unknown): Promise<JsonRpcResponse | null> {
    const { jsonrpc, id, method, params } = (message ?? {}) as {
      jsonrpc?: unknown
      id?: string | number | null
      method?: unknown
      params?: unknown
    }
    const isRequest = id !== undefined && id !== null
    if (jsonrpc !== '2.0' || typeof method !== 'string') {
      return isRequest ? failure(id ?? null, -32600, 'Invalid request') : null
    }
    if (!isRequest) return null

    try {
      switch (method) {
        case 'initialize': {
          const requested = (params as { protocolVersion?: unknown })?.protocolVersion
          return success(id, {
            protocolVersion:
              typeof requested === 'string' && PROTOCOL_VERSIONS.includes(requested)
                ? requested
                : PROTOCOL_VERSIONS[0],
            capabilities: { tools: {} },
            serverInfo: SERVER_INFO,
            instructions: await this.instructionText(),
          })
        }
        case 'ping':
          return success(id, {})
        case 'tools/list':
          return success(id, {
            tools: this.tools.map(({ name, description, inputSchema }) => ({
              name,
              description,
              inputSchema,
            })),
          })
        case 'tools/call':
          return success(id, await this.callTool(params as { name?: string; arguments?: unknown }))
        default:
          return failure(id, -32601, `Unknown method: ${method}`)
      }
    } catch (error) {
      return failure(id, -32603, error instanceof Error ? error.message : String(error))
    }
  }

  /** @param params a tools/call params object */
  private async callTool(params: { name?: string; arguments?: unknown } | undefined) {
    const tool = this.tools.find((candidate) => candidate.name === params?.name)
    if (!tool) return toolResult(`Unknown tool: ${params?.name}`, true)

    try {
      return toolResult(await tool.run((params?.arguments ?? {}) as Record<string, unknown>))
    } catch (error) {
      if (error instanceof ToolError) return toolResult(error.message, true)
      if (error instanceof HttpException) return toolResult(describeHttpException(error), true)
      throw error
    }
  }

  private async listDiagrams({ urls }: { urls?: unknown }) {
    const links = Array.isArray(urls) ? urls : typeof urls === 'string' ? [urls] : []
    if (!links.length) {
      throw new ToolError(
        'Give the links to list, such as urls: ["https://isketch.example/d/aBcD123efgHiJ"].',
      )
    }
    const lines = await Promise.all(
      links.map(async (url) => {
        const id = this.idOf(url)
        try {
          const { row, document } = await this.diagrams.load(id)
          return (
            `- ${this.linkOf(id)}: "${document.title}", ${document.nodes.length} shapes, ` +
            `${document.edges.length} connections (revision ${row.revision})`
          )
        } catch {
          return `- ${this.linkOf(id)}: no diagram at this link`
        }
      }),
    )
    return lines.join('\n')
  }

  private async readDiagram({ url, format = 'brief' }: { url?: unknown; format?: unknown }) {
    const id = this.idOf(url)
    const { row, document } = await this.diagrams.load(id)
    if (format === 'flow') return row.text
    const { toBrief } = await loadDomain()
    return toBrief(document)
  }

  private async writeDiagram({
    url,
    text,
    edit_token: token,
  }: {
    url?: unknown
    text?: unknown
    edit_token?: unknown
  }) {
    if (typeof text !== 'string' || !text.trim()) throw new ToolError('text is required.')

    if (url === undefined) {
      const published = await this.diagrams.publish(text)
      const { parseFlow } = await loadDomain()
      const { document } = parseFlow(text)
      return [
        `Published ${published.url}: ${document?.nodes.length ?? 0} shapes, ` +
          `${document?.edges.length ?? 0} connections.`,
        `Edit token: ${published.editToken}`,
        'Anyone with the link can read this diagram; keep the token to update or unpublish it.',
      ].join('\n')
    }

    const id = this.idOf(url)
    if (typeof token !== 'string' || !token) {
      throw new ToolError(
        `edit_token is required to write ${this.linkOf(id)}; it was returned when the diagram was published.`,
      )
    }
    const { document: before } = await this.diagrams.load(id)
    const updated = await this.diagrams.update(id, token, text)

    const { parseFlow, diffDocuments, describeDiff, isUnchanged } = await loadDomain()
    const after = parseFlow(text).document ?? EMPTY
    const changes = diffDocuments(before, after)
    return isUnchanged(changes)
      ? `${this.linkOf(id)} is unchanged.`
      : [
          `Updated ${this.linkOf(id)} (revision ${updated.revision}):`,
          ...describeDiff(before, after, changes),
        ].join('\n')
  }

  private async renderDiagram({ url, theme }: { url?: unknown; theme?: unknown }) {
    const id = this.idOf(url)
    const { document } = await this.diagrams.load(id)
    const domain = await loadDomain()
    const sketchFont = document.style === 'sketch' ? await domain.sketchFont() : ''
    return domain.renderSvg(document, {
      theme: theme === 'dark' ? 'dark' : 'light',
      sketchFont,
    })
  }

  private async diffDiagrams({ url, text }: { url?: unknown; text?: unknown }) {
    const id = this.idOf(url)
    if (typeof text !== 'string') throw new ToolError('text is required.')

    const { document: before } = await this.diagrams.load(id)
    const { parseFlow, diffDocuments, describeDiff, isUnchanged } = await loadDomain()
    const { document: after, errors } = parseFlow(text)
    if (errors.length || !after) {
      throw new ToolError(
        [
          'The text has errors:',
          ...errors.map((error) => `line ${error.line}: ${error.message}`),
        ].join('\n'),
      )
    }
    const changes = diffDocuments(before, after)
    return isUnchanged(changes) ? 'No changes.' : describeDiff(before, after, changes).join('\n')
  }

  /** The id inside a link (`…/d/<id>`, with or without an extension), or an id alone. */
  private idOf(url: unknown): string {
    if (typeof url !== 'string' || !url.trim()) {
      throw new ToolError(
        'A diagram link is required, such as https://isketch.example/d/aBcD123efgHiJ.',
      )
    }
    const given = url.trim()
    const id =
      /\/d\/([A-Za-z0-9]{1,64})(?:[./?#]|$)/.exec(given)?.[1] ??
      (/^[A-Za-z0-9]{1,64}$/.test(given) ? given : undefined)
    if (!id) throw new ToolError(`${url} is not a hosted diagram link.`)
    return id
  }

  private linkOf(id: string): string {
    return `${this.config.publicUrl}/d/${id}`
  }

  private instructionText(): Promise<string> {
    this.instructions ??= (async () => {
      const { shapeOptions } = await loadDomain()
      return [
        'Diagrams here are hosted behind public links: anyone with a link can read it,',
        'and only its edit token can change it.',
        'Read one as a brief before building from it, and refer to shapes by their ids. When the',
        'code changes what a diagram shows, update it with write_diagram so the two stay true.',
        'The .flow text format: `id = shape "Name" -- description`, `a -> b : label` (`-->` dashed, `<->` both ways),',
        'positions under `@layout`.',
        "Notes (`note: ...` for the diagram, `id note: ...` for a shape) are the person's instructions:",
        'follow them, and add one when you leave something for them to decide.',
        `Shapes: ${shapeOptions().join(', ')}.`,
        'Screen, button, input, card, list and image sketch an interface.',
      ].join('\n')
    })()
    return this.instructions
  }
}

/** @param {string} text @param {boolean} [isError] */
const toolResult = (text: string, isError = false) => ({
  content: [{ type: 'text', text }],
  ...(isError ? { isError: true } : {}),
})

const success = (id: string | number, result: unknown): JsonRpcResponse => ({
  jsonrpc: '2.0',
  id,
  result,
})

const failure = (id: string | number | null, code: number, message: string): JsonRpcResponse => ({
  jsonrpc: '2.0',
  id,
  error: { code, message },
})

/** An HTTP failure the diagram service raised, said as an agent can act on it. */
function describeHttpException(error: HttpException): string {
  const response = error.getResponse()
  if (typeof response === 'object' && response !== null && 'errors' in response) {
    const { message, errors } = response as {
      message?: string
      errors?: { line: number; message: string }[]
    }
    return [
      message ?? 'The .flow text has errors.',
      ...(errors ?? []).map((item) => `line ${item.line}: ${item.message}`),
    ].join('\n')
  }
  return error.message
}
