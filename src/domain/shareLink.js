import { parseFlowForgiving, serialiseFlow } from './flowText.js'

/**
 * A whole diagram in a URL fragment, so sharing needs no server: the fragment
 * never leaves the browser, and the link works offline. It carries `.flow`
 * text rather than the stored JSON, so a link made today still opens after the
 * storage format changes.
 *
 *     #flow=z<base64url of deflate-raw>   compressed, where the browser can
 *     #flow=t<base64url of utf-8>         plain, where it cannot
 */
export const SHARE_PREFIX = '#flow='

/** Past this, some chat apps and email clients cut the link off. */
export const LONG_LINK = 8000

/**
 * @param {import('./types.js').FlowDocument} document
 * @returns {Promise<string>} the fragment, starting with `#`
 */
export async function encodeShare(document) {
  const bytes = new TextEncoder().encode(serialiseFlow(document))
  const compressed = await transform(bytes, 'compress')
  return compressed
    ? `${SHARE_PREFIX}z${toBase64Url(compressed)}`
    : `${SHARE_PREFIX}t${toBase64Url(bytes)}`
}

/**
 * @param {string} hash a location hash, with or without anything after the diagram
 * @returns {Promise<import('./types.js').FlowDocument | null>} null when it is not a diagram
 */
export async function decodeShare(hash) {
  return (await readShare(hash))?.document ?? null
}

/**
 * A link is often written by an agent, so a line isketch cannot read is left
 * out rather than refusing the whole diagram.
 * @param {string} hash
 * @returns {Promise<{ document: import('./types.js').FlowDocument, skipped: number } | null>}
 */
export async function readShare(hash) {
  if (!hash?.startsWith(SHARE_PREFIX)) return null

  const body = hash.slice(SHARE_PREFIX.length)
  const kind = body[0]
  const bytes = fromBase64Url(body.slice(1))
  if (!bytes) return null

  const text =
    kind === 'z'
      ? await transform(bytes, 'decompress').then((out) => (out ? decode(out) : null))
      : kind === 't'
        ? decode(bytes)
        : null
  if (text === null) return null

  const { document, skipped } = parseFlowForgiving(text)
  // Nothing readable at all is not a diagram, not an empty one.
  if (!document || (skipped.length && !document.nodes.length)) return null
  return { document, skipped: skipped.length }
}

/**
 * @param {Uint8Array} bytes
 * @param {'compress' | 'decompress'} direction
 * @returns {Promise<Uint8Array | null>} null where the browser has no streams, or the data is bad
 */
async function transform(bytes, direction) {
  const Stream =
    direction === 'compress' ? globalThis.CompressionStream : globalThis.DecompressionStream
  if (!Stream) return null

  try {
    const stream = new Blob([/** @type {BlobPart} */ (bytes)])
      .stream()
      .pipeThrough(new Stream('deflate-raw'))
    return new Uint8Array(await new Response(stream).arrayBuffer())
  } catch {
    return null
  }
}

/** @param {Uint8Array} bytes */
function decode(bytes) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}

/** @param {Uint8Array} bytes */
function toBase64Url(bytes) {
  let binary = ''
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** @param {string} text @returns {Uint8Array | null} */
function fromBase64Url(text) {
  try {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
    return Uint8Array.from(binary, (char) => char.charCodeAt(0))
  } catch {
    return null
  }
}
