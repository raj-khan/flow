import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'

import diagram from '@/tests/fixtures/diagram.json'
import { SHAPE } from '@/domain/constants.js'
import { normaliseNode } from '@/domain/graph.js'
import FlowNodeCard from '../FlowNodeCard.vue'

const nodes = Object.fromEntries(diagram.nodes.map((raw) => [String(raw.id), normaliseNode(raw)]))

/** Handle needs Vue Flow's injected store, which a unit test has no business providing. */
const global = { stubs: { Handle: true } }

const render = (node, props = {}) =>
  mount(FlowNodeCard, {
    props: { id: node.id, data: { node }, ...props },
    global: { ...global, plugins: [createPinia()] },
  })

describe('FlowNodeCard', () => {
  it('shows the title and a truncated description', () => {
    expect(render(nodes['d09c08']).text()).toContain('09:00 - 17:00 - UTC')

    const described = { ...nodes['e879e4'], data: { description: 'x'.repeat(200) } }
    const text = render(described).text()
    expect(text).toContain('...')
    expect(text.length).toBeLessThan(200)
  })

  it('draws the outline of its own shape, and none for text', () => {
    const decision = render(nodes['d09c08'])
    expect(decision.attributes('data-shape')).toBe(SHAPE.DECISION)
    expect(decision.find('path').attributes('d')).toMatch(/^M/)

    const text = render({ ...nodes['d09c08'], type: SHAPE.TEXT })
    expect(text.find('svg').exists()).toBe(false)
  })

  it('thickens the outline when selected, since a ring would be a rectangle', () => {
    const plain = render(nodes['b6a0c1'])
    const selected = render(nodes['b6a0c1'], { selected: true })

    expect(Number(selected.find('path').attributes('stroke-width'))).toBeGreaterThan(
      Number(plain.find('path').attributes('stroke-width')),
    )
  })
})
