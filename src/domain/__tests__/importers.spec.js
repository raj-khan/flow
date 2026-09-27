import { describe, expect, it } from 'vitest'

import { detectFormat } from '../importers.js'

const id = (name, text = '') => detectFormat(name, text)?.id ?? null

describe('detectFormat', () => {
  it('knows a format from its own extension', () => {
    expect(id('prisma/schema.prisma')).toBe('prisma')
    expect(id('db/migrations/001.sql')).toBe('sql')
    expect(id('architecture.drawio')).toBe('drawio')
    expect(id('sketch.excalidraw')).toBe('excalidraw')
    expect(id('flow.mmd')).toBe('mermaid')
    expect(id('src/db/schema.ts')).toBe('drizzle')
  })

  it('tells YAML and JSON apart by what is in them', () => {
    expect(id('docker-compose.yml', 'services:\n  api: {}')).toBe('compose')
    expect(id('openapi.yaml', 'openapi: 3.1.0\ninfo: {}')).toBe('openapi')
    expect(id('spec.json', '{\n  "openapi": "3.0.0"\n}')).toBe('openapi')
    expect(id('board.json', '{"type":"excalidraw","elements":[]}')).toBe('excalidraw')
    expect(id('package.json', '{"name":"x"}')).toBeNull()
  })

  it('has nothing to say about other files', () => {
    expect(id('notes.txt', 'hello')).toBeNull()
  })
})
