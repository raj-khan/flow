import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { COLORS, COLOR_NAMES, colorOf, nearestColor, paintOf, withColor } from '../colors.js'
import { fromExcalidraw, toExcalidraw } from '../excalidraw.js'
import { parseFlow, serialiseFlow } from '../flowText.js'
import { renderSvg } from '../renderSvg.js'

const DOC = {
  version: 3,
  title: 'Shop',
  nodes: [
    { id: 'api', type: 'process', name: 'API', data: {} },
    { id: 'db', type: 'database', name: 'Orders', data: { color: 'blue' } },
    { id: 'ink-1', type: 'ink', name: '', data: { points: '0,0 100,100', color: 'red' } },
  ],
  edges: [],
}

describe('colors', () => {
  it('knows a colour by name only', () => {
    expect(COLOR_NAMES).toEqual([
      'red',
      'orange',
      'yellow',
      'green',
      'teal',
      'blue',
      'violet',
      'pink',
      'grey',
    ])
    expect(colorOf({ data: { color: 'blue' } })).toBe('blue')
    expect(colorOf({ data: { color: '#123456' } })).toBe('')
    expect(paintOf('red', 'dark')).toEqual(COLORS.red.dark)
    expect(paintOf('nope')).toBeNull()
  })

  it('colours shapes, and clears them, in one change that keeps the rest', () => {
    const painted = withColor(DOC, ['api', 'db'], 'green')
    expect(painted.nodes.map(colorOf)).toEqual(['green', 'green', 'red'])
    const cleared = withColor(painted, ['db'], '')
    expect(cleared.nodes[1].data).toEqual({})
    expect(cleared.nodes[0].data).toEqual({ color: 'green' })
  })

  it('finds the nearest named colour, and leaves black and white alone', () => {
    expect(nearestColor('#1e1e1e')).toBe('')
    expect(nearestColor('#ffffff')).toBe('')
    expect(nearestColor('transparent')).toBe('')
    expect(nearestColor('#ffc9c9')).toBe('red')
    expect(nearestColor('#a5d8ff')).toBe('blue')
    expect(nearestColor('#b2f2bb')).toBe('green')
    expect(nearestColor('#ffec99')).toBe('yellow')
    expect(nearestColor('#868e96')).toBe('grey')
  })

  it('matches the canvas tokens in style.css', () => {
    const css = readFileSync('src/style.css', 'utf8')
    for (const [name, { light, dark }] of Object.entries(COLORS)) {
      expect(css).toContain(`--paint-${name}: ${light.stroke};`)
      expect(css).toContain(`--paint-${name}-soft: ${light.fill};`)
      expect(css.split(`--paint-${name}: ${dark.stroke};`)).toHaveLength(3)
      expect(css.split(`--paint-${name}-soft: ${dark.fill};`)).toHaveLength(3)
    }
  })
})

describe('colours in .flow', () => {
  it('writes a colour under its shape, and reads it back', () => {
    const text = serialiseFlow(DOC)
    expect(text).toContain('db = database "Orders"\ndb color: blue\n')
    expect(text).not.toContain('api color')
    expect(parseFlow(text).document.nodes.map(colorOf)).toEqual(['', 'blue', 'red'])
  })

  it('accepts the British spelling, and names the choices for an unknown colour', () => {
    expect(parseFlow('a = process "A"\na colour: pink').document.nodes[0].data.color).toBe('pink')
    const { errors } = parseFlow('a = process "A"\na color: mauve\nb color: red')
    expect(errors[0]).toEqual({
      line: 2,
      message: `Unknown color "mauve". Use one of: ${COLOR_NAMES.join(', ')}.`,
    })
    expect(errors[1]).toEqual({ line: 3, message: 'No node called "b".' })
  })
})

describe('colours drawn and carried', () => {
  it('draws a shape in its colour and tint, and a stroke in its colour', () => {
    const svg = renderSvg(DOC)
    expect(svg).toContain(`fill="${COLORS.blue.light.fill}" stroke="${COLORS.blue.light.stroke}"`)
    expect(svg).toContain(`stroke="${COLORS.red.light.stroke}" stroke-width="2.5"`)
    expect(renderSvg(DOC, { theme: 'dark' })).toContain(`stroke="${COLORS.blue.dark.stroke}"`)
  })

  it('round-trips through Excalidraw, and reads its own palette', () => {
    const scene = JSON.parse(toExcalidraw(DOC))
    const db = scene.elements.find((element) => element.id === 'db')
    expect(db.backgroundColor).toBe(COLORS.blue.light.fill)
    const back = fromExcalidraw(JSON.stringify(scene))
    expect(back.document.nodes.map(colorOf)).toEqual(['', 'blue', 'red'])
  })
})
