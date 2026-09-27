import { SHAPE } from './constants.js'
import { serialiseFlow } from './flowText.js'
import { frameMembers, isFrame } from './frames.js'

/**
 * What each shape asks of whoever builds from the diagram. The palette's hints
 * say what a shape looks like; these say what it means for the code.
 * @type {Readonly<Record<string, string>>}
 */
const INTENT = Object.freeze({
  [SHAPE.PROCESS]: 'a component or step',
  [SHAPE.TERMINAL]: 'where a flow starts or ends, or something outside the system',
  [SHAPE.DECISION]: 'a branch the code must handle',
  [SHAPE.DATA]: 'data going in or out',
  [SHAPE.DATABASE]: 'a data store',
  [SHAPE.DOCUMENT]: 'a file or document',
  [SHAPE.NOTE]: 'a note for whoever builds this',
  [SHAPE.TABLE]: 'a database table',
  [SHAPE.TEXT]: 'a label',
  [SHAPE.SCREEN]: 'a screen or page of the interface',
  [SHAPE.BUTTON]: 'a button',
  [SHAPE.INPUT]: 'a form field',
  [SHAPE.CARD]: 'a card or panel',
  [SHAPE.LIST]: 'a list of repeated items',
  [SHAPE.IMAGE]: 'an image or media',
})

/** @param {string} type */
const intentOf = (type) => INTENT[type] ?? 'a shape'

/** One line, so a description cannot break the list it sits in. */
/** @param {string | undefined} text */
const oneLine = (text) =>
  String(text ?? '')
    .replace(/\s*\n\s*/g, '; ')
    .trim()

/** @param {string | undefined} text */
const noteLines = (text) =>
  String(text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

/** @param {string} text */
const escapeMarkdown = (text) => text.replace(/([\\`*_[\]])/g, '\\$1')

/**
 * A fence longer than any run of backticks inside, so the source cannot close
 * it early.
 * @param {string} text
 */
function fence(text) {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length))
  return '`'.repeat(Math.max(3, longest + 1))
}

/**
 * The diagram as a Markdown brief for a coding agent: what each shape is for,
 * every connection in words, then the `.flow` source to edit and hand back.
 * Ids are kept, so an agent can refer to a shape without guessing.
 *
 * @param {import('./types.js').FlowDocument} document
 * @returns {string}
 */
export function toBrief(document) {
  const names = new Map(document.nodes.map((node) => [node.id, node.name || node.id]))
  const label = (/** @type {string} */ id) => `**${escapeMarkdown(names.get(id) ?? id)}**`
  const count = (/** @type {number} */ n, /** @type {string} */ noun) =>
    `${n} ${noun}${n === 1 ? '' : 's'}`

  // Pen strokes are marks on the picture, not parts of the design; frames group the parts.
  const shapes = document.nodes.filter((node) => node.type !== SHAPE.INK && !isFrame(node))
  const frames = document.nodes.filter(isFrame)
  const strokes = document.nodes.filter((node) => node.type === SHAPE.INK).length

  const lines = [
    `# ${oneLine(document.title) || 'Untitled diagram'}`,
    '',
    `A design sketched in isketch: ${count(shapes.length, 'shape')} and ${count(document.edges.length, 'connection')}. ` +
      'Build from it, and refer to shapes by their ids. To change the diagram, edit the source at ' +
      'the end and hand it back.',
  ]

  const notes = noteLines(document.notes)
  if (notes.length) {
    lines.push('', '## Notes', '', 'From whoever sketched this; follow them.', '')
    notes.forEach((note) => lines.push(`- ${note}`))
  }

  if (shapes.length) {
    lines.push('', '## Shapes', '')
    shapes.forEach((node) => {
      const description = oneLine(node.data?.description)
      const detail =
        node.type === SHAPE.TABLE && description ? `Columns: ${description}` : description
      lines.push(
        `- ${label(node.id)} \`${node.id}\`: ${intentOf(node.type)}.${detail ? ` ${detail}` : ''}`,
        ...noteLines(node.data?.notes).map((note) => `  - Note: ${note}`),
      )
    })
  }

  if (frames.length) {
    const members = frameMembers(document)
    lines.push('', '## Frames', '', 'Named regions; each groups the shapes inside it.', '')
    frames.forEach((frame) => {
      const inside = (members.get(frame.id) ?? []).map(label)
      const description = oneLine(frame.data?.description)
      lines.push(
        `- ${label(frame.id)} \`${frame.id}\`: ${inside.length ? `groups ${inside.join(', ')}` : 'empty'}.${description ? ` ${description}` : ''}`,
        ...noteLines(frame.data?.notes).map((note) => `  - Note: ${note}`),
      )
    })
  }

  if (strokes) {
    lines.push(
      '',
      `The sketch also has ${count(strokes, 'pen stroke')} drawn over it by hand, left out here.`,
    )
  }

  if (document.edges.length) {
    lines.push('', '## Connections', '')
    document.edges.forEach((edge) => {
      const text = oneLine(edge.label)
      const arrow = edge.both ? '↔' : '→'
      const dashed = edge.dashed ? ' (dashed: optional or asynchronous)' : ''
      lines.push(
        `- ${label(edge.source)} ${arrow} ${label(edge.target)}${text ? `: ${text}` : ''}${dashed}`,
      )
    })
  }

  const source = serialiseFlow(document).trimEnd()
  const marks = fence(source)
  lines.push(
    '',
    '## Source',
    '',
    'The same diagram in the `.flow` format: `id = shape "Name" -- description`, ' +
      '`id note: ...`, `a -> b : label` (`-->` dashed, `<->` both ways), and positions under ' +
      '`@layout`.',
    '',
    `${marks}text`,
    source,
    marks,
  )

  return `${lines.join('\n')}\n`
}
