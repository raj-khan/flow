import { describe, expect, it } from 'vitest'

import { recognise, resample } from '../recognize.js'

/** A seeded wobble, so every run draws the same hand. */
function hand(seed = 1) {
  let state = seed
  return (amount) => {
    state = (state * 16807) % 2147483647
    return ((state / 2147483647) * 2 - 1) * amount
  }
}

/** Points along a polyline, every few pixels, wobbling like a hand. */
function draw(corners, { wobble = 2, seed = 1, step = 4 } = {}) {
  const jitter = hand(seed)
  const points = []
  for (let index = 1; index < corners.length; index += 1) {
    const [a, b] = [corners[index - 1], corners[index]]
    const steps = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / step))
    for (let at = 0; at < steps; at += 1) {
      const t = at / steps
      points.push({
        x: a.x + (b.x - a.x) * t + jitter(wobble),
        y: a.y + (b.y - a.y) * t + jitter(wobble),
      })
    }
  }
  points.push(corners.at(-1))
  return points
}

function ellipse(cx, cy, rx, ry, { turns = 1.05, wobble = 2, seed = 3, start = -2 } = {}) {
  const jitter = hand(seed)
  const points = []
  for (let index = 0; index <= 90 * turns; index += 1) {
    const angle = start + (index / 90) * Math.PI * 2
    points.push({
      x: cx + Math.cos(angle) * (rx + jitter(wobble)),
      y: cy + Math.sin(angle) * (ry + jitter(wobble)),
    })
  }
  return points
}

const P = (x, y) => ({ x, y })

describe('recognise', () => {
  it('sees a rectangle, drawn loosely and a little open or overshot', () => {
    const open = draw([P(12, 10), P(210, 14), P(206, 120), P(8, 116), P(10, 24)])
    expect(recognise(open)).toEqual({
      kind: 'rectangle',
      box: expect.objectContaining({ width: expect.any(Number) }),
    })
    const box = recognise(open).box
    expect(Math.abs(box.x - 8)).toBeLessThan(6)
    expect(Math.abs(box.width - 202)).toBeLessThan(10)

    const overshot = draw([P(0, 0), P(160, 0), P(160, 160), P(0, 160), P(0, -8), P(20, -6)], {
      seed: 7,
    })
    expect(recognise(overshot)?.kind).toBe('rectangle')
  })

  it('sees an ellipse and a circle', () => {
    expect(recognise(ellipse(100, 60, 90, 45))?.kind).toBe('ellipse')
    expect(recognise(ellipse(50, 50, 40, 40, { turns: 0.95, seed: 9 }))?.kind).toBe('ellipse')
  })

  it('sees a diamond', () => {
    const diamond = draw([P(100, 0), P(200, 70), P(100, 140), P(0, 70), P(96, 4)], { seed: 5 })
    expect(recognise(diamond)?.kind).toBe('diamond')
  })

  it('sees a straight line, in the direction drawn', () => {
    const line = recognise(draw([P(200, 100), P(20, 40)], { seed: 11 }))
    expect(line?.kind).toBe('line')
    expect(line.from.x).toBeGreaterThan(line.to.x)
  })

  it('sees an arrow drawn in one stroke, with its head at either end or both', () => {
    // Shaft, then one barb out and back through the tip to the other, as in >.
    const arrow = draw([P(0, 50), P(200, 50), P(176, 34), P(200, 50), P(176, 66)])
    expect(recognise(arrow)).toMatchObject({ kind: 'arrow', both: false })
    expect(recognise(arrow).to.x).toBeGreaterThan(190)

    // A head drawn first, then the shaft away from it: it points at the start.
    const backwards = draw([P(24, 34), P(0, 50), P(200, 50)], { seed: 4 })
    const back = recognise(backwards)
    expect(back).toMatchObject({ kind: 'arrow', both: false })
    expect(back.to.x).toBeLessThan(10)

    const both = draw([P(24, 34), P(0, 50), P(200, 50), P(176, 66)], { seed: 6 })
    expect(recognise(both)).toMatchObject({ kind: 'arrow', both: true })

    const vertical = draw([P(50, 0), P(50, 180), P(36, 158)], { seed: 8 })
    const down = recognise(vertical)
    expect(down?.kind).toBe('arrow')
    expect(Math.abs(down.to.x - 50)).toBeLessThan(4)
    expect(down.to.y).toBeGreaterThan(170)
  })

  it('leaves scribbles, curves, handwriting and ticks as they were drawn', () => {
    const wave = Array.from({ length: 13 }, (_, step) => P(step * 12, Math.sin(step / 2) * 30))
    expect(recognise(wave)).toBeNull()
    expect(recognise(ellipse(100, 60, 90, 45, { turns: 0.55 }))).toBeNull()
    const zigzag = draw([P(0, 0), P(40, 60), P(80, 0), P(120, 60), P(160, 0)])
    expect(recognise(zigzag)).toBeNull()
    expect(recognise(ellipse(10, 10, 8, 8))).toBeNull()
    expect(recognise(draw([P(0, 0), P(20, 4)]))).toBeNull()
    const spiral = Array.from({ length: 120 }, (_, i) =>
      P(100 + Math.cos(i / 8) * i, 100 + Math.sin(i / 8) * i),
    )
    expect(recognise(spiral)).toBeNull()
  })
})

describe('resample', () => {
  it('spaces points evenly along the stroke', () => {
    const points = resample([P(0, 0), P(90, 0), P(90, 90)], 7)
    expect(points).toHaveLength(7)
    expect(points[3]).toEqual(P(90, 0))
    expect(points.at(-1)).toEqual(P(90, 90))
  })
})
