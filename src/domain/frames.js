import { SHAPE, sizeOf } from './constants.js'
import { documentPositions, toNodeId } from './graph.js'

/**
 * Frames: named regions that group the shapes inside them. Membership is where
 * a shape sits, not a list to keep in step: a shape belongs to the smallest
 * frame its centre is in, so dragging it in or out is all it takes.
 */

/** @param {{ type?: string }} node */
export const isFrame = (node) => node.type === SHAPE.FRAME

/**
 * Each frame's members, frames inside frames included.
 * @param {import('./types.js').FlowDocument} document
 * @returns {Map<string, string[]>} frame id to member ids, in document order
 */
export function frameMembers(document) {
  const at = documentPositions(document)
  const box = (/** @type {Record<string, any>} */ node) => ({
    ...(at.get(toNodeId(node.id)) ?? { x: 0, y: 0 }),
    ...sizeOf(node),
  })
  const frames = document.nodes
    .filter(isFrame)
    .map((node) => ({ id: toNodeId(node.id), ...box(node) }))
  const members = new Map(frames.map((frame) => [frame.id, /** @type {string[]} */ ([])]))
  if (!frames.length) return members

  document.nodes.forEach((node) => {
    const id = toNodeId(node.id)
    const own = box(node)
    const centre = { x: own.x + own.width / 2, y: own.y + own.height / 2 }
    const holder = frames
      .filter(
        (frame) =>
          frame.id !== id &&
          frame.width * frame.height > own.width * own.height &&
          centre.x >= frame.x &&
          centre.x <= frame.x + frame.width &&
          centre.y >= frame.y &&
          centre.y <= frame.y + frame.height,
      )
      .sort((a, b) => a.width * a.height - b.width * b.height)[0]
    if (holder) members.get(holder.id)?.push(id)
  })
  return members
}

/**
 * One frame as a diagram of its own: the frame, what is in it (frames within
 * it with their contents), and the connections among them. Named after it.
 *
 * @param {import('./types.js').FlowDocument} document
 * @param {string} frameId
 * @returns {import('./types.js').FlowDocument | null}
 */
export function frameDocument(document, frameId) {
  const frame = document.nodes.find((node) => toNodeId(node.id) === frameId && isFrame(node))
  if (!frame) return null

  const members = frameMembers(document)
  const inside = new Set([frameId])
  const visit = (/** @type {string} */ id) =>
    (members.get(id) ?? []).forEach((member) => {
      inside.add(member)
      visit(member)
    })
  visit(frameId)

  return {
    ...document,
    title: frame.name || document.title,
    nodes: document.nodes.filter((node) => inside.has(toNodeId(node.id))),
    edges: document.edges.filter((edge) => inside.has(edge.source) && inside.has(edge.target)),
  }
}
