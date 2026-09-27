import { COMPOSE_ORIGIN, fromCompose } from './compose.js'
import { DRAWIO_ORIGIN, fromDrawio } from './drawio.js'
import { fromExcalidraw } from './excalidraw.js'
import { fromMermaid } from './mermaid.js'
import { fromOpenApi, OPENAPI_ORIGIN } from './openapi.js'
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
