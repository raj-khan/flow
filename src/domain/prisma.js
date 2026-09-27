import { SHAPE } from './constants.js'
import { DOCUMENT_VERSION, edgeIdFor } from './document.js'
import { describeColumns } from './sql.js'

export const PRISMA_ORIGIN = 'prisma'

/** Prisma's own field types: a column, never a relation. */
const SCALARS = new Set([
  'String',
  'Boolean',
  'Int',
  'BigInt',
  'Float',
  'Decimal',
  'DateTime',
  'Json',
  'Bytes',
  'Unsupported',
])

const BLOCK = /^\s*(model|view|enum|type)\s+(\w+)\s*\{/
const FIELD = /^\s*(\w+)\s+(\w+)(\[\])?(\?)?(.*)$/

/**
 * A Prisma schema as an entity diagram, as SQL DDL is: each model a table
 * listing its fields, keys marked, and each relation with `fields` an edge
 * from the model that holds the key to the one it points at, labelled with it.
 * A relation listed on both sides with no key (many to many) is one two-way
 * edge. The other side of a one-to-many adds nothing.
 *
 * @param {string} text
 * @returns {{ document: import('./types.js').FlowDocument | null, warnings: { line: number, message: string }[] }}
 */
export function fromPrisma(text) {
  const lines = String(text ?? '')
    .replace(/\/\/.*$/gm, '')
    .split('\n')
  /** @type {{ line: number, message: string }[]} */
  const warnings = []

  /** @type {Map<string, { name: string, line: number, fields: { name: string, type: string, list: boolean, rest: string, line: number }[], ids: string[] }>} */
  const models = new Map()
  const enums = new Set()
  /** @type {{ name: string, line: number, fields: { name: string, type: string, list: boolean, rest: string, line: number }[], ids: string[] } | null} */
  let current = null
  let kind = ''

  lines.forEach((raw, index) => {
    const line = index + 1
    const block = BLOCK.exec(raw)
    if (block) {
      kind = block[1]
      if (kind === 'enum') enums.add(block[2])
      else {
        current = { name: block[2], line, fields: [], ids: [] }
        models.set(block[2], current)
      }
      return
    }
    if (/^\s*\}/.test(raw)) {
      current = null
      kind = ''
      return
    }
    if (!current || kind === 'enum') return

    const compound = /^\s*@@id\(\s*(?:fields:\s*)?\[([^\]]*)\]/.exec(raw)
    if (compound) {
      current.ids.push(
        ...compound[1]
          .split(',')
          .map((name) => name.trim())
          .filter(Boolean),
      )
      return
    }
    const field = FIELD.exec(raw)
    if (field) {
      current.fields.push({
        name: field[1],
        type: field[2],
        list: Boolean(field[3]),
        rest: field[5],
        line,
      })
    }
  })

  if (!models.size) {
    return {
      document: null,
      warnings: [{ line: 1, message: 'No models here. Paste a schema.prisma, or open one.' }],
    }
  }

  /** @type {import('./types.js').FlowEdge[]} */
  const edges = []
  const pairs = new Set()

  const nodes = [...models.values()].map((model) => {
    /** @type {{ name: string, pk: boolean, fk: boolean }[]} */
    const columns = []
    const keys = new Set()

    model.fields.forEach((field) => {
      const related = models.has(field.type)
      if (!related) {
        if (!SCALARS.has(field.type) && !enums.has(field.type)) {
          warnings.push({
            line: field.line,
            message: `${model.name}.${field.name} is a ${field.type}, which is not defined here.`,
          })
        }
        columns.push({
          name: field.name,
          pk: /@id\b/.test(field.rest) || model.ids.includes(field.name),
          fk: false,
        })
        return
      }

      const keyed = /@relation\([^)]*fields:\s*\[([^\]]*)\]/.exec(field.rest)
      if (keyed) {
        const held = keyed[1]
          .split(',')
          .map((name) => name.trim())
          .filter(Boolean)
        held.forEach((name) => keys.add(name))
        if (field.type === model.name) return
        const id = edgeIdFor(model.name, field.type)
        const existing = edges.find((edge) => edge.id === id)
        if (existing) existing.label = `${existing.label}, ${held.join(', ')}`
        else {
          edges.push({
            id,
            source: model.name,
            target: field.type,
            label: held.join(', '),
            origin: PRISMA_ORIGIN,
          })
        }
        return
      }

      // Lists on both sides and no key anywhere: an implicit many to many.
      const other = models.get(field.type)
      const back = other?.fields.find((each) => each.type === model.name)
      if (field.list && back?.list) {
        const pair = [model.name, field.type].sort().join(' ')
        if (pairs.has(pair) || field.type === model.name) return
        pairs.add(pair)
        edges.push({
          id: edgeIdFor(model.name, field.type),
          source: model.name,
          target: field.type,
          label: 'many to many',
          both: true,
          origin: PRISMA_ORIGIN,
        })
      }
    })

    columns.forEach((column) => (column.fk = keys.has(column.name)))
    return {
      id: model.name,
      type: SHAPE.TABLE,
      name: model.name,
      data: { description: describeColumns(columns), origin: PRISMA_ORIGIN },
    }
  })

  return { document: { version: DOCUMENT_VERSION, title: 'Database', nodes, edges }, warnings }
}
