/**
 * The tools on the floating tool bar, in its order, each on a number key and
 * a letter, as in Excalidraw. Shapes is not a mode: it opens the library.
 *
 * @typedef {'select' | 'hand' | 'shapes' | 'connector' | 'text' | 'pen' | 'eraser'} ToolId
 * @typedef {{ id: ToolId, label: string, keys: string[], hint: string }} Tool
 */

export const TOOL = Object.freeze({
  SELECT: 'select',
  HAND: 'hand',
  SHAPES: 'shapes',
  CONNECTOR: 'connector',
  TEXT: 'text',
  PEN: 'pen',
  ERASER: 'eraser',
})

/** @type {readonly Tool[]} */
export const TOOLS = Object.freeze([
  { id: TOOL.SELECT, label: 'Select', keys: ['1', 'V'], hint: 'Select, move and open shapes' },
  { id: TOOL.HAND, label: 'Hand', keys: ['2', 'H'], hint: 'Move around the canvas' },
  { id: TOOL.SHAPES, label: 'Shapes', keys: ['3'], hint: 'Open the shape library' },
  {
    id: TOOL.CONNECTOR,
    label: 'Connector',
    keys: ['4', 'C'],
    hint: 'Click one shape, then another, to connect them',
  },
  { id: TOOL.TEXT, label: 'Text', keys: ['5', 'T'], hint: 'Click the canvas to write there' },
  { id: TOOL.PEN, label: 'Pen', keys: ['6', 'P'], hint: 'Draw by hand on the canvas' },
  {
    id: TOOL.ERASER,
    label: 'Eraser',
    keys: ['7', 'E'],
    hint: 'Click a shape or a connection to delete it',
  },
])

/**
 * The tool a key picks, or null. Letters in either case; digits as typed.
 * @param {string} key a KeyboardEvent key
 * @returns {ToolId | null}
 */
export function toolForKey(key) {
  const wanted = key.length === 1 ? key.toUpperCase() : ''
  return TOOLS.find((tool) => tool.keys.includes(wanted))?.id ?? null
}
