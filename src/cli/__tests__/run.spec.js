import { describe, expect, it } from 'vitest'

import { run, USAGE } from '../run.js'

/** An in-memory file system and captured output. */
function fakeIo(files = {}) {
  const written = {}
  const out = []
  const err = []
  return {
    written,
    out,
    err,
    io: {
      readFile: async (path) => {
        if (!(path in files)) throw new Error('ENOENT')
        return files[path]
      },
      writeFile: async (path, text) => {
        written[path] = text
      },
      stdout: (text) => out.push(text),
      stderr: (text) => err.push(text),
    },
  }
}

const GOOD = 'a = process "A"\nb = database "B"\na -> b : reads\n'

describe('isketch render', () => {
  it('writes SVG to a file, or to stdout', async () => {
    const toFile = fakeIo({ 'd.flow': GOOD })
    expect(await run(['render', 'd.flow', '-o', 'd.svg'], toFile.io)).toBe(0)
    expect(toFile.written['d.svg']).toMatch(/^<svg /)

    const toStdout = fakeIo({ 'd.flow': GOOD })
    expect(await run(['render', '--dark', 'd.flow'], toStdout.io)).toBe(0)
    expect(toStdout.out.join('')).toContain('#0d1117')
  })

  it('fails with file:line errors and writes nothing', async () => {
    const { io, written, err } = fakeIo({ 'd.flow': 'a = hexagon\n' })

    expect(await run(['render', 'd.flow', '-o', 'd.svg'], io)).toBe(1)
    expect(written).toEqual({})
    expect(err.join('')).toMatch(/^d\.flow:1: Unknown shape "hexagon"/)
  })
})

describe('isketch render, sketched', () => {
  it('embeds the handwriting font only in a sketch', async () => {
    const font = async () => 'data:font/woff2;base64,AAAA'
    const sketch = fakeIo({ 'd.flow': `style: sketch\n${GOOD}` })
    const clean = fakeIo({ 'd.flow': GOOD })

    expect(await run(['render', 'd.flow'], { ...sketch.io, sketchFont: font })).toBe(0)
    expect(await run(['render', 'd.flow'], { ...clean.io, sketchFont: font })).toBe(0)
    expect(sketch.out.join('')).toContain('base64,AAAA')
    expect(clean.out.join('')).not.toContain('base64')
  })
})

describe('isketch check', () => {
  it('passes good files and fails on any bad or missing one', async () => {
    const { io, err } = fakeIo({ 'good.flow': GOOD, 'bad.flow': 'x -> y' })

    expect(await run(['check', 'good.flow'], io)).toBe(0)
    expect(await run(['check', 'good.flow', 'bad.flow', 'gone.flow'], io)).toBe(1)
    expect(err.join('')).toContain('bad.flow:1: No node called "x".')
    expect(err.join('')).toContain('gone.flow: cannot be read')
  })
})

describe('isketch diff', () => {
  it('lists what changed, and draws it', async () => {
    const after = `${GOOD}c = note "C"\nb -> c\n`.replace('"A"', '"Alpha"')
    const { io, out, written } = fakeIo({ 'before.flow': GOOD, 'after.flow': after })

    expect(await run(['diff', 'before.flow', 'after.flow', '-o', 'd.svg'], io)).toBe(0)
    expect(out.join('')).toBe('+ C\n~ A → Alpha\n+ B → C\n')
    expect(written['d.svg']).toContain('data-change="added"')
  })

  it('says when nothing changed, and needs exactly two files', async () => {
    const same = fakeIo({ 'a.flow': GOOD, 'b.flow': GOOD })
    expect(await run(['diff', 'a.flow', 'b.flow'], same.io)).toBe(0)
    expect(same.out.join('')).toBe('No changes.\n')

    expect(await run(['diff', 'a.flow'], fakeIo().io)).toBe(2)
  })
})

describe('isketch brief', () => {
  it('prints a Markdown brief, and needs exactly one file', async () => {
    const { io, out } = fakeIo({ 'd.flow': GOOD })

    expect(await run(['brief', 'd.flow'], io)).toBe(0)
    expect(out.join('')).toContain('- **A** → **B**: reads')

    expect(await run(['brief'], fakeIo().io)).toBe(2)
    expect(await run(['brief', 'missing.flow'], fakeIo().io)).toBe(1)
  })
})

describe('usage', () => {
  it('prints usage for help, and exits 2 for a mistake', async () => {
    const help = fakeIo()
    expect(await run(['--help'], help.io)).toBe(0)
    expect(help.err.join('')).toBe(USAGE)

    expect(await run(['draw'], fakeIo().io)).toBe(2)
    expect(await run(['render'], fakeIo().io)).toBe(2)
    expect(await run(['render', 'a.flow', '-o'], fakeIo().io)).toBe(2)
  })
})

describe('isketch import', () => {
  const PRISMA =
    'model User {\n  id Int @id\n}\n\nmodel Post {\n  id Int @id\n  author User @relation(fields: [authorId], references: [id])\n  authorId Int\n  tag Tagg\n}\n'

  it('reads the format from the name, and writes .flow to a file or stdout', async () => {
    const toFile = fakeIo({ 'schema.prisma': PRISMA })
    expect(await run(['import', 'schema.prisma', '-o', 'db.flow'], toFile.io)).toBe(0)
    expect(toFile.written['db.flow']).toContain('User = table "User" -- id PK')
    expect(toFile.written['db.flow']).toContain('Post -> User : authorId')
    expect(toFile.err.join('')).toContain('schema.prisma:9: Post.tag is a Tagg')
    expect(toFile.err.join('')).toContain(
      'Imported schema.prisma (Prisma) to db.flow: 2 shapes, 1 connection',
    )

    const toStdout = fakeIo({
      'docker-compose.yml': 'services:\n  api:\n    depends_on: [db]\n  db:\n    image: postgres\n',
    })
    expect(await run(['import', 'docker-compose.yml'], toStdout.io)).toBe(0)
    expect(toStdout.out.join('')).toMatch(/api -> db/)
  })

  it('takes the format outright with --from, and says which there are', async () => {
    const named = fakeIo({ 'db.txt': 'CREATE TABLE a (id int PRIMARY KEY);' })
    expect(await run(['import', '--from', 'sql', 'db.txt'], named.io)).toBe(0)
    expect(named.out.join('')).toContain('a = table "a"')

    const unknown = fakeIo({ 'db.txt': '' })
    expect(await run(['import', 'db.txt', '--from', 'yaml'], unknown.io)).toBe(2)
    expect(unknown.err.join('')).toContain('there is no "yaml" import. Try one of: mermaid')
  })

  it('fails when it cannot tell the format, or cannot read the file', async () => {
    const vague = fakeIo({ 'notes.txt': 'hello' })
    expect(await run(['import', 'notes.txt'], vague.io)).toBe(1)
    expect(vague.err.join('')).toContain('Say it with --from')
    expect(await run(['import', 'missing.prisma'], fakeIo().io)).toBe(1)
    expect(await run(['import'], fakeIo().io)).toBe(2)
  })
})
