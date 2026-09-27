import { COMPOSE_ORIGIN, fromCompose } from './compose.js'
import { DRAWIO_ORIGIN, fromDrawio } from './drawio.js'
import { DRIZZLE_ORIGIN, fromDrizzle } from './drizzle.js'
import { fromExcalidraw } from './excalidraw.js'
import { fromMermaid } from './mermaid.js'
import { fromOpenApi, OPENAPI_ORIGIN } from './openapi.js'
import { fromPrisma, PRISMA_ORIGIN } from './prisma.js'
import { fromSql, SQL_ORIGIN } from './sql.js'

/**
 * @typedef {Object} ImportFormat
 * @property {string} id
 * @property {string} label
 * @property {string} accept          for the file picker
 * @property {string} placeholder
 * @property {string | null} origin   set when a re-import can update the diagram in place
 * @property {(text: string) => { document: import('./types.js').FlowDocument | null, warnings: { line: number, message: string }[] }} read
 */

/** Every format the Import dialog offers. Adding one is an entry here. */
/** @type {readonly ImportFormat[]} */
export const IMPORT_FORMATS = Object.freeze([
  {
    id: 'mermaid',
    label: 'Mermaid',
    accept: '.mmd,.mermaid,.md,.txt',
    placeholder: 'flowchart TD\n  A[Start] --> B{Ready?}\n  B -->|yes| C[Ship]',
    origin: null,
    read: fromMermaid,
  },
  {
    id: 'compose',
    label: 'docker-compose',
    accept: '.yml,.yaml',
    placeholder:
      'services:\n  api:\n    image: node:22\n    depends_on: [db]\n  db:\n    image: postgres:16',
    origin: COMPOSE_ORIGIN,
    read: fromCompose,
  },
  {
    id: 'openapi',
    label: 'OpenAPI',
    accept: '.yml,.yaml,.json',
    placeholder:
      "openapi: 3.1.0\ninfo: { title: Shop API }\npaths:\n  /orders:\n    get:\n      tags: [Orders]\n      responses:\n        '200': { $ref: '#/components/schemas/Order' }\ncomponents:\n  schemas:\n    Order: { properties: { id: {} } }",
    origin: OPENAPI_ORIGIN,
    read: fromOpenApi,
  },
  {
    id: 'sql',
    label: 'SQL',
    accept: '.sql,.ddl,.txt',
    placeholder:
      'CREATE TABLE customers (\n  id uuid PRIMARY KEY,\n  email text\n);\nCREATE TABLE orders (\n  id bigint PRIMARY KEY,\n  customer_id uuid REFERENCES customers (id)\n);',
    origin: SQL_ORIGIN,
    read: fromSql,
  },
  {
    id: 'prisma',
    label: 'Prisma',
    accept: '.prisma',
    placeholder:
      'model User {\n  id    Int    @id\n  posts Post[]\n}\n\nmodel Post {\n  id       Int  @id\n  author   User @relation(fields: [authorId], references: [id])\n  authorId Int\n}',
    origin: PRISMA_ORIGIN,
    read: fromPrisma,
  },
  {
    id: 'drizzle',
    label: 'Drizzle',
    accept: '.ts,.js,.mjs',
    placeholder:
      "export const users = pgTable('users', {\n  id: serial('id').primaryKey(),\n})\n\nexport const posts = pgTable('posts', {\n  id: serial('id').primaryKey(),\n  authorId: integer('author_id').references(() => users.id),\n})",
    origin: DRIZZLE_ORIGIN,
    read: fromDrizzle,
  },
  {
    id: 'drawio',
    label: 'draw.io',
    accept: '.drawio,.xml',
    placeholder:
      '<mxGraphModel><root>\n  <mxCell id="0"/><mxCell id="1" parent="0"/>\n  <mxCell id="a" value="API" style="rounded=1;" vertex="1" parent="1">\n    <mxGeometry x="0" y="0" width="120" height="60" as="geometry"/>\n  </mxCell>\n</root></mxGraphModel>',
    origin: DRAWIO_ORIGIN,
    read: fromDrawio,
  },
  {
    id: 'excalidraw',
    label: 'Excalidraw',
    accept: '.excalidraw,.json',
    placeholder:
      'Open a .excalidraw file, or select shapes in Excalidraw, copy them (Ctrl+C) and paste here.',
    origin: null,
    read: fromExcalidraw,
  },
])

/** @param {string} id */
export const importFormat = (id) => IMPORT_FORMATS.find((format) => format.id === id) ?? null

/**
 * Which import a file is, from its name and, where a name is shared, what is
 * in it. Null when it is none of them.
 * @param {string} fileName
 * @param {string} text
 * @returns {ImportFormat | null}
 */
export function detectFormat(fileName, text) {
  const name = fileName.toLowerCase()
  const byExtension = (/** @type {string} */ id) => importFormat(id)
  if (name.endsWith('.prisma')) return byExtension('prisma')
  if (name.endsWith('.sql') || name.endsWith('.ddl')) return byExtension('sql')
  if (name.endsWith('.drawio')) return byExtension('drawio')
  if (name.endsWith('.excalidraw')) return byExtension('excalidraw')
  if (/\.(mmd|mermaid)$/.test(name)) return byExtension('mermaid')
  if (/\.(ts|js|mjs)$/.test(name)) return byExtension('drizzle')
  if (/\.(ya?ml|json)$/.test(name)) {
    if (/^\s*\{[\s\S]*"type"\s*:\s*"excalidraw/.test(text)) return byExtension('excalidraw')
    if (/^\s*["']?(openapi|swagger)["']?\s*:/m.test(text)) return byExtension('openapi')
    if (/^\s*["']?services["']?\s*:/m.test(text)) return byExtension('compose')
    return null
  }
  if (name.endsWith('.xml')) return byExtension('drawio')
  return null
}
