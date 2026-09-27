import { describe, expect, it } from 'vitest'

import { inkOutline, inkPath, simplify, strokeToInk } from '../ink.js'

describe('strokeToInk', () => {
  it('boxes a stroke with room for its line, and keeps its points across the box', () => {
    const ink = strokeToInk([
      { x: 100, y: 100 },
      { x: 150, y: 120 },
      { x: 200, y: 100 },
    ])

    expect(ink.position).toEqual({ x: 94, y: 94 })
    expect(ink.size).toEqual({ width: 112, height: 32 })
    const points = ink.points.split(' ').map((pair) => pair.split(',').map(Number))
    points.flat().forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(100)
    })
    expect(points).toHaveLength(3)
  })

  it('draws nothing for a tap', () => {
    expect(strokeToInk([{ x: 5, y: 5 }])).toBeNull()
    expect(
      strokeToInk([
        { x: 5, y: 5 },
        { x: 6, y: 6 },
      ]),
    ).toBeNull()
  })
})

describe('simplify', () => {
  it('drops points that lie on the line, and keeps the corners', () => {
    const line = Array.from({ length: 20 }, (_, index) => ({ x: index, y: index }))
    expect(simplify(line, 1)).toEqual([line[0], line[19]])

    const corner = [...line.slice(0, 10), { x: 9, y: 30 }]
    expect(simplify(corner, 1)).toHaveLength(3)
  })
})

describe('inkPath', () => {
  it('scales points to the box, smoothing through their midpoints', () => {
    expect(inkPath('0,0 100,100', 200, 50)).toBe('M0,0 L200,50')
    expect(inkPath('0,0 50,100 100,0', 100, 100)).toBe('M0,0 Q50,100 75,50 L100,0')
    expect(inkPath('', 10, 10)).toBe('')
    expect(inkPath('nonsense', 10, 10)).toBe('')
  })
})

describe('stylus pressure', () => {
  const pressed = [
    { x: 0, y: 0, p: 0.2 },
    { x: 50, y: 20, p: 0.9 },
    { x: 100, y: 0, p: 0.4 },
  ]

  it('keeps each point’s pressure, as x,y,p', () => {
    const ink = strokeToInk(pressed)
    expect(ink.points.split(' ').every((point) => point.split(',').length === 3)).toBe(true)
    expect(ink.points).toMatch(/,0\.9\b/)
  })

  it('leaves a stroke without pressure as x,y pairs', () => {
    const ink = strokeToInk(pressed.map(({ x, y }) => ({ x, y })))
    expect(ink.points.split(' ').every((point) => point.split(',').length === 2)).toBe(true)
  })

  it('draws pressure as a filled outline, and plain strokes as a line', () => {
    const ink = strokeToInk(pressed)
    expect(inkOutline(ink.points, ink.size.width, ink.size.height)).toMatch(/^M[\d.,-]+ L.* Z$/)
    const plain = strokeToInk(pressed.map(({ x, y }) => ({ x, y })))
    expect(inkOutline(plain.points, 100, 40)).toBe('')
    expect(inkPath(ink.points, ink.size.width, ink.size.height)).toMatch(/^M/)
  })
})
