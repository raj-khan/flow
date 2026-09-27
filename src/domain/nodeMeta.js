import { SHAPE } from './constants.js'
import { truncate } from './format.js'

/**
 * @typedef {Object} NodeMeta
 * @property {string} label
 * @property {string} hint      what the shape conventionally means
 * @property {string} accent    token name, resolved to classes by the canvas
 * @property {'diagram' | 'wireframe' | 'ink'} group where the palette lists it; ink is drawn with the pen, not picked
 * @property {boolean} openable can the drawer be opened
 * @property {boolean} editable
 * @property {boolean} deletable
 * @property {(node: import('./types.js').FlowNode) => string} summary
 */

/** @param {import('./types.js').FlowNode} node */
const describe = (node) => (node.data.description ? truncate(node.data.description) : '')

/**
 * @param {string} label
 * @param {string} hint
 * @param {string} accent
 * @param {NodeMeta['group']} [group]
 * @returns {NodeMeta}
 */
const shape = (label, hint, accent, group = 'diagram') => ({
  label,
  hint,
  accent,
  group,
  openable: true,
  editable: true,
  deletable: true,
  summary: describe,
})

/**
 * Every per-shape difference, as data. Components read this instead of
 * branching on type, so adding a shape is one entry here and one outline in
 * `shapes.js`. Order is palette order.
 *
 * @type {Readonly<Record<string, NodeMeta>>}
 */
export const NODE_META = Object.freeze({
  [SHAPE.PROCESS]: shape('Process', 'A step', 'message'),
  [SHAPE.TERMINAL]: shape('Start / end', 'Where a flow begins or ends', 'trigger'),
  [SHAPE.DECISION]: shape('Decision', 'A question with more than one way out', 'hours'),
  [SHAPE.DATA]: shape('Input / output', 'Data going in or out', 'branch'),
  [SHAPE.DATABASE]: shape('Database', 'A store of data', 'branch'),
  [SHAPE.DOCUMENT]: shape('Document', 'A file or report', 'comment'),
  [SHAPE.NOTE]: shape('Note', 'An annotation', 'comment'),
  [SHAPE.TABLE]: shape('Table', 'A database table and its columns', 'branch'),
  [SHAPE.TEXT]: shape('Text', 'A label with no outline', 'unknown'),
  // Clicked often, to select it or what is inside, so a click never opens its details.
  [SHAPE.FRAME]: {
    ...shape('Frame', 'A named region; the shapes inside it belong to it', 'unknown'),
    openable: false,
  },
  [SHAPE.SCREEN]: shape('Screen', 'A page or screen of the interface', 'trigger', 'wireframe'),
  [SHAPE.BUTTON]: shape('Button', 'Something to press', 'message', 'wireframe'),
  [SHAPE.INPUT]: shape('Input', 'A form field', 'branch', 'wireframe'),
  [SHAPE.CARD]: shape('Card', 'A panel that groups content', 'comment', 'wireframe'),
  [SHAPE.LIST]: shape('List', 'Repeated items, such as rows or results', 'hours', 'wireframe'),
  [SHAPE.IMAGE]: shape('Image', 'A picture, video or chart', 'comment', 'wireframe'),
  [SHAPE.INK]: shape('Pen stroke', 'A mark drawn by hand', 'unknown', 'ink'),
})

/**
 * So an unfamiliar type renders instead of crashing the canvas.
 * @type {NodeMeta}
 */
const FALLBACK_META = Object.freeze(
  shape('Unknown', 'A shape this version does not know', 'unknown'),
)

/** @param {string} type @returns {NodeMeta} */
export const metaFor = (type) => NODE_META[type] ?? FALLBACK_META

/** @param {import('./types.js').FlowNode} node */
export const isOpenable = (node) => metaFor(node.type).openable

/** @param {import('./types.js').FlowNode} node */
export const isDeletable = (node) => metaFor(node.type).deletable

/** @param {string} type */
export const isKnownShape = (type) => Object.hasOwn(NODE_META, type)

/** Every shape a picker offers, in palette order. A stroke is drawn, not picked. */
export const SHAPE_OPTIONS = Object.freeze(
  Object.entries(NODE_META)
    .filter(([, meta]) => meta.group !== 'ink')
    .map(([value, meta]) => ({
      value,
      label: meta.label,
      hint: meta.hint,
      group: meta.group,
    })),
)

/**
 * camelCase or snake_case to Title Case, for stored values shown as they are.
 * @param {string} value
 * @returns {string}
 */
export function humanise(value) {
  return String(value ?? '')
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (char) => char.toUpperCase())
}
