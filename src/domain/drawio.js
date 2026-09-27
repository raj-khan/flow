import { inflateSync, strFromU8 } from 'fflate'

import { MIN_NODE_SIZE, NODE_SIZE, SHAPE, sizeOf } from './constants.js'
import { DOCUMENT_VERSION, edgeIdFor } from './document.js'
import { documentPositions } from './graph.js'
import { isKnownShape } from './nodeMeta.js'

/**
 * draw.io files in and out, so a diagram can come from, or go back to, the
 * tool most teams already have. Import reads the first page of a `.drawio`
 * file, compressed or not, or the XML from Extras > Edit Diagram. Export
 * writes plain XML draw.io opens as it is, and marks each shape with an
 * `isketch` style key, which draw.io keeps, so a round trip loses nothing.
 *
 * @typedef {{ line: number, message: string }} DrawioWarning
 * @typedef {{ name: string, attrs: Record<string, string>, children: XmlElement[], text: string, line: number }} XmlElement
 */

export const DRAWIO_ORIGIN = 'drawio'

/** Our own style key, read first on import. */
const STYLE_KEY = 'isketch'

/**
 * @param {string} text
 * @returns {{ document: import('./types.js').FlowDocument | null, warnings: DrawioWarning[] }}
 */
export function fromDrawio(text) {
  /** @type {DrawioWarning[]} */
  const warnings = []
  const fail = (/** @type {string} */ message) => ({
    document: null,
    warnings: [{ line: 1, message }],
  })

  const root = parseXml(String(text ?? ''))
  if (!root) return fail('This is not draw.io XML. Paste a .drawio file, or Extras > Edit Diagram.')

  let model = root.name === 'mxGraphModel' ? root : null
  let title = ''
  if (root.name === 'mxfile') {
    const pages = root.children.filter((child) => child.name === 'diagram')
    if (!pages.length) return fail('The file has no pages.')
    if (pages.length > 1) {
      warnings.push({
        line: pages[1].line,
        message: `Only the first of ${pages.length} pages was imported.`,
      })
    }
    const [page] = pages
    title = page.attrs.name ?? ''
    model = page.children.find((child) => child.name === 'mxGraphModel') ?? inflatePage(page.text)
    if (!model) return fail('The first page could not be read. Save it uncompressed and try again.')
  }
  if (!model)
    return fail('This is not draw.io XML. Paste a .drawio file, or Extras > Edit Diagram.')

  const document = readModel(model, warnings)
  document.title = title && !/^Page-\d+$/.test(title) ? title : 'Imported from draw.io'
  return { document, warnings }
}

/**
 * @param {XmlElement} model
 * @param {DrawioWarning[]} warnings
 * @returns {import('./types.js').FlowDocument}
 */
function readModel(model, warnings) {
  const cells = collectCells(model)
  const byId = new Map(cells.map((cell) => [cell.id, cell]))

  const isVertex = (/** @type {Cell | undefined} */ cell) => cell?.attrs.vertex === '1'
  const childrenOf = (/** @type {Cell} */ cell) =>
    cells.filter((child) => child.parent === cell.id && isVertex(child))
  /**
   * draw.io draws both entity tables and lanes as swimlanes. A table stacks
   * rows of text; a lane holds shapes of its own.
   */
  const isTableCell = (/** @type {Cell | undefined} */ cell) => {
    if (!cell || !isVertex(cell)) return false
    if (cell.style.shape === 'table' || cell.style[STYLE_KEY] === SHAPE.TABLE) return true
    if (!('swimlane' in cell.style)) return false
    const children = childrenOf(cell)
    if (!children.length) return cell.style.childLayout === 'stackLayout'
    return children.every((child) => isRowStyle(child.style))
  }
  /** A lane, pool or container: its shapes are kept, the box around them is not. */
  const isContainer = (/** @type {Cell} */ cell) =>
    !isTableCell(cell) &&
    ('swimlane' in cell.style || cell.style.container === '1' || 'group' in cell.style)
  const isLabelOf = (/** @type {Cell} */ cell) =>
    'edgeLabel' in cell.style && byId.get(cell.parent)?.attrs.edge === '1'

  /** The table a cell sits inside, at any depth: its rows and columns are the table's text. */
  const tableOf = (/** @type {Cell} */ cell) => {
    for (let at = byId.get(cell.parent); at; at = byId.get(at.parent)) {
      if (isTableCell(at)) return at
    }
    return null
  }

  /** @type {Map<string, { x: number, y: number }>} */
  const absolute = new Map()
  /** @type {(cell: Cell) => { x: number, y: number }} */
  const positionOf = (cell) => {
    const known = absolute.get(cell.id)
    if (known) return known
    const parent = byId.get(cell.parent)
    /** @type {{ x: number, y: number }} */
    const offset = isVertex(parent) ? positionOf(/** @type {Cell} */ (parent)) : { x: 0, y: 0 }
    const at = { x: offset.x + cell.geometry.x, y: offset.y + cell.geometry.y }
    absolute.set(cell.id, at)
    return at
  }

  /** A shape's cell id to the id it gets here, for edges to follow. */
  /** @type {Map<string, string>} */
  const idFor = new Map()
  const taken = new Set()
  /** @type {Record<string, any>[]} */
  const nodes = []
  let sketched = 0
  /** @type {Cell | null} */
  let firstContainer = null

  cells.forEach((cell) => {
    if (!isVertex(cell) || isLabelOf(cell) || tableOf(cell)) return
    if (isContainer(cell) && childrenOf(cell).length) {
      firstContainer ??= cell
      return
    }

    const label = labelOf(cell)
    if (!label && !isTableCell(cell) && 'group' in cell.style) return

    const { name, description: rest } = splitLabel(label, cell)
    const description = isTableCell(cell) ? rowsOf(cell, cells) : rest

    // A shape this editor exported keeps its id, so a round trip changes nothing.
    const own = STYLE_KEY in cell.style && /^n-([A-Za-z0-9_][\w-]*)$/.exec(cell.id)?.[1]
    const id = own && !taken.has(own) ? (taken.add(own), own) : uniqueId(name, taken)
    idFor.set(cell.id, id)
    if (cell.style.sketch === '1') sketched += 1

    const position = positionOf(cell)
    const width = Math.max(MIN_NODE_SIZE.WIDTH, Math.round(cell.geometry.width))
    const height = Math.max(MIN_NODE_SIZE.HEIGHT, Math.round(cell.geometry.height))
    nodes.push({
      id,
      type: shapeOf(cell.style),
      name,
      data: { ...(description ? { description } : {}), origin: DRAWIO_ORIGIN },
      position: { x: Math.round(position.x), y: Math.round(position.y) },
      ...(width !== NODE_SIZE.WIDTH || height !== NODE_SIZE.HEIGHT
        ? { size: { width, height } }
        : {}),
    })
  })

  if (firstContainer) {
    warnings.push({
      line: /** @type {Cell} */ (firstContainer).line,
      message: 'Lanes and containers are not kept; the shapes inside them are.',
    })
  }

  /** Where an edge end lands: the shape itself, or the table a row belongs to. */
  const endOf = (/** @type {string | undefined} */ cellId) => {
    const cell = cellId ? byId.get(cellId) : undefined
    if (!cell) return undefined
    return idFor.get(cell.id) ?? idFor.get(tableOf(cell)?.id ?? '')
  }

  /** @type {import('./types.js').FlowEdge[]} */
  const edges = []
  cells.forEach((cell) => {
    if (cell.attrs.edge !== '1') return
    const source = endOf(cell.attrs.source)
    const target = endOf(cell.attrs.target)
    if (!source || !target) {
      warnings.push({
        line: cell.line,
        message: 'An arrow that is not connected to a shape at both ends was skipped.',
      })
      return
    }
    if (source === target) return

    const label = [
      labelOf(cell),
      ...cells.filter((child) => child.parent === cell.id && isLabelOf(child)).map(labelOf),
    ]
      .map((text) => text.replace(/\n+/g, ' ').trim())
      .filter(Boolean)
      .join(', ')

    const id = edgeIdFor(source, target)
    const existing = edges.find((edge) => edge.id === id)
    if (existing) {
      if (label) existing.label = existing.label ? `${existing.label}, ${label}` : label
      return
    }
    edges.push({
      id,
      source,
      target,
      ...(label ? { label } : {}),
      ...(cell.style.dashed === '1' ? { dashed: true } : {}),
      ...(cell.style.startArrow && cell.style.startArrow !== 'none' ? { both: true } : {}),
      origin: DRAWIO_ORIGIN,
    })
  })

  // The diagram's lines, when every arrow agrees: curved, straight, or steps.
  const arrows = cells.filter((cell) => cell.attrs.edge === '1')
  const lines = !arrows.length
    ? null
    : arrows.every((cell) => cell.style.curved === '1')
      ? 'curved'
      : arrows.every((cell) => !cell.style.edgeStyle && cell.style.curved !== '1')
        ? 'straight'
        : null

  return {
    version: DOCUMENT_VERSION,
    title: '',
    ...(nodes.length && sketched === nodes.length
      ? { style: /** @type {'sketch'} */ ('sketch') }
      : {}),
    ...(lines ? { lines } : {}),
    nodes,
    edges,
  }
}

/**
 * @typedef {{ id: string, parent: string, attrs: Record<string, string>, style: Record<string, string>, value: string, geometry: { x: number, y: number, width: number, height: number }, line: number }} Cell
 */

/**
 * Every cell in document order. A `UserObject` or `object` wraps a cell and
 * carries its id and label.
 * @param {XmlElement} model
 * @returns {Cell[]}
 */
function collectCells(model) {
  /** @type {Cell[]} */
  const cells = []
  const visit = (/** @type {XmlElement} */ element) => {
    element.children.forEach((child) => {
      if (child.name === 'mxCell') cells.push(toCell(child, child.attrs.id, child.attrs.value))
      else if (child.name === 'UserObject' || child.name === 'object') {
        const inner = child.children.find((candidate) => candidate.name === 'mxCell')
        if (inner) cells.push(toCell(inner, child.attrs.id, child.attrs.label))
      } else visit(child)
    })
  }
  visit(model)
  return cells
}

/**
 * @param {XmlElement} element
 * @param {string | undefined} id
 * @param {string | undefined} value
 * @returns {Cell}
 */
function toCell(element, id, value) {
  const geometry = element.children.find((child) => child.name === 'mxGeometry')?.attrs ?? {}
  const number = (/** @type {string | undefined} */ raw, /** @type {number} */ fallback) =>
    Number.isFinite(Number(raw)) && raw !== undefined && raw !== '' ? Number(raw) : fallback
  return {
    id: id ?? '',
    parent: element.attrs.parent ?? '',
    attrs: element.attrs,
    style: parseStyle(element.attrs.style ?? ''),
    value: value ?? '',
    geometry: {
      x: number(geometry.x, 0),
      y: number(geometry.y, 0),
      width: number(geometry.width, NODE_SIZE.WIDTH),
      height: number(geometry.height, NODE_SIZE.HEIGHT),
    },
    line: element.line,
  }
}

/**
 * `rounded=1;whiteSpace=wrap;ellipse;` to a map; a bare word maps to ''.
 * @param {string} style
 */
function parseStyle(style) {
  /** @type {Record<string, string>} */
  const map = {}
  style
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const at = part.indexOf('=')
      if (at === -1) map[part] = ''
      else map[part.slice(0, at)] = part.slice(at + 1)
    })
  return map
}

/** A table's row: a line of text, or draw.io's row and cell shapes. */
/** @param {Record<string, string>} style */
const isRowStyle = (style) =>
  'text' in style ||
  'line' in style ||
  style.shape === 'tableRow' ||
  style.shape === 'partialRectangle'

/**
 * A label's first line names the shape when it is set apart, bold or written
 * by this editor; a short label wrapped by hand is one name.
 * @param {string} label
 * @param {Cell} cell
 * @returns {{ name: string, description: string }}
 */
function splitLabel(label, cell) {
  const lines = label.split('\n')
  const setApart = STYLE_KEY in cell.style || /^\s*<(b|strong)\b/i.test(cell.value)
  if (!setApart && lines.length > 1 && label.length <= 40) {
    return { name: lines.join(' '), description: '' }
  }
  return {
    name:
      lines[0] || (cell.style.shape === 'table' || 'swimlane' in cell.style ? 'Table' : 'Untitled'),
    description: lines.slice(1).join('\n'),
  }
}

/**
 * The shape a draw.io style draws, as near as this editor has one.
 * @param {Record<string, string>} style
 * @returns {string}
 */
export function shapeOf(style) {
  const own = style[STYLE_KEY]
  if (own && isKnownShape(own)) return own

  const shape = (style.shape ?? '').toLowerCase()
  const has = (/** @type {string[]} */ ...names) =>
    names.some((name) => name in style || shape === name || shape.endsWith(`.${name}`))

  if (style.shape === 'table' || 'swimlane' in style) return SHAPE.TABLE
  if ('text' in style || 'edgeLabel' in style) return SHAPE.TEXT
  if (has('rhombus', 'decision')) return SHAPE.DECISION
  if (has('cylinder', 'cylinder3', 'datastore', 'database', 'stored_data')) return SHAPE.DATABASE
  if (has('parallelogram', 'data', 'manual_input')) return SHAPE.DATA
  if (has('document', 'multi-page_document')) return SHAPE.DOCUMENT
  if (has('note', 'annotation_1', 'annotation_2', 'card')) return SHAPE.NOTE
  if (has('ellipse', 'terminator', 'start_1', 'start_2', 'doublecircle')) return SHAPE.TERMINAL
  if (style.rounded === '1' && Number(style.arcSize) >= 40) return SHAPE.TERMINAL
  if (has('image', 'graphics')) return SHAPE.IMAGE
  if (shape.includes('browserwindow') || shape.includes('containers.window')) return SHAPE.SCREEN
  if (shape.includes('mockup.buttons')) return SHAPE.BUTTON
  if (shape.includes('mockup.forms')) return SHAPE.INPUT
  return SHAPE.PROCESS
}

/**
 * A cell's label as plain text: HTML labels lose their tags, keeping line breaks.
 * @param {Cell} cell
 */
function labelOf(cell) {
  const raw = cell.value ?? ''
  const text =
    cell.style.html === '1' || /<[a-z][^>]*>/i.test(raw)
      ? unescapeEntities(
          raw
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/(div|p|li|tr|h\d)>/gi, '\n')
            .replace(/<[^>]+>/g, ''),
        )
      : raw
  return text
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}

/**
 * A table's rows as its description: each row's label, or its cells' labels.
 * @param {Cell} table
 * @param {Cell[]} cells
 */
function rowsOf(table, cells) {
  return cells
    .filter((cell) => cell.parent === table.id)
    .map((row) => {
      const own = labelOf(row).replace(/\n/g, ' ')
      if (own) return own
      return cells
        .filter((cell) => cell.parent === row.id)
        .map((cell) => labelOf(cell).replace(/\n/g, ' '))
        .filter(Boolean)
        .join(' ')
    })
    .filter(Boolean)
    .join(', ')
}

/**
 * A readable id from a name, so an agent reading the diagram sees `orders`,
 * not `Wj3kX-12`.
 * @param {string} name
 * @param {Set<string>} taken
 */
function uniqueId(name, taken) {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24)
      .replace(/-+$/, '') || 'shape'
  let id = base
  for (let n = 2; taken.has(id); n += 1) id = `${base}-${n}`
  taken.add(id)
  return id
}

/**
 * A compressed page: base64, then raw deflate, then URI encoding.
 * @param {string} text
 * @returns {XmlElement | null}
 */
function inflatePage(text) {
  const packed = text.trim()
  if (!packed) return null
  try {
    const binary = atob(packed)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    const xml = decodeURIComponent(strFromU8(inflateSync(bytes)))
    const model = parseXml(xml)
    return model?.name === 'mxGraphModel' ? model : null
  } catch {
    return null
  }
}

/** Five named entities and numeric ones: all draw.io writes. */
/** @param {string} text */
function unescapeEntities(text) {
  /** @type {Record<string, string>} */
  const named = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'", nbsp: '\u00a0' }
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] !== '#') return named[entity.toLowerCase()] ?? match
    const code =
      entity[1] === 'x' || entity[1] === 'X'
        ? parseInt(entity.slice(2), 16)
        : parseInt(entity.slice(1), 10)
    return Number.isFinite(code) ? String.fromCodePoint(code) : match
  })
}

const TOKEN =
  /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<!\[CDATA\[([\s\S]*?)\]\]>|<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g
const ATTRIBUTE = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g

/**
 * Enough XML for draw.io: elements, attributes, text and CDATA. Returns the
 * root element, or null when the text is not well formed.
 * @param {string} text
 * @returns {XmlElement | null}
 */
export function parseXml(text) {
  /** @type {XmlElement[]} */
  const stack = []
  /** @type {XmlElement | null} */
  let root = null
  let line = 1
  let last = 0

  for (const match of text.matchAll(TOKEN)) {
    const index = match.index ?? 0
    for (let at = last; at < index; at += 1) if (text[at] === '\n') line += 1
    last = index

    const [whole, cdata, closing, name, attrs, selfClosing, chars] = match
    const top = stack.at(-1)
    if (chars !== undefined || cdata !== undefined) {
      if (top) top.text += cdata ?? unescapeEntities(chars)
      continue
    }
    if (!name) continue
    if (closing) {
      if (top?.name !== name) return null
      stack.pop()
      continue
    }

    /** @type {Record<string, string>} */
    const attributes = {}
    for (const [, key, double, single] of (attrs ?? '').matchAll(ATTRIBUTE)) {
      attributes[key] = unescapeEntities(double ?? single ?? '')
    }
    /** @type {XmlElement} */
    const element = { name, attrs: attributes, children: [], text: '', line }
    if (top) top.children.push(element)
    else if (root) return null
    else root = element
    if (!selfClosing) stack.push(element)
    if (whole.includes('\n')) for (const char of whole) if (char === '\n') line += 1
    last = index + whole.length
  }

  return stack.length ? null : root
}

/** Each shape's draw.io style, before the `isketch` key is added. */
/** @type {Readonly<Record<string, string>>} */
const EXPORT_STYLE = Object.freeze({
  [SHAPE.PROCESS]: 'rounded=1;whiteSpace=wrap;html=1;',
  [SHAPE.TERMINAL]: 'rounded=1;arcSize=50;whiteSpace=wrap;html=1;',
  [SHAPE.DECISION]: 'rhombus;whiteSpace=wrap;html=1;',
  [SHAPE.DATA]:
    'shape=parallelogram;perimeter=parallelogramPerimeter;fixedSize=1;whiteSpace=wrap;html=1;',
  [SHAPE.DATABASE]:
    'shape=cylinder3;boundedLbl=1;backgroundOutline=1;size=12;whiteSpace=wrap;html=1;',
  [SHAPE.DOCUMENT]: 'shape=document;boundedLbl=1;whiteSpace=wrap;html=1;',
  [SHAPE.NOTE]: 'shape=note;size=14;backgroundOutline=1;whiteSpace=wrap;html=1;',
  [SHAPE.TABLE]:
    'swimlane;fontStyle=1;childLayout=stackLayout;horizontal=1;startSize=26;horizontalStack=0;resizeParent=1;resizeLast=0;collapsible=0;marginBottom=0;html=1;',
  [SHAPE.TEXT]: 'text;align=center;verticalAlign=middle;whiteSpace=wrap;html=1;',
  [SHAPE.SCREEN]: 'rounded=0;whiteSpace=wrap;html=1;verticalAlign=top;',
  [SHAPE.BUTTON]: 'rounded=1;arcSize=30;whiteSpace=wrap;html=1;',
  [SHAPE.INPUT]: 'rounded=0;align=left;spacingLeft=10;whiteSpace=wrap;html=1;',
  [SHAPE.CARD]: 'rounded=1;shadow=1;whiteSpace=wrap;html=1;',
  [SHAPE.LIST]: 'rounded=0;whiteSpace=wrap;html=1;',
  [SHAPE.IMAGE]: 'rounded=0;dashed=1;whiteSpace=wrap;html=1;',
  [SHAPE.FRAME]:
    'rounded=1;arcSize=3;dashed=1;fillColor=none;verticalAlign=top;align=left;spacingLeft=10;fontStyle=1;whiteSpace=wrap;html=1;',
})

const ROW_HEIGHT = 26
const SKETCH_STYLE = 'sketch=1;curveFitting=1;jiggle=2;'

/** @param {string} text */
const escapeAttribute = (text) =>
  String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '&#xa;')

/** @param {string} text */
const escapeHtml = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * The diagram as a `.drawio` file. Shapes keep their positions and sizes;
 * unplaced ones get the automatic layout, as on the canvas.
 *
 * @param {import('./types.js').FlowDocument} document
 * @returns {string}
 */
export function toDrawio(document) {
  const positions = documentPositions(document)
  const sketch = document.style === 'sketch' ? SKETCH_STYLE : ''
  const cell = (/** @type {string} */ id) => `n-${id}`

  // draw.io has no freehand shape to carry a pen stroke. Frames go first, behind.
  const shapes = document.nodes
    .filter((node) => node.type !== SHAPE.INK)
    .sort((a, b) => Number(b.type === SHAPE.FRAME) - Number(a.type === SHAPE.FRAME))
    .flatMap((node) => {
      const type = isKnownShape(node.type) ? node.type : SHAPE.PROCESS
      const at = positions.get(node.id) ?? { x: 0, y: 0 }
      const width = sizeOf(node).width
      const description = String(node.data?.description ?? '')
      const isTable = type === SHAPE.TABLE
      const rows = isTable ? description.split(/,\s*/).filter(Boolean) : []
      const height = isTable
        ? Math.max(node.size?.height || 0, ROW_HEIGHT * (rows.length + 1))
        : sizeOf(node).height

      const name = escapeHtml(node.name ?? '')
      const value =
        isTable || !description
          ? name
          : `<b>${name}</b><br>${escapeHtml(description).replace(/\n/g, '<br>')}`
      const style = `${EXPORT_STYLE[type]}${sketch}${STYLE_KEY}=${type};`

      return [
        `        <mxCell id="${escapeAttribute(cell(node.id))}" value="${escapeAttribute(value)}" style="${style}" vertex="1" parent="1">`,
        `          <mxGeometry x="${Math.round(at.x)}" y="${Math.round(at.y)}" width="${Math.round(width)}" height="${Math.round(height)}" as="geometry" />`,
        '        </mxCell>',
        ...rows.flatMap((row, index) => [
          `        <mxCell id="${escapeAttribute(`${cell(node.id)}-row-${index + 1}`)}" value="${escapeAttribute(escapeHtml(row))}" style="text;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;${sketch}" vertex="1" parent="${escapeAttribute(cell(node.id))}">`,
          `          <mxGeometry y="${ROW_HEIGHT * (index + 1)}" width="${Math.round(width)}" height="${ROW_HEIGHT}" as="geometry" />`,
          '        </mxCell>',
        ]),
      ]
    })

  const lineStyle =
    document.lines === 'curved'
      ? 'curved=1;'
      : document.lines === 'straight'
        ? ''
        : 'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;'
  const arrows = document.edges.flatMap((edge) => [
    `        <mxCell id="${escapeAttribute(`e-${edge.source}-${edge.target}`)}" value="${escapeAttribute(escapeHtml(edge.label ?? ''))}" style="${lineStyle}html=1;${edge.dashed ? 'dashed=1;' : ''}${edge.both ? 'startArrow=classic;' : ''}${sketch}" edge="1" parent="1" source="${escapeAttribute(cell(edge.source))}" target="${escapeAttribute(cell(edge.target))}">`,
    '          <mxGeometry relative="1" as="geometry" />',
    '        </mxCell>',
  ])

  return [
    '<mxfile host="isketch" type="device">',
    `  <diagram id="isketch" name="${escapeAttribute(document.title ?? '')}">`,
    '    <mxGraphModel grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" math="0" shadow="0">',
    '      <root>',
    '        <mxCell id="0" />',
    '        <mxCell id="1" parent="0" />',
    ...shapes,
    ...arrows,
    '      </root>',
    '    </mxGraphModel>',
    '  </diagram>',
    '</mxfile>',
    '',
  ].join('\n')
}
