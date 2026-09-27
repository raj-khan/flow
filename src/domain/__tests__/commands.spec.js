import { describe, expect, it } from 'vitest'

import { filterCommands } from '../commands.js'

const run = () => {}
const commands = [
  { id: 'export', label: 'Export', group: 'File', keywords: 'png svg download', run },
  { id: 'add-database', label: 'Add Database', group: 'Shapes', run },
  { id: 'tool-pen', label: 'Pen', group: 'Tools', run },
  { id: 'add-data', label: 'Add Input / output', group: 'Shapes', keywords: 'data', run },
]

describe('filterCommands', () => {
  it('lists everything for an empty search', () => {
    expect(filterCommands(commands, '  ')).toHaveLength(4)
  })

  it('matches every word against the label, group and keywords', () => {
    expect(filterCommands(commands, 'png').map((command) => command.id)).toEqual(['export'])
    expect(filterCommands(commands, 'shapes data').map((command) => command.id)).toEqual([
      'add-database',
      'add-data',
    ])
  })

  it('puts labels that begin with the search first', () => {
    expect(filterCommands(commands, 'pen').map((command) => command.id)).toEqual(['tool-pen'])
    expect(filterCommands(commands, 'add d')[0].id).toBe('add-database')
  })
})
