import { SHAPE, sizeOf } from './constants.js'
import { colorOf, nearestColor, paintOf } from './colors.js'
import { DOCUMENT_VERSION, edgeIdFor } from './document.js'
import { documentPositions } from './graph.js'
import { strokeToInk } from './ink.js'
import { isKnownShape } from './nodeMeta.js'

/**
 * Excalidraw files and clipboard data, in and out. Rectangles, ellipses,
 * diamonds, text and frames become shapes; arrows bound to a shape at both ends
 * become connections; free drawing becomes ink. What cannot come in is listed.
 *
 * Going out, each element carries its isketch kind, description and notes in
 * Excalidraw's own `customData`, so a round trip loses nothing.
 *
 * @typedef {{ line: number, message: string }} ExcalidrawWarning
 * @typedef {Record<string, any>} Element
 */

export const EXCALIDRAW_ORIGIN = 'excalidraw'

/** Excalidraw's own kinds, for elements that come without ours. */
const FROM_KIND = Object.freeze({
  rectangle: SHAPE.PROCESS,
  ellipse: SHAPE.TERMINAL,
  diamond: SHAPE.DECISION,
  frame: SHAPE.FRAME,
  magicframe: SHAPE.FRAME,
})

/** Ours, drawn with the nearest Excalidraw element. */
const TO_KIND = Object.freeze({
  [SHAPE.TERMINAL]: 'ellipse',
  [SHAPE.DECISION]: 'diamond',
  [SHAPE.TEXT]: 'text',
  [SHAPE.FRAME]: 'frame',
})

/** Elements with nothing in isketch to become, and how to say so. */
const SKIPPED = Object.freeze({
  line: 'a line (only arrows between shapes connect them)',
  image: 'an image',
  embeddable: 'an embed',
  iframe: 'an embed',
})

/** @param {string} id */
const safeId = (id) => {
  const clean = String(id).replace(/[^\w-]/g, '_')
  return /^[A-Za-z0-9_]/.test(clean) ? clean : `x${clean}`
}

/**
 * @param {string} text
 * @returns {{ document: import('./types.js').FlowDocument | null, warnings: ExcalidrawWarning[] }}
 */
export function fromExcalidraw(text) {
  /** @type {ExcalidrawWarning[]} */
  const warnings = []
  const fail = (/** @type {string} */ message) => ({
    document: null,
    warnings: [{ line: 0, message }],
  })

  let data
  try {
    data = JSON.parse(String(text ?? ''))
  } catch {
    return fail(
      'This is not an Excalidraw file. Open a .excalidraw file, or copy shapes in Excalidraw and paste them here.',
    )
  }
  if (
    !data ||
    !Array.isArray(data.elements) ||
    !/^excalidraw/.test(String(data.type ?? 'excalidraw'))
  ) {
    return fail(
      'This is not an Excalidraw file. Open a .excalidraw file, or copy shapes in Excalidraw and paste them here.',
    )
  }

  /** @type {Element[]} */
  const elements = data.elements.filter(
    (/** @type {Element} */ element) => element && !element.isDeleted,
  )
  const byId = new Map(elements.map((element) => [element.id, element]))
  /** Text bound to a shape or an arrow is its name or label, not a shape of its own. */
  const boundText = new Map(
    elements
      .filter((element) => element.type === 'text' && element.containerId)
      .map((element) => [element.containerId, String(element.originalText ?? element.text ?? '')]),
  )

  const ids = new Map()
  const idFor = (/** @type {string} */ id) => {
    if (!ids.has(id)) {
      let next = safeId(id)
      while ([...ids.values()].includes(next)) next = `${next}_`
      ids.set(id, next)
    }
    return ids.get(id)
  }

  /** @type {import('./types.js').FlowNode[]} */
  const nodes = []
  /** @type {import('./types.js').FlowEdge[]} */
  const edges = []
  /** @type {Map<string, number>} */
  const skipped = new Map()
  const skip = (/** @type {string} */ what) => skipped.set(what, (skipped.get(what) ?? 0) + 1)

  /**
   * The named colour nearest what it was drawn in: the fill first, since a
   * filled shape reads as its fill.
   * @param {Record<string, any>} element
   */
  const colorIn = (element) => {
    const color = nearestColor(element.backgroundColor) || nearestColor(element.strokeColor)
    return color ? { color } : {}
  }

  elements.forEach((element) => {
    const own = element.customData?.isketch
    const kind =
      own && isKnownShape(own)
        ? own
        : FROM_KIND[/** @type {keyof typeof FROM_KIND} */ (element.type)]

    if (kind || (element.type === 'text' && !element.containerId)) {
      const type = kind ?? SHAPE.TEXT
      const name =
        type === SHAPE.TEXT && element.type === 'text'
          ? String(element.originalText ?? element.text ?? '')
          : type === SHAPE.FRAME && element.name
            ? String(element.name)
            : (boundText.get(element.id) ?? '')
      nodes.push({
        id: idFor(element.id),
        type,
        name: name.trim(),
        data: {
          description: String(element.customData?.description ?? ''),
          ...(element.customData?.notes ? { notes: String(element.customData.notes) } : {}),
          ...colorIn(element),
        },
        position: { x: Math.round(element.x ?? 0), y: Math.round(element.y ?? 0) },
        size: {
          width: Math.max(1, Math.round(Math.abs(element.width ?? 0))),
          height: Math.max(1, Math.round(Math.abs(element.height ?? 0))),
        },
      })
      return
    }

    if (element.type === 'freedraw') {
      const pressured = !element.simulatePressure && Array.isArray(element.pressures)
      const drawn = (element.points ?? []).map(
        (/** @type {number[]} */ [px, py], /** @type {number} */ index) => ({
          x: (element.x ?? 0) + px,
          y: (element.y ?? 0) + py,
          ...(pressured && element.pressures[index] > 0 ? { p: element.pressures[index] } : {}),
        }),
      )
      const ink = strokeToInk(drawn)
      if (!ink) return
      nodes.push({
        id: idFor(element.id),
        type: SHAPE.INK,
        name: '',
        data: { points: ink.points, ...colorIn(element) },
        position: ink.position,
        size: ink.size,
      })
      return
    }

    if (element.type === 'arrow') return
    if (element.type === 'text') return
    skip(SKIPPED[/** @type {keyof typeof SKIPPED} */ (element.type)] ?? `a ${element.type}`)
  })

  const made = new Set(nodes.map((node) => node.id))
  elements
    .filter((element) => element.type === 'arrow')
    .forEach((arrow) => {
      const from = arrow.startBinding?.elementId
      const to = arrow.endBinding?.elementId
      const source = from && byId.has(from) ? idFor(from) : ''
      const target = to && byId.has(to) ? idFor(to) : ''
      if (!made.has(source) || !made.has(target) || source === target) {
        skip('an arrow not joined to a shape at both ends')
        return
      }
      // An arrow drawn backwards, head at the start, still points the way it shows.
      const reversed = Boolean(arrow.startArrowhead) && !arrow.endArrowhead
      const [a, b] = reversed ? [target, source] : [source, target]
      const id = edgeIdFor(a, b)
      if (edges.some((edge) => edge.id === id)) return
      const label = (boundText.get(arrow.id) ?? '').trim()
      edges.push({
        id,
        source: a,
        target: b,
        ...(label ? { label } : {}),
        ...(arrow.strokeStyle === 'dashed' || arrow.strokeStyle === 'dotted'
          ? { dashed: true }
          : {}),
        ...(arrow.startArrowhead && arrow.endArrowhead ? { both: true } : {}),
      })
    })

  skipped.forEach((count, what) =>
    warnings.push({
      line: 0,
      message: count === 1 ? `Skipped ${what}.` : `Skipped ${count} × ${what}.`,
    }),
  )
  if (!nodes.length)
    return {
      document: null,
      warnings: [...warnings, { line: 0, message: 'There is nothing here isketch can draw.' }],
    }

  // Excalidraw draws by hand unless every stroke was set to architect.
  const handDrawn = elements.some((element) => (element.roughness ?? 1) > 0)
  return {
    document: {
      version: DOCUMENT_VERSION,
      title: String(data.appState?.name ?? '').trim() || 'Excalidraw sketch',
      ...(handDrawn ? { style: 'sketch' } : {}),
      nodes,
      edges,
    },
    warnings,
  }
}

/** A stable number from an id, so the same diagram exports byte for byte the same. */
/** @param {string} text */
const seedOf = (text) => {
  let hash = 2166136261
  for (const char of String(text)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0
  return hash % 2147483647
}

/**
 * @param {Record<string, any>} extra
 * @param {string} id
 * @param {boolean} sketch
 * @returns {Record<string, any>}
 */
const element = (extra, id, sketch) => ({
  id,
  angle: 0,
  strokeColor: '#1e1e1e',
  backgroundColor: 'transparent',
  fillStyle: 'solid',
  strokeWidth: 2,
  strokeStyle: 'solid',
  roughness: sketch ? 1 : 0,
  opacity: 100,
  groupIds: [],
  frameId: null,
  roundness: null,
  seed: seedOf(id),
  version: 1,
  versionNonce: seedOf(`${id}:nonce`),
  isDeleted: false,
  boundElements: null,
  updated: 1,
  link: null,
  locked: false,
  ...extra,
})

/** Excalidraw's handwriting face, and its clean one. */
const FONT = { HAND: 1, CLEAN: 2 }

/**
 * @param {string} text
 * @param {{ x: number, y: number, width: number, height: number }} box
 * @param {string} id
 * @param {string | null} containerId
 * @param {boolean} sketch
 */
function textElement(text, box, id, containerId, sketch) {
  const fontSize = 20
  const lines = String(text).split('\n')
  // A label sits in the middle of what holds it; a text shape is its own box.
  const width = containerId
    ? Math.min(box.width, Math.max(...lines.map((line) => line.length)) * fontSize * 0.55)
    : box.width
  const height = containerId ? lines.length * fontSize * 1.25 : box.height
  return element(
    {
      type: 'text',
      x: Math.round(box.x + (box.width - width) / 2),
      y: Math.round(box.y + (box.height - height) / 2),
      width: Math.round(width),
      height: Math.round(height),
      text,
      originalText: text,
      fontSize,
      fontFamily: sketch ? FONT.HAND : FONT.CLEAN,
      textAlign: 'center',
      verticalAlign: 'middle',
      containerId,
      lineHeight: 1.25,
      autoResize: true,
    },
    id,
    sketch,
  )
}

/**
 * The diagram as a `.excalidraw` file.
 * @param {import('./types.js').FlowDocument} document
 * @returns {string}
 */
export function toExcalidraw(document) {
  const positions = documentPositions(document)
  const sketch = document.style === 'sketch'
  /** @type {Map<string, Record<string, any>>} */
  const shapes = new Map()
  /** @type {Record<string, any>[]} */
  const out = []

  // Frames first, so they sit behind what they hold.
  const ordered = [...document.nodes].sort(
    (a, b) => Number(b.type === SHAPE.FRAME) - Number(a.type === SHAPE.FRAME),
  )
  ordered.forEach((node) => {
    const at = positions.get(node.id) ?? { x: 0, y: 0 }
    const { width, height } = sizeOf(node)
    const box = { x: Math.round(at.x), y: Math.round(at.y), width, height }
    const paint = paintOf(colorOf(node))

    if (node.type === SHAPE.INK) {
      const points = String(node.data?.points ?? '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((triple) => triple.split(',').map(Number))
      const pressures = points.map(([, , p]) => (Number.isFinite(p) ? p : 0.5))
      out.push(
        element(
          {
            type: 'freedraw',
            ...box,
            points: points.map(([x, y]) => [
              Math.round((x / 100) * width * 10) / 10,
              Math.round((y / 100) * height * 10) / 10,
            ]),
            pressures,
            simulatePressure: !points.some((point) => Number.isFinite(point[2])),
            customData: { isketch: SHAPE.INK },
            ...(paint ? { strokeColor: paint.stroke } : {}),
          },
          node.id,
          sketch,
        ),
      )
      return
    }

    const type = /** @type {string} */ (
      TO_KIND[/** @type {keyof typeof TO_KIND} */ (node.type)] ?? 'rectangle'
    )
    const customData = {
      isketch: node.type,
      ...(node.data?.description ? { description: node.data.description } : {}),
      ...(node.data?.notes ? { notes: node.data.notes } : {}),
    }

    if (type === 'text') {
      out.push({ ...textElement(node.name ?? '', box, node.id, null, sketch), customData })
      return
    }

    const shape = element(
      {
        type,
        ...box,
        ...(type === 'frame' ? { name: node.name ?? '' } : {}),
        ...(type === 'rectangle' ? { roundness: { type: 3 } } : {}),
        boundElements: [],
        customData,
        ...(paint ? { strokeColor: paint.stroke, backgroundColor: paint.fill } : {}),
      },
      node.id,
      sketch,
    )
    shapes.set(node.id, shape)
    out.push(shape)
    if (type !== 'frame' && node.name) {
      const label = `${node.id}-label`
      shape.boundElements.push({ type: 'text', id: label })
      out.push(textElement(node.name, box, label, node.id, sketch))
    }
  })

  document.edges.forEach((edge) => {
    const from = shapes.get(edge.source)
    const to = shapes.get(edge.target)
    if (!from || !to) return
    const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 }
    const end = { x: to.x + to.width / 2, y: to.y + to.height / 2 }
    const arrow = element(
      {
        type: 'arrow',
        x: Math.round(start.x),
        y: Math.round(start.y),
        width: Math.round(Math.abs(end.x - start.x)),
        height: Math.round(Math.abs(end.y - start.y)),
        points: [
          [0, 0],
          [Math.round(end.x - start.x), Math.round(end.y - start.y)],
        ],
        strokeStyle: edge.dashed ? 'dashed' : 'solid',
        startBinding: { elementId: edge.source, focus: 0, gap: 4 },
        endBinding: { elementId: edge.target, focus: 0, gap: 4 },
        startArrowhead: edge.both ? 'arrow' : null,
        endArrowhead: 'arrow',
        boundElements: [],
      },
      edge.id,
      sketch,
    )
    from.boundElements.push({ type: 'arrow', id: edge.id })
    to.boundElements.push({ type: 'arrow', id: edge.id })
    out.push(arrow)
    if (edge.label) {
      const label = `${edge.id}-label`
      arrow.boundElements.push({ type: 'text', id: label })
      const middle = {
        x: (start.x + end.x) / 2 - 60,
        y: (start.y + end.y) / 2 - 12,
        width: 120,
        height: 24,
      }
      out.push(textElement(edge.label, middle, label, edge.id, sketch))
    }
  })

  return `${JSON.stringify(
    {
      type: 'excalidraw',
      version: 2,
      source: 'https://isketch.online',
      elements: out,
      appState: { name: document.title ?? '', viewBackgroundColor: '#ffffff', gridSize: null },
      files: {},
    },
    null,
    2,
  )}\n`
}
