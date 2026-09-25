import { describe, expect, it } from 'vitest'

import { TOOL, TOOLS, toolForKey } from '../tools.js'

describe('tools', () => {
  it('numbers the tool bar 1 to 7, in order', () => {
    expect(TOOLS.map((tool) => tool.keys[0])).toEqual(['1', '2', '3', '4', '5', '6', '7'])
  })

  it('picks a tool by number or letter, in either case', () => {
    expect(toolForKey('1')).toBe(TOOL.SELECT)
    expect(toolForKey('h')).toBe(TOOL.HAND)
    expect(toolForKey('P')).toBe(TOOL.PEN)
    expect(toolForKey('7')).toBe(TOOL.ERASER)
  })

  it('ignores keys that are not a tool', () => {
    expect(toolForKey('x')).toBeNull()
    expect(toolForKey('8')).toBeNull()
    expect(toolForKey('Enter')).toBeNull()
  })
})
