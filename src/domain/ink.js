import { getStroke } from 'perfect-freehand'

/**
 * Pen strokes: marks drawn by hand over the diagram. A stroke is stored as
 * points from 0 to 100 across its own box, so it moves and resizes like any
 * shape, and is drawn by scaling them to whatever size the box has. A stylus
 * adds its pressure to each point (`x,y,p`), and the line swells with it.
 */

/** The box's padding around a stroke, so its line is never clipped. */
const PAD = 6
/** How far a point may stray from the line before it is kept, in pixels. */
const TOLERANCE = 1.5

/**
 * @typedef {{ x: number, y: number, p?: number }} Point
 */

/**
 * A stroke drawn on the canvas, in diagram coordinates, as a shape's box and
 * its points. Null for a tap, which draws nothing.
 *
 * @param {Point[]} drawn
 * @returns {{ position: Point, size: { width: number, height: number }, points: string } | null}
 */
export function strokeToInk(drawn) {
  const points = simplify(drawn, TOLERANCE)
  if (points.length < 2) return null

  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const left = Math.min(...xs) - PAD
  const top = Math.min(...ys) - PAD
  const width = Math.max(...xs) - left + PAD
  const height = Math.max(...ys) - top + PAD
  if (width <= 2 * PAD + 2 && height <= 2 * PAD + 2) return null

  const pressed = points.some((point) => point.p !== undefined && point.p > 0)
  const scaled = points
    .map(({ x, y, p }) => {
      const at = `${tenth(((x - left) / width) * 100)},${tenth(((y - top) / height) * 100)}`
      return pressed ? `${at},${hundredth(p ?? 0.5)}` : at
    })
    .join(' ')
  return {
    position: { x: Math.round(left), y: Math.round(top) },
    size: { width: Math.round(width), height: Math.round(height) },
    points: scaled,
  }
}

/**
 * @param {string | undefined} points
 * @param {number} width
 * @param {number} height
 * @returns {{ x: number, y: number, p?: number }[]}
 */
function scale(points, width, height) {
  return String(points ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((triple) => triple.split(',').map(Number))
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
    .map(([x, y, p]) => ({
      x: tenth((x / 100) * width),
      y: tenth((y / 100) * height),
      ...(Number.isFinite(p) ? { p } : {}),
    }))
}

/**
 * A stroke drawn with a stylus, as the outline of a line that swells and thins
 * with the pressure, to be filled. Empty for a stroke without pressure, which
 * inkPath draws instead.
 *
 * @param {string | undefined} points
 * @param {number} width
 * @param {number} height
 * @returns {string}
 */
export function inkOutline(points, width, height) {
  const at = scale(points, width, height)
  if (at.length < 2 || !at.every((point) => point.p !== undefined)) return ''
  const outline = getStroke(
    at.map(({ x, y, p }) => [x, y, p ?? 0.5]),
    { size: 5, thinning: 0.6, smoothing: 0.5, streamline: 0.3, simulatePressure: false },
  )
  if (outline.length < 3) return ''
  const [first, ...rest] = outline
  return `M${tenth(first[0])},${tenth(first[1])} ${rest.map(([x, y]) => `L${tenth(x)},${tenth(y)}`).join(' ')} Z`
}

/**
 * Path data for a stroke in a `width` by `height` box, smoothed through the
 * midpoints so a few points still read as a hand-drawn curve.
 *
 * @param {string | undefined} points
 * @param {number} width
 * @param {number} height
 * @returns {string}
 */
export function inkPath(points, width, height) {
  const at = scale(points, width, height)
  if (at.length < 2) return ''
  if (at.length === 2) return `M${at[0].x},${at[0].y} L${at[1].x},${at[1].y}`

  const parts = [`M${at[0].x},${at[0].y}`]
  for (let index = 1; index < at.length - 1; index += 1) {
    const mid = {
      x: tenth((at[index].x + at[index + 1].x) / 2),
      y: tenth((at[index].y + at[index + 1].y) / 2),
    }
    parts.push(`Q${at[index].x},${at[index].y} ${mid.x},${mid.y}`)
  }
  const last = at[at.length - 1]
  parts.push(`L${last.x},${last.y}`)
  return parts.join(' ')
}

/**
 * Ramer-Douglas-Peucker: the fewest points that keep the stroke's shape.
 * @param {Point[]} points
 * @param {number} tolerance
 * @returns {Point[]}
 */
export function simplify(points, tolerance) {
  if (points.length < 3) return [...points]
  const first = points[0]
  const last = points[points.length - 1]
  let furthest = 0
  let index = 0
  for (let at = 1; at < points.length - 1; at += 1) {
    const distance = fromLine(points[at], first, last)
    if (distance > furthest) {
      furthest = distance
      index = at
    }
  }
  if (furthest <= tolerance) return [first, last]
  return [
    ...simplify(points.slice(0, index + 1), tolerance).slice(0, -1),
    ...simplify(points.slice(index), tolerance),
  ]
}

/**
 * @param {Point} point
 * @param {Point} a
 * @param {Point} b
 */
function fromLine(point, a, b) {
  const length = Math.hypot(b.x - a.x, b.y - a.y)
  if (!length) return Math.hypot(point.x - a.x, point.y - a.y)
  return Math.abs((b.x - a.x) * (a.y - point.y) - (a.x - point.x) * (b.y - a.y)) / length
}

/** @param {number} value */
const tenth = (value) => Math.round(value * 10) / 10

/** @param {number} value */
const hundredth = (value) => Math.round(Math.min(Math.max(value, 0), 1) * 100) / 100
