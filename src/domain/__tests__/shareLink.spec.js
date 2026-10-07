import { afterEach, describe, expect, it, vi } from 'vitest'

import { sampleById } from '../samples.js'
import { decodeShare, encodeShare, readShare, SHARE_PREFIX } from '../shareLink.js'

/** @param {string} text ASCII */
const base64url = (text) => btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const architecture = sampleById('architecture').document

afterEach(() => vi.unstubAllGlobals())

describe('share links', () => {
  it('carry a whole diagram, compressed, and open it again exactly', async () => {
    const hash = await encodeShare(architecture)

    expect(hash.startsWith(`${SHARE_PREFIX}z`)).toBe(true)
    // Only URL-safe characters, so nothing needs escaping in a chat message.
    expect(hash.slice(SHARE_PREFIX.length)).toMatch(/^[\w-]+$/)
    expect(await decodeShare(hash)).toEqual(architecture)
  })

  it('fall back to plain text where the browser cannot compress', async () => {
    vi.stubGlobal('CompressionStream', undefined)
    const hash = await encodeShare(architecture)

    expect(hash.startsWith(`${SHARE_PREFIX}t`)).toBe(true)
    expect(await decodeShare(hash)).toEqual(architecture)
  })

  it('keep text that is not ASCII', async () => {
    const document = structuredClone(architecture)
    document.title = 'Café → 日本'
    expect((await decodeShare(await encodeShare(document))).title).toBe('Café → 日本')
  })

  it('open nothing from a hash that is not a diagram, or is damaged', async () => {
    expect(await decodeShare('')).toBeNull()
    expect(await decodeShare('#section-2')).toBeNull()
    expect(await decodeShare(`${SHARE_PREFIX}znot-compressed-data`)).toBeNull()
    expect(await decodeShare(`${SHARE_PREFIX}x${btoa('a = process')}`)).toBeNull()
    // Valid bytes, but not a valid diagram.
    expect(await decodeShare(`${SHARE_PREFIX}t${btoa('a = hexagon')}`)).toBeNull()
  })

  it('opens a link with lines it cannot read, leaving those out', async () => {
    const text = 'a = process "A"\na color: mauve\nb = blob "B"\nc = database "C"\nb -> c\na -> c'
    const shared = await readShare(`${SHARE_PREFIX}t${base64url(text)}`)
    expect(shared?.document.nodes.map((node) => node.id)).toEqual(['a', 'c'])
    expect(shared?.document.edges).toHaveLength(1)
    expect(shared?.skipped).toBe(3)
  })
})
