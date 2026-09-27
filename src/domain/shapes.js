import { SHAPE } from './constants.js'

/**
 * SVG path data for each shape's outline in a `width` by `height` box, inset by
 * `inset` so a stroke is not clipped at the edge. Pure, so the same outline can
 * be drawn on the canvas, in the palette and, later, by the SVG exporter.
 *
 * @param {string} shape
 * @param {number} width
 * @param {number} height
 * @param {number} [inset]
 * @returns {string}
 */
export function shapePath(shape, width, height, inset = 1) {
  const l = inset
  const t = inset
  const r = width - inset
  const b = height - inset
  const w = r - l
  const h = b - t
  const cx = l + w / 2
  const cy = t + h / 2

  switch (shape) {
    case SHAPE.TERMINAL: {
      const radius = h / 2
      return `M${l + radius},${t} H${r - radius} A${radius},${radius} 0 0 1 ${r - radius},${b} H${l + radius} A${radius},${radius} 0 0 1 ${l + radius},${t} Z`
    }
    case SHAPE.DECISION:
      return `M${cx},${t} L${r},${cy} L${cx},${b} L${l},${cy} Z`
    case SHAPE.DATA: {
      const slant = Math.min(w * 0.12, h * 0.5)
      return `M${l + slant},${t} H${r} L${r - slant},${b} H${l} Z`
    }
    case SHAPE.DATABASE: {
      const ry = Math.min(h * 0.12, 12)
      const rx = w / 2
      return `M${l},${t + ry} A${rx},${ry} 0 0 1 ${r},${t + ry} V${b - ry} A${rx},${ry} 0 0 1 ${l},${b - ry} Z M${l},${t + ry} A${rx},${ry} 0 0 0 ${r},${t + ry}`
    }
    case SHAPE.DOCUMENT: {
      const wave = Math.min(h * 0.12, 10)
      return `M${l},${t} H${r} V${b - wave} C${r - w / 4},${b - wave * 3} ${l + w / 4},${b + wave} ${l},${b - wave} Z`
    }
    case SHAPE.NOTE: {
      const fold = Math.min(w, h) * 0.18
      return `M${l},${t} H${r - fold} L${r},${t + fold} V${b} H${l} Z M${r - fold},${t} V${t + fold} H${r}`
    }
    case SHAPE.TABLE: {
      // A header band for the table's name, like an entity box.
      const band = t + Math.min(h * 0.32, 30)
      return `M${l},${t} H${r} V${b} H${l} Z M${l},${band} H${r}`
    }
    // Text has no outline, and a stroke draws itself from its own points.
    case SHAPE.TEXT:
    case SHAPE.INK:
      return ''
    case SHAPE.FRAME:
      return roundedRect(l, t, r, b, Math.min(12, h / 6))
    case SHAPE.SCREEN: {
      // A browser window: a title bar with three dots.
      const bar = t + Math.min(h * 0.2, 18)
      const dot = Math.min(2.5, (bar - t) / 5)
      const dots = [1, 2, 3]
        .map((n) => {
          const x = l + n * dot * 3.5
          const y = t + (bar - t) / 2
          return `M${x - dot},${y} A${dot},${dot} 0 1 0 ${x + dot},${y} A${dot},${dot} 0 1 0 ${x - dot},${y}`
        })
        .join(' ')
      return `M${l},${t} H${r} V${b} H${l} Z M${l},${bar} H${r} ${dots}`
    }
    case SHAPE.BUTTON: {
      const radius = Math.min(h / 2, 12)
      return roundedRect(l, t, r, b, radius)
    }
    case SHAPE.INPUT: {
      // A field with a caret at the start.
      const caret = l + Math.min(10, w * 0.08)
      return `M${l},${t} H${r} V${b} H${l} Z M${caret},${t + h * 0.3} V${b - h * 0.3}`
    }
    case SHAPE.CARD: {
      // Raised: a second edge along the bottom and right.
      const lift = Math.min(4, w * 0.04, h * 0.04)
      return `${roundedRect(l, t, r - lift, b - lift, Math.min(8, h / 4))} M${l + 6},${b} H${r - 6} Q${r},${b} ${r},${b - 6} V${t + 6}`
    }
    case SHAPE.LIST: {
      // Rows down the left, clear of the text.
      const rows = [0.3, 0.5, 0.7]
        .map((at) => `M${l + 8},${t + h * at} H${l + Math.min(w * 0.25, 40)}`)
        .join(' ')
      return `M${l},${t} H${r} V${b} H${l} Z ${rows}`
    }
    case SHAPE.IMAGE: {
      // A frame with hills along the bottom and a sun in the corner, clear of the text.
      const sun = Math.min(w, h) * 0.07
      const sx = r - sun * 3
      const sy = t + sun * 3
      const hill = (/** @type {number} */ at) => b - h * at
      return `M${l},${t} H${r} V${b} H${l} Z M${l},${hill(0.08)} L${l + w * 0.25},${hill(0.22)} L${l + w * 0.45},${hill(0.1)} L${l + w * 0.7},${hill(0.25)} L${r},${hill(0.06)} M${sx - sun},${sy} A${sun},${sun} 0 1 0 ${sx + sun},${sy} A${sun},${sun} 0 1 0 ${sx - sun},${sy}`
    }
    default:
      return roundedRect(l, t, r, b, Math.min(6, h / 4))
  }
}

/**
 * @param {number} l
 * @param {number} t
 * @param {number} r
 * @param {number} b
 * @param {number} radius
 */
const roundedRect = (l, t, r, b, radius) =>
  `M${l + radius},${t} H${r - radius} Q${r},${t} ${r},${t + radius} V${b - radius} Q${r},${b} ${r - radius},${b} H${l + radius} Q${l},${b} ${l},${b - radius} V${t + radius} Q${l},${t} ${l + radius},${t} Z`

/**
 * How far in from each side a shape's text must sit to stay inside the outline.
 * @param {string} shape
 * @param {number} width
 * @param {number} height
 * @returns {{ x: number, y: number }}
 */
export function textInset(shape, width, height) {
  switch (shape) {
    // Text in a diamond fits in the middle half.
    case SHAPE.DECISION:
      return { x: width / 4, y: height / 8 }
    case SHAPE.DATA:
      return { x: Math.min(width * 0.12, height * 0.5), y: 0 }
    case SHAPE.TERMINAL:
      return { x: height / 3, y: 0 }
    case SHAPE.DATABASE:
      return { x: 0, y: Math.min(height * 0.12, 12) }
    // Below the title bar.
    case SHAPE.SCREEN:
      return { x: 0, y: Math.min(height * 0.2, 18) / 2 }
    // Clear of the caret, the bullets and the sun.
    case SHAPE.INPUT:
      return { x: 16, y: 0 }
    case SHAPE.LIST:
      return { x: Math.min(width * 0.25, 40) + 4, y: 0 }
    default:
      return { x: 0, y: 0 }
  }
}
