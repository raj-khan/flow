/** A small repository, as a scan sees it. */
export const REPO = {
  'docker-compose.yml':
    'services:\n  api:\n    image: node:22\n    depends_on: [db]\n  db:\n    image: postgres:16\n',
  'db/migrations/001_users.sql': 'CREATE TABLE users (id uuid PRIMARY KEY, email text);',
  'db/migrations/002_orders.sql':
    'CREATE TABLE orders (id bigint PRIMARY KEY, user_id uuid REFERENCES users (id));',
  'prisma/schema.prisma':
    'model Account {\n  id Int @id\n  db String\n}\n\nmodel Session {\n  id Int @id\n  account Account @relation(fields: [accountId], references: [id])\n  accountId Int\n}\n',
  'api/openapi.yaml':
    "openapi: 3.1.0\ninfo: { title: Shop }\npaths:\n  /orders:\n    get:\n      tags: [Orders]\n      responses:\n        '200': { $ref: '#/components/schemas/Order' }\ncomponents:\n  schemas:\n    Order: { properties: { id: {} } }\n",
  'src/db/schema.ts':
    "import { pgTable, serial } from 'drizzle-orm/pg-core'\nexport const carts = pgTable('carts', {\n  id: serial('id').primaryKey(),\n})\n",
  'src/app.ts': "export const app = 'not a schema'\n",
  'package.json': '{ "name": "shop" }',
  'src/db/schema.test.ts':
    "import { pgTable } from 'drizzle-orm/pg-core'\nexport const fake = pgTable('fake', {})\n",
  'tests/fixtures/openapi.yaml': 'openapi: 3.1.0\n',
  'node_modules/lib/docker-compose.yml': 'services:\n  ignored: {}\n',
  'dist/openapi.json': '{ "openapi": "3.0.0" }',
}
