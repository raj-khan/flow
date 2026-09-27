/**
 * The hosted-links server (see server/ and the README), for a public link an
 * AI can read. Off unless the build names a server in VITE_ISKETCH_API; the
 * app stays local first either way.
 *
 * @typedef {{ id: string, url: string, revision: number, links: { page: string, markdown: string, flow: string, svg: string, json: string, embed?: string, oembed?: string } }} Published
 */

/** @returns {string} the server's origin, or '' when publishing is off */
export const publishServer = () =>
  String(import.meta.env.VITE_ISKETCH_API ?? '').replace(/\/+$/, '')

/**
 * Why a request failed, in words a person can act on.
 * @param {Response} response
 */
async function failure(response) {
  let body = null
  try {
    body = await response.json()
  } catch {
    // Not JSON: the status says enough.
  }
  const first = body?.errors?.[0]
  const detail = first ? ` Line ${first.line}: ${first.message}` : ''
  return new Error(`${body?.message ?? `The server said ${response.status}.`}${detail}`)
}

/**
 * @param {string} path
 * @param {RequestInit} init
 */
async function request(path, init) {
  let response
  try {
    response = await fetch(`${publishServer()}${path}`, init)
  } catch {
    throw new Error('The isketch server could not be reached.')
  }
  if (!response.ok) throw await failure(response)
  return response.status === 204 ? null : response.json()
}

/**
 * @param {string} text the diagram as .flow text
 * @returns {Promise<Published & { editToken: string }>}
 */
export const publishDiagram = (text) =>
  request('/api/diagrams', {
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: text,
  })

/**
 * @param {string} id
 * @param {string} editToken
 * @param {string} text
 * @returns {Promise<Published>}
 */
export const updateDiagram = (id, editToken, text) =>
  request(`/api/diagrams/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'content-type': 'text/plain', authorization: `Bearer ${editToken}` },
    body: text,
  })

/**
 * @param {string} id
 * @param {string} editToken
 */
export const unpublishDiagram = (id, editToken) =>
  request(`/api/diagrams/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${editToken}` },
  })
