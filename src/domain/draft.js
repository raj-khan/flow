import { COLOR_NAMES } from './colors.js'
import { parseFlow } from './flowText.js'
import { SHAPE_OPTIONS } from './nodeMeta.js'

/**
 * A diagram from words, with any agent: a prompt that teaches the `.flow`
 * format and asks for one, and a reader for the answer. Nothing goes to a
 * server of ours; the person takes the prompt to the agent they already use.
 */

/** Where a prompt can be opened already filled in. */
export const AGENT_LINKS = Object.freeze([
  {
    id: 'claude',
    label: 'Open in Claude',
    url: (/** @type {string} */ prompt) => `https://claude.ai/new?q=${encodeURIComponent(prompt)}`,
  },
  {
    id: 'chatgpt',
    label: 'Open in ChatGPT',
    url: (/** @type {string} */ prompt) => `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`,
  },
])

/**
 * @param {string} description what the person wants drawn, in their words
 * @returns {string}
 */
export function draftPrompt(description) {
  const shapes = SHAPE_OPTIONS.map(
    (option) => `- \`${option.value}\`: ${option.hint.toLowerCase()}`,
  ).join('\n')
  return `Draw this as an isketch diagram, in the .flow text format described below.

What to draw:
${description.trim()}

The .flow format, one declaration per line:

- \`title: ...\` first.
- \`id = shape "Name" -- description\`: a shape. Ids are short, lowercase, letters, digits, _ and -. The description is optional and short.
- \`a -> b : label\`: a connection, label optional. \`-->\` is dashed (optional or asynchronous), \`<->\` goes both ways.
- \`note: ...\` under the title for an instruction to whoever builds it; \`id note: ...\` for one shape.
- \`id color: red\` colours a shape, one of ${COLOR_NAMES.join(', ')}; only where colour means something.
- A \`table\` lists its columns in its description: \`id PK, email, user_id FK\`.
- \`id = frame "Name"\` groups the shapes inside it, but only with positions; leave frames out here.
- Leave out any @layout block: isketch lays the diagram out.

Shapes:
${shapes}

Example:

\`\`\`flow
title: Shop
note: Every write must be idempotent

web = screen "Storefront" -- /shop
api = process "API" -- REST
paid = decision "Paid?"
db = database "Orders"

web -> api : HTTPS
api -> paid
paid -> db : yes
paid --> web : no, retry
\`\`\`

Reply with only the diagram, in one \`\`\`flow code block. Use the shapes that fit best, name things as the description does, and include every part and connection it mentions.`
}

/**
 * The diagram in an agent's answer: the first fenced block, or the whole
 * answer when it has none.
 * @param {string} answer
 * @returns {{ document: import('./types.js').FlowDocument | null, errors: { line: number, message: string }[] }}
 */
export function readDraft(answer) {
  const text = String(answer ?? '')
  const fenced = /```[\w-]*\s*\n([\s\S]*?)```/.exec(text)
  const { document, errors } = parseFlow((fenced?.[1] ?? text).trim())
  if (document && !document.nodes.length) {
    return { document: null, errors: [{ line: 1, message: 'There are no shapes in this answer.' }] }
  }
  return { document, errors }
}
