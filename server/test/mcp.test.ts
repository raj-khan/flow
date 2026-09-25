import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import type { NestExpressApplication } from '@nestjs/platform-express'
import type pg from 'pg'

import { createApp } from '../src/app.js'
import { readConfig } from '../src/config.js'
import { openPool } from '../src/database.js'

/**
 * The remote MCP against a real PostgreSQL: DATABASE_URL names an empty
 * database, which the tests clear before they start.
 */
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://postgres@localhost:5432/isketch_test'

const FLOW = [
  'title: Shop',
  'note: Use NestJS and PostgreSQL',
  '',
  'api = process "API" -- REST',
  'db = database "Orders"',
  'api -> db : SQL',
].join('\n')

let app: NestExpressApplication
let pool: pg.Pool
let base = ''

before(async () => {
  pool = await openPool(DATABASE_URL)
  await pool.query('TRUNCATE diagrams')
  app = await createApp(
    readConfig({
      DATABASE_URL,
      PUBLIC_URL: 'https://isketch.test',
      APP_URL: 'https://app.isketch.test',
      MAX_BYTES: '2000',
    }),
    pool,
  )
  await app.listen(0)
  base = await app.getUrl()
})

after(async () => {
  await app.close()
  await pool.end()
})

interface RpcResult {
  jsonrpc: '2.0'
  id: number
  result?: { content?: { text: string }[]; [key: string]: unknown }
  error?: { code: number; message: string }
}

/** One JSON-RPC request over HTTP, as a Streamable HTTP client sends it. */
async function rpc(method: string, params?: unknown): Promise<RpcResult> {
  const response = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  assert.equal(response.status, 200)
  return (await response.json()) as RpcResult
}

const textOf = (response: RpcResult) => response.result?.content?.[0]?.text ?? ''

/** Publish through the public API, and get the link and edit token it returns. */
async function publish(): Promise<{ id: string; url: string; editToken: string }> {
  const response = await fetch(`${base}/api/diagrams`, {
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: FLOW,
  })
  assert.equal(response.status, 201)
  return (await response.json()) as { id: string; url: string; editToken: string }
}

describe('the protocol', () => {
  it('shakes hands, lists its tools and answers ping', async () => {
    const init = await rpc('initialize', { protocolVersion: '2025-06-18' })
    assert.equal(init.result?.protocolVersion, '2025-06-18')
    assert.equal((init.result?.serverInfo as { name: string }).name, 'isketch')
    assert.match(init.result?.instructions as string, /\.flow/)
    assert.match(init.result?.instructions as string, /edit token/)

    const list = await rpc('tools/list')
    const names = (list.result?.tools as { name: string }[]).map((tool) => tool.name)
    assert.deepEqual(names.sort(), [
      'diff_diagrams',
      'list_diagrams',
      'read_diagram',
      'render_diagram',
      'write_diagram',
    ])

    assert.deepEqual((await rpc('ping')).result, {})
  })

  it('accepts a notification with no body, refuses GET and unknown methods', async () => {
    const notified = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    })
    assert.equal(notified.status, 202)

    assert.equal((await fetch(`${base}/mcp`)).status, 405)

    const unknown = await rpc('resources/list')
    assert.equal(unknown.error?.code, -32601)
  })

  it('lets a browser client call it: the preflight passes', async () => {
    const preflight = await fetch(`${base}/mcp`, {
      method: 'OPTIONS',
      headers: {
        origin: 'https://claude.ai',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type, mcp-protocol-version',
      },
    })
    assert.equal(preflight.status, 204)
    assert.equal(preflight.headers.get('access-control-allow-origin'), '*')
    assert.match(
      preflight.headers.get('access-control-allow-headers') ?? '',
      /mcp-protocol-version/i,
    )
  })
})

describe('reading a hosted diagram', () => {
  it('reads the brief, or the .flow text to edit and write back', async () => {
    const { url } = await publish()

    const brief = await rpc('tools/call', {
      name: 'read_diagram',
      arguments: { url },
    })
    assert.match(textOf(brief), /^# Shop\n/)
    assert.match(textOf(brief), /- \*\*API\*\* → \*\*Orders\*\*: SQL/)

    const flow = await rpc('tools/call', {
      name: 'read_diagram',
      arguments: { url, format: 'flow' },
    })
    assert.match(textOf(flow), /api -> db : SQL/)
  })

  it('lists the diagrams at the links it is given', async () => {
    const { id, url } = await publish()
    const listed = await rpc('tools/call', {
      name: 'list_diagrams',
      arguments: { urls: [url, `${url}.md`, 'https://isketch.test/d/n0thingHere1234'] },
    })
    const text = textOf(listed)
    assert.match(
      text,
      new RegExp(`- https://isketch\\.test/d/${id}: "Shop", 2 shapes, 1 connection`),
    )
    assert.match(text, /- https:\/\/isketch\.test\/d\/n0thingHere1234: no diagram at this link/)
  })

  it('renders the drawing, and draws dark when asked', async () => {
    const { url } = await publish()
    assert.match(
      textOf(await rpc('tools/call', { name: 'render_diagram', arguments: { url } })),
      /^<svg /,
    )
    assert.match(
      textOf(
        await rpc('tools/call', { name: 'render_diagram', arguments: { url, theme: 'dark' } }),
      ),
      /#0d1117/,
    )
  })

  it('says so, as a tool error, for a link with no diagram', async () => {
    const response = await rpc('tools/call', {
      name: 'read_diagram',
      arguments: { url: 'https://isketch.test/d/n0thingHere1234' },
    })
    assert.equal(response.result?.isError, true)
    assert.match(textOf(response), /No diagram at this link/)
  })
})

describe('writing a hosted diagram', () => {
  it('needs the edit token, and refuses the wrong one', async () => {
    const { url } = await publish()
    const text = FLOW.replace('"Orders"', '"Order store"')

    const noToken = await rpc('tools/call', { name: 'write_diagram', arguments: { url, text } })
    assert.equal(noToken.result?.isError, true)
    assert.match(textOf(noToken), /edit_token is required/)

    const wrong = await rpc('tools/call', {
      name: 'write_diagram',
      arguments: { url, text, edit_token: 'not-the-token' },
    })
    assert.equal(wrong.result?.isError, true)
    assert.match(textOf(wrong), /edit token does not match/)
  })

  it('updates with the edit token and describes what changed', async () => {
    const { url, editToken } = await publish()
    const text = FLOW.replace('"Orders"', '"Order store"')

    const updated = await rpc('tools/call', {
      name: 'write_diagram',
      arguments: { url, text, edit_token: editToken },
    })
    assert.equal(updated.result?.isError, undefined)
    assert.match(textOf(updated), /Updated https:\/\/isketch\.test\/d\//)
    assert.match(textOf(updated), /Orders .+ Order store|Order store/)

    const reread = await rpc('tools/call', {
      name: 'read_diagram',
      arguments: { url, format: 'flow' },
    })
    assert.match(textOf(reread), /"Order store"/)
  })

  it('publishes a new diagram without a url, returning the link and edit token', async () => {
    const created = await rpc('tools/call', { name: 'write_diagram', arguments: { text: FLOW } })
    assert.equal(created.result?.isError, undefined)
    const text = textOf(created)
    assert.match(text, /Published https:\/\/isketch\.test\/d\/[A-Za-z0-9]{14}/)
    const token = /Edit token: (\S+)/.exec(text)?.[1]
    assert.ok(token)

    const url = /Published (https:\/\/\S+\/d\/[A-Za-z0-9]+)/.exec(text)?.[1] as string
    assert.match(
      textOf(await rpc('tools/call', { name: 'read_diagram', arguments: { url } })),
      /^# Shop\n/,
    )
  })

  it('writes nothing when the text has errors, and says where', async () => {
    const { url, editToken } = await publish()
    const broken = await rpc('tools/call', {
      name: 'write_diagram',
      arguments: { url, text: 'api = process "API"\nb = hexagon "B"', edit_token: editToken },
    })
    assert.equal(broken.result?.isError, true)
    assert.match(textOf(broken), /line 2:/)

    const reread = await rpc('tools/call', {
      name: 'read_diagram',
      arguments: { url, format: 'flow' },
    })
    assert.match(textOf(reread), /db = database "Orders"/)
  })
})

describe('comparing versions', () => {
  it('lists what would change, without writing', async () => {
    const { url } = await publish()
    const text = [FLOW, 'cache = process "Cache"', 'api -> cache : read'].join('\n')

    const diff = await rpc('tools/call', { name: 'diff_diagrams', arguments: { url, text } })
    assert.match(textOf(diff), /\+ Cache/)
    assert.match(textOf(diff), /\+ API → Cache \(read\)/)

    const reread = await rpc('tools/call', {
      name: 'read_diagram',
      arguments: { url, format: 'flow' },
    })
    assert.doesNotMatch(textOf(reread), /Cache/)
  })
})
