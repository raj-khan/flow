/**
 * What a pen stroke was meant to be: a box, an ellipse, a diamond, a line or an
 * arrow, or nothing but a stroke. Read by geometry alone, with no model: the
 * stroke is resampled evenly, then a closed one is measured against each
 * outline in its own box, and an open one for how straight it runs and
 * whether it ends in a head. The same measures sketch recognisers such as
 * PaleoSketch and Xournal++'s build on, written here from scratch.
 *
 * @typedef {{ x: number, y: number }} Point
 * @typedef {{ x: number, y: number, width: number, height: number }} Box
 * @typedef {{ kind: 'rectangle' | 'ellipse' | 'diamond', box: Box }} ClosedShape
 * @typedef {{ kind: 'line' | 'arrow', from: Point, to: Point, both: boolean }} OpenShape
 * @typedef {ClosedShape | OpenShape} Recognised
 */

/** Points the stroke is resampled to, evenly along its length. */
const SAMPLES = 64
/** Smaller than this, a closed stroke is a letter or a dot, not a shape. */
const MIN_SIDE = 24
/** Shorter than this, a line is a tick or a dash. */
const MIN_LENGTH = 40
/** How far, as a share of the box, an outline may stray from the ideal one. */
const CLOSED_TOLERANCE = 0.13
/** The ideal outline must fit this much better than the next, or it is not clear which was meant. */
const CLOSED_MARGIN = 0.75
/** How far a straight line may bow from its chord, as a share of the chord. */
const STRAIGHT = 0.08
/** A head's barbs are short beside the shaft, and point back along it. */
const BARB_MAX = 0.45
const BARB_MIN = 0.06
const BARB_ANGLE = (65 * Math.PI) / 180

/**
 * @param {Point[]} drawn in diagram coordinates, in the order drawn
 * @returns {Recognised | null}
 */
export function recognise(drawn) {
  const points = drawn.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
  if (points.length < 3) return null
  const length = pathLength(points)
  if (length < MIN_LENGTH) return null

  const box = boxOf(points)
  const diagonal = Math.hypot(box.width, box.height)
  const gap = distance(points[0], points[points.length - 1])
  const closed = gap < Math.max(18, diagonal * 0.22) && length > diagonal * 1.8

  return closed ? closedShape(resample(points, SAMPLES), box) : openShape(points, length)
}

/**
 * @param {Point[]} points evenly spaced
 * @param {Box} box
 * @returns {ClosedShape | null}
 */
function closedShape(points, box) {
  if (Math.min(box.width, box.height) < MIN_SIDE) return null
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  const at = points.map(({ x, y }) => ({
    u: (x - cx) / (box.width / 2),
    v: (y - cy) / (box.height / 2),
  }))

  // It must go all the way round: a C or a U is closed in its box, but not a shape.
  if (turned(at) < Math.PI * 1.7) return null

  const errors = /** @type {[ClosedShape['kind'], number][]} */ ([
    ['rectangle', mean(at.map(({ u, v }) => Math.abs(Math.max(Math.abs(u), Math.abs(v)) - 1)))],
    ['ellipse', mean(at.map(({ u, v }) => Math.abs(Math.hypot(u, v) - 1)))],
    ['diamond', mean(at.map(({ u, v }) => Math.abs(Math.abs(u) + Math.abs(v) - 1)))],
  ]).sort((a, b) => a[1] - b[1])

  const [[kind, best], [, next]] = errors
  if (best > CLOSED_TOLERANCE || best > next * CLOSED_MARGIN) return null
  return {
    kind,
    box: {
      x: Math.round(box.x),
      y: Math.round(box.y),
      width: Math.round(box.width),
      height: Math.round(box.height),
    },
  }
}

/**
 * The angle swept round the centre, in radians, however many times.
 * @param {{ u: number, v: number }[]} at
 */
function turned(at) {
  let total = 0
  for (let index = 1; index < at.length; index += 1) {
    let step = Math.atan2(at[index].v, at[index].u) - Math.atan2(at[index - 1].v, at[index - 1].u)
    if (step > Math.PI) step -= 2 * Math.PI
    if (step < -Math.PI) step += 2 * Math.PI
    total += step
  }
  return Math.abs(total)
}

/**
 * A straight run, with or without a head at either end.
 * @param {Point[]} points
 * @param {number} length
 * @returns {OpenShape | null}
 */
function openShape(points, length) {
  const first = points[0]
  const last = points[points.length - 1]
  if (isStraight(points, first, last)) {
    return { kind: 'line', from: round(first), to: round(last), both: false }
  }

  // The shaft is the longest run of the stroke, simplified to its corners.
  const corners = simplify(points, Math.max(4, length * 0.04))
  let shaft = 0
  for (let index = 1; index < corners.length - 1; index += 1) {
    if (
      distance(corners[index], corners[index + 1]) > distance(corners[shaft], corners[shaft + 1])
    ) {
      shaft = index
    }
  }
  const start = corners[shaft]
  const tip = corners[shaft + 1]
  const shaftLength = distance(start, tip)
  if (shaftLength < MIN_LENGTH || shaftLength < length * 0.45) return null
  // The shaft itself must be straight, not a curve the simplification cut short.
  const run = points.slice(points.indexOf(start), points.indexOf(tip) + 1)
  if (!isStraight(run, start, tip)) return null

  const after = corners.slice(shaft + 1)
  const before = corners.slice(0, shaft + 1).reverse()
  const forward = { x: tip.x - start.x, y: tip.y - start.y }
  const backward = { x: -forward.x, y: -forward.y }
  const headAtEnd = isHead(after, backward, shaftLength)
  const headAtStart = isHead(before, forward, shaftLength)
  // Anything else drawn along with the shaft makes it a scribble.
  if ((after.length > 1 && !headAtEnd) || (before.length > 1 && !headAtStart)) return null

  if (headAtEnd || headAtStart) {
    const [from, to] = headAtEnd ? [start, tip] : [tip, start]
    return { kind: 'arrow', from: round(from), to: round(to), both: headAtEnd && headAtStart }
  }
  return { kind: 'line', from: round(start), to: round(tip), both: false }
}

/**
 * Whether every point lies near the chord from `a` to `b`: straight, however
 * shaky the hand.
 * @param {Point[]} points
 * @param {Point} a
 * @param {Point} b
 */
function isStraight(points, a, b) {
  const room = Math.max(6, distance(a, b) * STRAIGHT)
  return points.every((point) => fromSegment(point, a, b) <= room)
}

/**
 * A head drawn from the tip of a shaft: one or two short barbs, each running
 * back along the shaft, off to one side. `run` starts at the tip; a second barb
 * may be drawn back through it, as in `>`.
 *
 * @param {Point[]} run
 * @param {Point} back the direction back along the shaft
 * @param {number} shaftLength
 */
function isHead(run, back, shaftLength) {
  if (run.length < 2 || run.length > 4) return false
  const tip = run[0]
  // Each barb's end, measured from the tip: the far corners of the run.
  const barbs = run.slice(1).filter((point) => distance(point, tip) > shaftLength * BARB_MIN)
  if (!barbs.length) return false
  return barbs.every((point) => {
    const reach = distance(point, tip)
    if (reach > shaftLength * BARB_MAX) return false
    return angleBetween({ x: point.x - tip.x, y: point.y - tip.y }, back) < BARB_ANGLE
  })
}

/**
 * The same stroke as `count` points spaced evenly along it, so a slow part
 * of the stroke weighs no more than a fast one.
 * @param {Point[]} points
 * @param {number} count
 * @returns {Point[]}
 */
export function resample(points, count) {
  const step = pathLength(points) / (count - 1)
  if (!step) return [points[0]]
  /** @type {Point[]} */
  const out = [points[0]]
  let carried = 0
  let previous = points[0]
  for (let index = 1; index < points.length; index += 1) {
    let current = points[index]
    let span = distance(previous, current)
    while (carried + span >= step && out.length < count) {
      const t = (step - carried) / span
      const point = {
        x: previous.x + (current.x - previous.x) * t,
        y: previous.y + (current.y - previous.y) * t,
      }
      out.push(point)
      previous = point
      span = distance(previous, current)
      carried = 0
    }
    carried += span
    previous = current
  }
  while (out.length < count) out.push(points[points.length - 1])
  return out
}

/**
 * Ramer-Douglas-Peucker, keeping the very points given, so each can be found
 * again in the stroke.
 * @param {Point[]} points
 * @param {number} tolerance
 * @returns {Point[]}
 */
function simplify(points, tolerance) {
  if (points.length < 3) return [...points]
  const first = points[0]
  const last = points[points.length - 1]
  let furthest = 0
  let index = 0
  for (let at = 1; at < points.length - 1; at += 1) {
    const away = fromSegment(points[at], first, last)
    if (away > furthest) {
      furthest = away
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
function fromSegment(point, a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const squared = dx * dx + dy * dy
  if (!squared) return distance(point, a)
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / squared))
  return distance(point, { x: a.x + t * dx, y: a.y + t * dy })
}

/** @param {Point[]} points */
function pathLength(points) {
  let total = 0
  for (let index = 1; index < points.length; index += 1) {
    total += distance(points[index - 1], points[index])
  }
  return total
}

/** @param {Point[]} points @returns {Box} */
function boxOf(points) {
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

/** @param {Point} a @param {Point} b */
const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y)

/** @param {Point} a @param {Point} b */
function angleBetween(a, b) {
  const lengths = Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y)
  if (!lengths) return Math.PI
  return Math.acos(Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y) / lengths)))
}

/** @param {number[]} values */
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length

/** @param {Point} point */
const round = ({ x, y }) => ({ x: Math.round(x), y: Math.round(y) })
