import { describe, expect, it } from 'vitest'

import { sizeOf } from '../constants.js'
import { frameMembers } from '../frames.js'
import { combineSources, importSources, pickSources } from '../scan.js'
import { REPO } from '@/tests/fixtures/repo.js'

const paths = Object.keys(REPO)
const peek = (path) => REPO[path] ?? ''

describe('pickSources', () => {
  it('finds compose, OpenAPI, Prisma, Drizzle and SQL, and nothing in dependencies or builds', () => {
    expect(pickSources(paths, peek)).toEqual([
      { format: 'compose', label: 'Services', paths: ['docker-compose.yml'] },
      { format: 'openapi', label: 'API', paths: ['api/openapi.yaml'] },
      { format: 'prisma', label: 'Database', paths: ['prisma/schema.prisma'] },
      { format: 'drizzle', label: 'Database', paths: ['src/db/schema.ts'] },
      {
        format: 'sql',
        label: 'Database',
        paths: ['db/migrations/001_users.sql', 'db/migrations/002_orders.sql'],
      },
    ])
  })
})

describe('combineSources', async () => {
  const { parts, warnings } = await importSources(
    pickSources(paths, peek),
    async (path) => REPO[path],
  )
  const document = combineSources(parts, 'shop architecture')
  const frames = document.nodes.filter((node) => node.type === 'frame')

  it('frames each source, named after it, side by side without overlapping', () => {
    expect(warnings).toEqual([])
    expect(frames.map((frame) => frame.name)).toEqual([
      'Services: docker-compose.yml',
      'API: api/openapi.yaml',
      'Database: prisma/schema.prisma',
      'Database: src/db/schema.ts',
      'Database: 2 SQL files',
    ])
    frames.slice(1).forEach((frame, index) => {
      const before = frames[index]
      expect(frame.position.x).toBeGreaterThan(before.position.x + sizeOf(before).width)
    })
  })

  it('puts every shape inside its own frame, laid out, with ids renamed only where two collide', () => {
    const members = frameMembers(document)
    const inside = [...members.values()].flat()
    expect(inside.length).toBe(document.nodes.length - frames.length)
    expect(members.get('sql-frame')).toEqual(['table-users', 'table-orders'])
    expect(members.get('compose-frame')).toEqual(['api', 'db'])
    // The Prisma model called Account keeps its id; nothing else is called that.
    expect(document.nodes.some((node) => node.id === 'Account')).toBe(true)
    expect(new Set(document.nodes.map((node) => node.id)).size).toBe(document.nodes.length)
    expect(document.edges).toContainEqual(
      expect.objectContaining({
        source: 'table-orders',
        target: 'table-users',
        label: 'user_id',
      }),
    )
  })

  it('renames a clashing id after its source, keeping its connections', () => {
    const twice = combineSources([parts[0], parts[0]], 'twice')
    const ids = twice.nodes.map((node) => node.id)
    expect(ids).toContain('compose-api')
    expect(twice.edges).toContainEqual(
      expect.objectContaining({ source: 'compose-api', target: 'compose-db' }),
    )
  })
})
