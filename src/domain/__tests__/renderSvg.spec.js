import { describe, expect, it } from 'vitest'

import { sampleById } from '../samples.js'
import { renderSvg, SVG_THEMES, wrap } from '../renderSvg.js'

const architecture = sampleById('architecture').document
const support = sampleById('support').document

describe('renderSvg', () => {
  it('draws one outline per shape and one line per edge, with each label', () => {
    const svg = renderSvg(architecture)

    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
    expect(svg.match(/<g transform=/g)).toHaveLength(architecture.nodes.length)
    expect(svg.match(/marker-end="url\(#arrow\)"/g)).toHaveLength(architecture.edges.length)
    ;['HTTPS', 'SQL', 'enqueue', 'PostgreSQL', 'Job queue'].forEach((text) =>
      expect(svg).toContain(`>${text}<`),
    )
  })

  it('frames the diagram with padding, including nodes the layout placed', () => {
    // The support flow stores no positions at all, so all of them come from the layout.
    const svg = renderSvg(support, { padding: 10 })
    const [x, y, width, height] = /viewBox="([^"]+)"/.exec(svg)[1].split(' ').map(Number)

    expect(x).toBe(-10)
    expect(y).toBe(-10)
    expect(width).toBeGreaterThan(232)
    expect(height).toBeGreaterThan(104 * 3)
  })

  it('uses the dark palette when asked', () => {
    const svg = renderSvg(support, { theme: 'dark' })
    expect(svg).toContain(`fill="${SVG_THEMES.dark.canvas}"`)
    expect(svg).not.toContain(SVG_THEMES.light.accents.trigger)
  })

  it('escapes names, descriptions and labels', () => {
    const svg = renderSvg({
      version: 3,
      title: 'A & B',
      nodes: [
        { id: 'a', type: 'process', name: '<script>', data: { description: 'x "y" & z' } },
        { id: 'b', type: 'table', name: 'orders', data: { description: 'id PK' } },
      ],
      edges: [{ id: 'e-a-b', source: 'a', target: 'b', label: "it's > 1" }],
    })

    expect(svg).not.toContain('<script>')
    expect(svg).toContain('&lt;script&gt;')
    expect(svg).toContain('x &quot;y&quot; &amp; z')
    expect(svg).toContain('it&apos;s &gt; 1')
    expect(svg).toContain('<title>A &amp; B</title>')
  })

  it('draws an empty diagram as an empty frame', () => {
    expect(renderSvg({ version: 3, title: '', nodes: [], edges: [] })).toContain(
      'viewBox="-32 -32 64 64"',
    )
  })
})

describe('wrap', () => {
  it('breaks on words, and ends a cut line with an ellipsis', () => {
    expect(wrap('one two three', 1000, 10, 2)).toEqual(['one two three'])
    expect(wrap('alpha beta gamma delta', 60, 10, 2)).toEqual(['alpha beta', 'gamma…'])
    expect(wrap('', 100, 10, 2)).toEqual([])
  })
})

describe('sizes', () => {
  it('draws a sketch by hand, in handwriting, with the font embedded when given', () => {
    const sketch = { ...architecture, style: 'sketch' }
    const plain = renderSvg(sketch)
    const embedded = renderSvg(sketch, { sketchFont: 'data:font/woff2;base64,AAAA' })

    expect(plain).toMatch(/font-family="[^"]*Patrick Hand/)
    expect(plain).toContain('<style>text{font-weight:400}')
    expect(plain).not.toContain('@font-face')
    expect(embedded).toContain(
      "@font-face{font-family:'Patrick Hand';src:url(data:font/woff2;base64,AAAA)",
    )
    // Each shape keeps its clean fill under a hand-drawn stroke.
    expect(plain.match(/stroke="none"\/>/g)).toHaveLength(architecture.nodes.length)
    expect(renderSvg(sketch)).toBe(plain)
    expect(renderSvg(architecture)).not.toContain('<style>')
  })

  it('draws dashed and two-way connections, along curved lines when asked', () => {
    const svg = renderSvg({
      version: 3,
      title: 'T',
      lines: 'curved',
      nodes: [
        { id: 'a', type: 'process', name: 'A', data: {}, position: { x: 0, y: 0 } },
        { id: 'b', type: 'process', name: 'B', data: {}, position: { x: 0, y: 200 } },
      ],
      edges: [{ id: 'e-a-b', source: 'a', target: 'b', dashed: true, both: true }],
    })

    expect(svg).toMatch(/<path d="M[\d.]+,[\d.]+ C[^"]+" fill="none"[^>]*stroke-dasharray="6 4"/)
    expect(svg).toContain('marker-start="url(#arrow)" marker-end="url(#arrow)"')
  })

  it('adds a linked Made with isketch mark only when asked', () => {
    const document = sampleById('support').document
    expect(renderSvg(document)).not.toContain('Made with isketch')
    expect(renderSvg(document, { credit: true })).toMatch(
      /<a href="https:\/\/isketch\.online"><text [^>]*text-anchor="end">Made with isketch<\/text><\/a>\n<\/svg>/,
    )
  })

  it('draws a pen stroke as a line, with no outline or text', () => {
    const svg = renderSvg({
      version: 3,
      title: 'T',
      nodes: [
        {
          id: 'ink-1',
          type: 'ink',
          name: '',
          data: { points: '0,0 100,100' },
          position: { x: 0, y: 0 },
          size: { width: 100, height: 40 },
        },
      ],
      edges: [],
    })

    expect(svg).toContain('<path d="M0,0 L100,40" fill="none"')
    expect(svg).not.toContain('<text x=')
  })

  it('fills a stylus stroke, whose width follows the pressure', () => {
    const svg = renderSvg({
      version: 3,
      title: 'T',
      nodes: [
        {
          id: 'ink-1',
          type: 'ink',
          name: '',
          data: { points: '0,0,0.2 50,60,0.9 100,100,0.4' },
          position: { x: 0, y: 0 },
          size: { width: 100, height: 40 },
        },
      ],
      edges: [],
    })

    expect(svg).toMatch(/<path d="M[^"]+ Z" fill="#14181f"\/>/)
  })

  it('draws a resized node at its size, and frames it', () => {
    const svg = renderSvg(
      {
        version: 3,
        title: 'Big',
        nodes: [
          {
            id: 'a',
            type: 'process',
            name: 'A',
            data: {},
            position: { x: 0, y: 0 },
            size: { width: 500, height: 300 },
          },
        ],
        edges: [],
      },
      { padding: 0 },
    )
    expect(svg).toContain('viewBox="0 0 500 300"')
  })
})
