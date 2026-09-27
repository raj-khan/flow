import { SHAPE } from './constants.js'
import { DOCUMENT_VERSION, edgeIdFor } from './document.js'

export const SQL_ORIGIN = 'sql'

/** How many columns a table's description lists before summarising the rest. */
const LISTED = 8

const IDENT = String.raw`(?:"[^"]+"|\x60[^\x60]+\x60|\[[^\]]+\]|[\w$]+)`
const QUALIFIED = String.raw`${IDENT}(?:\s*\.\s*${IDENT})*`
const CREATE_TABLE = new RegExp(
  String.raw`^create\s+(?:(?:global\s+|local\s+)?(?:temporary|temp)\s+)?(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?(${QUALIFIED})\s*\(`,
  'i',
)
const ALTER_FOREIGN_KEY = new RegExp(
  String.raw`^alter\s+table\s+(?:only\s+)?(?:if\s+exists\s+)?(${QUALIFIED})\s+add\s+(?:constraint\s+${IDENT}\s+)?foreign\s+key\s*\(([^)]*)\)\s*references\s+(${QUALIFIED})`,
  'i',
)
const INLINE_REFERENCE = new RegExp(String.raw`\breferences\s+(${QUALIFIED})`, 'i')
const TABLE_FOREIGN_KEY = new RegExp(
  String.raw`^(?:constraint\s+${IDENT}\s+)?foreign\s+key\s*\(([^)]*)\)\s*references\s+(${QUALIFIED})`,
  'i',
)
const TABLE_PRIMARY_KEY = new RegExp(
  String.raw`^(?:constraint\s+${IDENT}\s+)?primary\s+key\s*\(([^)]*)\)`,
  'i',
)
const OTHER_CONSTRAINT = /^(constraint|unique|check|exclude|index|key|fulltext|spatial)\b/i

/**
 * SQL DDL as an entity diagram: each `CREATE TABLE` a table listing its
 * columns, primary keys marked, and each foreign key an edge from the table
 * that holds it to the table it points at, labelled with the column.
 *
 * @param {string} text
 * @returns {{ document: import('./types.js').FlowDocument | null, warnings: { line: number, message: string }[] }}
 */
export function fromSql(text) {
  const source = String(text ?? '')
  const clean = stripComments(source)

  /** @type {Map<string, { id: string, name: string, columns: { name: string, pk: boolean, fk: boolean }[], line: number }>} */
  const tables = new Map()
  /** @type {{ from: string, to: string, column: string, line: number }[]} */
  const references = []

  statements(clean).forEach(({ body, offset }) => {
    const line = lineAt(source, offset)

    const create = CREATE_TABLE.exec(body)
    if (create) {
      const name = lastPart(create[1])
      const inside = body.slice(create[0].length, matchingParen(body, create[0].length - 1))
      const table = {
        id: `table-${slug(name)}`,
        name,
        columns: readColumns(inside, name, line, references),
        line,
      }
      tables.set(name.toLowerCase(), table)
      return
    }

    const alter = ALTER_FOREIGN_KEY.exec(body)
    if (alter) {
      unquoteList(alter[2]).forEach((column) =>
        references.push({ from: lastPart(alter[1]), to: lastPart(alter[3]), column, line }),
      )
    }
  })

  if (!tables.size) {
    return {
      document: null,
      warnings: [{ line: 1, message: 'No CREATE TABLE statements, so there is nothing to draw.' }],
    }
  }

  /** @type {{ line: number, message: string }[]} */
  const warnings = []
  /** @type {import('./types.js').FlowEdge[]} */
  const edges = []

  references.forEach(({ from, to, column, line }) => {
    const source = tables.get(from.toLowerCase())
    const target = tables.get(to.toLowerCase())
    if (!source || !target) {
      warnings.push({
        line,
        message: `${from}.${column} refers to ${to}, which is not defined here.`,
      })
      return
    }

    const marked = source.columns.find((candidate) => candidate.name === column)
    if (marked) marked.fk = true
    if (source === target) return

    const id = edgeIdFor(source.id, target.id)
    const existing = edges.find((edge) => edge.id === id)
    if (existing) existing.label = `${existing.label}, ${column}`
    else edges.push({ id, source: source.id, target: target.id, label: column, origin: SQL_ORIGIN })
  })

  const nodes = [...tables.values()].map((table) => ({
    id: table.id,
    type: SHAPE.TABLE,
    name: table.name,
    data: { description: describeColumns(table.columns), origin: SQL_ORIGIN },
  }))

  return { document: { version: DOCUMENT_VERSION, title: 'Database', nodes, edges }, warnings }
}

/**
 * @param {string} inside the text between a CREATE TABLE's parentheses
 * @param {string} table
 * @param {number} line
 * @param {{ from: string, to: string, column: string, line: number }[]} references
 */
function readColumns(inside, table, line, references) {
  /** @type {{ name: string, pk: boolean, fk: boolean }[]} */
  const columns = []
  /** @type {Set<string>} */
  const primary = new Set()

  splitTopLevel(inside).forEach((part) => {
    const definition = part.trim()
    if (!definition) return

    const primaryKey = TABLE_PRIMARY_KEY.exec(definition)
    if (primaryKey) {
      unquoteList(primaryKey[1]).forEach((column) => primary.add(column))
      return
    }

    const foreignKey = TABLE_FOREIGN_KEY.exec(definition)
    if (foreignKey) {
      unquoteList(foreignKey[1]).forEach((column) =>
        references.push({ from: table, to: lastPart(foreignKey[2]), column, line }),
      )
      return
    }

    if (OTHER_CONSTRAINT.test(definition)) return

    const name = unquote(new RegExp(`^${IDENT}`).exec(definition)?.[0] ?? '')
    if (!name) return
    if (/\bprimary\s+key\b/i.test(definition)) primary.add(name)

    const inline = INLINE_REFERENCE.exec(definition)
    if (inline) references.push({ from: table, to: lastPart(inline[1]), column: name, line })

    columns.push({ name, pk: false, fk: false })
  })

  columns.forEach((column) => (column.pk = primary.has(column.name)))
  return columns
}

/**
 * A table's columns as its description, keys marked, shared by every schema
 * import so they all read the same.
 * @param {{ name: string, pk: boolean, fk: boolean }[]} columns
 */
export function describeColumns(columns) {
  const shown = columns
    .slice(0, LISTED)
    .map(({ name, pk, fk }) => `${name}${pk ? ' PK' : ''}${fk ? ' FK' : ''}`)
  const more = columns.length > LISTED ? `, and ${columns.length - LISTED} more` : ''
  return `${shown.join(', ')}${more}`
}

/**
 * Blanked rather than removed, so every offset, and so every line number, stays
 * where it was in the text that was pasted.
 * @param {string} text
 */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ' '))
    .replace(/--[^\n]*/g, (match) => ' '.repeat(match.length))
}

/**
 * Top level `;`-separated statements with where each starts.
 * @param {string} text
 * @returns {{ body: string, offset: number }[]}
 */
function statements(text) {
  /** @type {{ body: string, offset: number }[]} */
  const found = []
  let depth = 0
  let quote = ''
  let start = 0

  for (let index = 0; index <= text.length; index += 1) {
    const char = text[index]
    if (quote) {
      if (char === quote) quote = ''
    } else if (char === "'" || char === '"' || char === '`') {
      quote = char
    } else if (char === '(') {
      depth += 1
    } else if (char === ')') {
      depth -= 1
    } else if ((char === ';' && depth <= 0) || index === text.length) {
      const raw = text.slice(start, index)
      const lead = raw.length - raw.trimStart().length
      if (raw.trim()) found.push({ body: raw.trim(), offset: start + lead })
      start = index + 1
      depth = 0
    }
  }

  return found
}

/**
 * The index of the `)` closing the `(` at `open`.
 * @param {string} text @param {number} open
 */
function matchingParen(text, open) {
  let depth = 0
  for (let index = open; index < text.length; index += 1) {
    if (text[index] === '(') depth += 1
    else if (text[index] === ')' && --depth === 0) return index
  }
  return text.length
}

/**
 * Commas inside a column's type, like `numeric(10, 2)`, do not split it.
 * @param {string} text
 */
function splitTopLevel(text) {
  /** @type {string[]} */
  const parts = []
  let depth = 0
  let start = 0
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '(') depth += 1
    else if (text[index] === ')') depth -= 1
    else if (text[index] === ',' && depth === 0) {
      parts.push(text.slice(start, index))
      start = index + 1
    }
  }
  parts.push(text.slice(start))
  return parts
}

/** @param {string} identifier */
const unquote = (identifier) => identifier.trim().replace(/^["`[](.*)["`\]]$/, '$1')

/** `public."Orders"` is `Orders`. */
/** @param {string} qualified */
const lastPart = (qualified) => unquote(qualified.split('.').pop() ?? qualified)

/** @param {string} list */
const unquoteList = (list) => list.split(',').map(unquote).filter(Boolean)

/** @param {string} name */
const slug = (name) => name.replace(/[^\w-]+/g, '_')

/** @param {string} text @param {number} offset */
const lineAt = (text, offset) => text.slice(0, offset).split('\n').length
