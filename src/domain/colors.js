import { toNodeId } from './graph.js'

/**
 * Colours a person can give a shape or a pen stroke. Each is a name, not a hex,
 * so `.flow` stays readable and an agent can make colour mean something. A
 * coloured shape strokes in the colour and fills with its soft tint; a stroke
 * draws in the colour. Values from Open Color (MIT), as Excalidraw uses, with
 * lighter strokes and darker tints for the dark theme. The canvas reads the
 * same values from `--paint-*` in `style.css`: keep the two in step.
 *
 * @typedef {{ stroke: string, fill: string }} Paint
 */

export const COLORS = Object.freeze({
  red: {
    light: { stroke: '#e03131', fill: '#ffe3e3' },
    dark: { stroke: '#ff8787', fill: '#4a1c1f' },
  },
  orange: {
    light: { stroke: '#e8590c', fill: '#ffe8cc' },
    dark: { stroke: '#ffa94d', fill: '#4a2c12' },
  },
  yellow: {
    light: { stroke: '#f08c00', fill: '#fff3bf' },
    dark: { stroke: '#ffd43b', fill: '#4a3f10' },
  },
  green: {
    light: { stroke: '#2f9e44', fill: '#d3f9d8' },
    dark: { stroke: '#69db7c', fill: '#173d22' },
  },
  teal: {
    light: { stroke: '#099268', fill: '#c3fae8' },
    dark: { stroke: '#38d9a9', fill: '#10392f' },
  },
  blue: {
    light: { stroke: '#1971c2', fill: '#d0ebff' },
    dark: { stroke: '#74c0fc', fill: '#13324d' },
  },
  violet: {
    light: { stroke: '#6741d9', fill: '#e5dbff' },
    dark: { stroke: '#b197fc', fill: '#2c2352' },
  },
  pink: {
    light: { stroke: '#c2255c', fill: '#ffdeeb' },
    dark: { stroke: '#f783ac', fill: '#4a1c30' },
  },
  grey: {
    light: { stroke: '#495057', fill: '#e9ecef' },
    dark: { stroke: '#adb5bd', fill: '#2a2f35' },
  },
})

/** @typedef {keyof typeof COLORS} ColorName */

/** In the order the swatches show. */
export const COLOR_NAMES = /** @type {ColorName[]} */ (Object.keys(COLORS))

/** @param {unknown} name */
export const isColor = (name) =>
  typeof name === 'string' && Object.prototype.hasOwnProperty.call(COLORS, name)

/**
 * A node's colour, when it has a known one.
 * @param {{ data?: { color?: string } } | null | undefined} node
 * @returns {ColorName | ''}
 */
export const colorOf = (node) =>
  isColor(node?.data?.color) ? /** @type {ColorName} */ (node?.data?.color) : ''

/**
 * @param {string} name
 * @param {'light' | 'dark'} [theme]
 * @returns {Paint | null}
 */
export function paintOf(name, theme = 'light') {
  return isColor(name) ? COLORS[/** @type {ColorName} */ (name)][theme] : null
}

/**
 * The named colour closest to any CSS hex, for a diagram made elsewhere. Black,
 * white and transparent are no colour: the default look already draws them.
 *
 * @param {string | undefined} hex
 * @returns {ColorName | ''}
 */
export function nearestColor(hex) {
  const rgb = parseHex(hex)
  if (!rgb) return ''
  const [r, g, b] = rgb
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  // Near black, near white, or plain grey: the default, unless clearly mid grey.
  if (max - min < 24) return max > 60 && max < 200 ? 'grey' : ''

  let best = /** @type {ColorName | ''} */ ('')
  let distance = Infinity
  for (const name of COLOR_NAMES) {
    if (name === 'grey') continue
    for (const paint of [COLORS[name].light.stroke, COLORS[name].light.fill]) {
      const [pr, pg, pb] = /** @type {number[]} */ (parseHex(paint))
      const next = hueDistance([r, g, b], [pr, pg, pb])
      if (next < distance) {
        distance = next
        best = name
      }
    }
  }
  return best
}

/**
 * Shapes coloured, or their colour cleared with an empty name, in one change.
 *
 * @param {import('./types.js').FlowDocument} document
 * @param {string[]} ids
 * @param {string} color a ColorName, or '' for the default look
 * @returns {import('./types.js').FlowDocument}
 */
export function withColor(document, ids, color) {
  const chosen = new Set(ids)
  return {
    ...document,
    nodes: document.nodes.map((node) => {
      if (!chosen.has(toNodeId(node.id))) return node
      const data = { ...node.data }
      delete data.color
      return { ...node, data: isColor(color) ? { ...data, color } : data }
    }),
  }
}

/**
 * @param {string | undefined} hex
 * @returns {number[] | null}
 */
function parseHex(hex) {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex ?? '').trim())
  if (!match) return null
  const digits =
    match[1].length === 3
      ? match[1]
          .split('')
          .map((digit) => digit + digit)
          .join('')
      : match[1]
  return [0, 2, 4].map((at) => parseInt(digits.slice(at, at + 2), 16))
}

/**
 * Compared by hue first, since a tint and its stroke share one: a pale blue is
 * still blue.
 * @param {number[]} a
 * @param {number[]} b
 */
function hueDistance(a, b) {
  const [ha, sa] = hsl(a)
  const [hb, sb] = hsl(b)
  const turn = Math.min(Math.abs(ha - hb), 360 - Math.abs(ha - hb))
  return turn + Math.abs(sa - sb) * 20
}

/**
 * Hue in degrees and saturation from 0 to 1.
 * @param {number[]} rgb
 */
function hsl([r, g, b]) {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255]
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  const light = (max + min) / 2
  const saturation = delta ? delta / (1 - Math.abs(2 * light - 1)) : 0
  let hue = 0
  if (delta) {
    if (max === rn) hue = ((gn - bn) / delta) % 6
    else if (max === gn) hue = (bn - rn) / delta + 2
    else hue = (rn - gn) / delta + 4
  }
  return [(hue * 60 + 360) % 360, saturation]
}
