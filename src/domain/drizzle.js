import { SHAPE } from './constants.js'
import { DOCUMENT_VERSION, edgeIdFor } from './document.js'
import { describeColumns } from './sql.js'

export const DRIZZLE_ORIGIN = 'drizzle'

/** `export const users = pgTable('users', {` and its MySQL and SQLite kin, or a schema's. */
const TABLE =
  /(?:export\s+)?const\s+(\w+)\s*=\s*(?:\w+\.)?(?:pg|mysql|sqlite)?[Tt]able\s*\(\s*(['"`])([^'"`]+)\2\s*,\s*\{/g
/** `.references(() => users.id)` */
const REFERENCES = /\.references\s*\(\s*(?:\(\s*\)\s*(?::\s*\w+\s*)?=>\s*)?(\w+)\.(\w+)/
/** `foreignKey({ columns: [t.authorId], foreignColumns: [users.id] })` */
const FOREIGN_KEY =
  /foreignKey\s*\(\s*\{[^}]*columns:\s*\[([^\]]*)\][^}]*foreignColumns:\s*\[\s*(\w+)\.\w+/g
/** `primaryKey({ columns: [t.userId, t.postId] })` or `primaryKey(t.userId, t.postId)` */
const PRIMARY_KEY = /primaryKey\s*\(\s*(?:\{[^}]*columns:\s*\[([^\]]*)\][^}]*\}|([^)]*))\)/g
/** `one(users, { fields: [posts.authorId], references: [users.id] })` in relations() */
const ONE = /one\s*\(\s*(\w+)\s*,\s*\{[^}]*fields:\s*\[\s*(\w+)\.(\w+)/g

/**
 * The text between a `{` at `start` and its partner, strings and comments
 * skipped, so a column's options cannot end the table early.
 * @param {string} text
 * @param {number} start index of the opening brace
 */
function block(text, start) {
  let depth = 0
  for (let at = start; at < text.length; at += 1) {
    const char = text[at]
    if (char === '"' || char === "'" || char === '`') {
      const end = text.indexOf(char, at + 1)
      at = end === -1 ? text.length : end
    } else if (char === '{' || char === '(' || char === '[') depth += 1
    else if (char === '}' || char === ')' || char === ']') {
      depth -= 1
      if (depth === 0) return { inside: text.slice(start + 1, at), end: at }
    }
  }
  return { inside: text.slice(start + 1), end: text.length }
}

/** Top-level entries of an object literal's body. @param {string} inside */
function entries(inside) {
  const parts = []
  let depth = 0
  let from = 0
  for (let at = 0; at < inside.length; at += 1) {
    const char = inside[at]
    if (char === '"' || char === "'" || char === '`') {
      const end = inside.indexOf(char, at + 1)
      at = end === -1 ? inside.length : end
    } else if ('{(['.includes(char)) depth += 1
    else if ('})]'.includes(char)) depth -= 1
    else if (char === ',' && depth === 0) {
      parts.push(inside.slice(from, at))
      from = at + 1
    }
  }
  parts.push(inside.slice(from))
  return parts.map((part) => part.trim()).filter(Boolean)
}

/** The property names in `[t.a, table.b]`. @param {string} list */
const fieldsOf = (list) =>
  String(list ?? '')
    .split(',')
    .map((item) => item.trim().split('.').pop() ?? '')
    .filter(Boolean)

/** @param {string} text @param {number} index */
const lineAt = (text, index) => text.slice(0, index).split('\n').length

/**
 * Drizzle table definitions as an entity diagram, as SQL DDL is: each table
 * listing its columns, keys marked, and each reference an edge from the table
 * that holds it to the one it points at, labelled with the column. References
 * come from `.references()`, `foreignKey()` and `one(..., { fields })`.
 *
 * @param {string} text
 * @returns {{ document: import('./types.js').FlowDocument | null, warnings: { line: number, message: string }[] }}
 */
export function fromDrizzle(text) {
  const source = String(text ?? '').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (comment) =>
    comment.replace(/[^\n]/g, ' '),
  )
  /** @type {{ line: number, message: string }[]} */
  const warnings = []

  /** @type {Map<string, { name: string, columns: { key: string, name: string, pk: boolean, fk: boolean }[] }>} */
  const tables = new Map()
  /** @type {{ from: string, column: string, to: string, line: number }[]} */
  const references = []

  for (const match of source.matchAll(TABLE)) {
    const [whole, variable, , name] = match
    const opening = (match.index ?? 0) + whole.length - 1
    const { inside, end } = block(source, opening)
    const columns = entries(inside).flatMap((entry) => {
      const found = /^(?:(\w+)|(['"`])([^'"`]+)\2)\s*:\s*(.*)$/s.exec(entry)
      if (!found) return []
      const key = found[1] ?? found[3]
      const expression = found[4]
      const named = /^\w+\s*\(\s*(['"`])([^'"`]+)\1/.exec(expression)
      const reference = REFERENCES.exec(expression)
      if (reference) {
        references.push({
          from: variable,
          column: key,
          to: reference[1],
          line: lineAt(source, (match.index ?? 0) + whole.length),
        })
      }
      return [{ key, name: named?.[2] ?? key, pk: /\.primaryKey\s*\(/.test(expression), fk: false }]
    })

    // Constraints come after the columns: `(t) => ({ ... })` or `(t) => [ ... ]`.
    const call = block(source, (match.index ?? 0) + whole.lastIndexOf('('))
    const after = source.slice(end + 1, call.end)
    for (const key of after.matchAll(PRIMARY_KEY)) {
      fieldsOf(key[1] ?? key[2]).forEach((field) => {
        const column = columns.find((each) => each.key === field)
        if (column) column.pk = true
      })
    }
    for (const foreign of after.matchAll(FOREIGN_KEY)) {
      fieldsOf(foreign[1]).forEach((field) =>
        references.push({
          from: variable,
          column: field,
          to: foreign[2],
          line: lineAt(source, end),
        }),
      )
    }

    tables.set(variable, { name, columns })
  }

  if (!tables.size) {
    return {
      document: null,
      warnings: [
        { line: 1, message: 'No tables here. Paste a Drizzle schema, such as schema.ts.' },
      ],
    }
  }

  // `one(users, { fields: [posts.authorId] })` names the holder by its fields.
  for (const one of source.matchAll(ONE)) {
    references.push({
      from: one[2],
      column: one[3],
      to: one[1],
      line: lineAt(source, one.index ?? 0),
    })
  }

  /** @type {import('./types.js').FlowEdge[]} */
  const edges = []
  references.forEach(({ from, column, to, line }) => {
    const holder = tables.get(from)
    const target = tables.get(to)
    if (!holder || !target) {
      warnings.push({
        line,
        message: `${from}.${column} refers to ${to}, which is not defined here.`,
      })
      return
    }
    const marked = holder.columns.find((each) => each.key === column)
    if (marked) marked.fk = true
    if (from === to) return
    const id = edgeIdFor(from, to)
    const label = marked?.name ?? column
    const existing = edges.find((edge) => edge.id === id)
    if (!existing) edges.push({ id, source: from, target: to, label, origin: DRIZZLE_ORIGIN })
    else if (!existing.label?.split(', ').includes(label))
      existing.label = `${existing.label}, ${label}`
  })

  const nodes = [...tables.entries()].map(([variable, table]) => ({
    id: variable,
    type: SHAPE.TABLE,
    name: table.name,
    data: { description: describeColumns(table.columns), origin: DRIZZLE_ORIGIN },
  }))

  return { document: { version: DOCUMENT_VERSION, title: 'Database', nodes, edges }, warnings }
}
