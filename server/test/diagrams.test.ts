import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import type { NestExpressApplication } from '@nestjs/platform-express'
import type pg from 'pg'

import { createApp } from '../src/app.js'
import { readConfig } from '../src/config.js'
import { openPool } from '../src/database.js'

/**
 * Against a real PostgreSQL: DATABASE_URL names an empty database, which the
 * tests clear before they start.
 */
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://postgres@localhost:5432/isketch_test'

const FLOW = [
  'title: Shop',
  'note: Use NestJS and PostgreSQL',
  '',
  'api = process "API" -- REST',
  'db = database "Orders"',
  'api -> db : SQL',
].join('\n')

let app: NestExpressApplication
let pool: pg.Pool
let base = ''

before(async () => {
  pool = await openPool(DATABASE_URL)
  await pool.query('TRUNCATE diagrams')
  app = await createApp(
    readConfig({
      DATABASE_URL,
      PUBLIC_URL: 'https://isketch.test',
      APP_URL: 'https://app.isketch.test',
      MAX_BYTES: '2000',
    }),
    pool,
  )
  await app.listen(0)
  base = await app.getUrl()
})

after(async () => {
  await app.close()
  await pool.end()
})

const post = (body: string, type = 'text/plain') =>
  fetch(`${base}/api/diagrams`, { method: 'POST', headers: { 'content-type': type }, body })

async function publish() {
  const response = await post(FLOW)
  assert.equal(response.status, 201)
  return (await response.json()) as { id: string; url: string; editToken: string; revision: number }
}

describe('publishing', () => {
  it('stores .flow text and returns a public link and an edit token', async () => {
    const published = await publish()

    assert.match(published.id, /^[A-Za-z0-9]{14}$/)
    assert.equal(published.url, `https://isketch.test/d/${published.id}`)
    assert.equal(published.revision, 1)
    assert.ok(published.editToken.length >= 40)

    const { rows } = await pool.query('SELECT edit_hash FROM diagrams WHERE id = $1', [
      published.id,
    ])
    assert.notEqual(rows[0].edit_hash, published.editToken, 'the token is kept only as a hash')
  })

  it('takes JSON too, and refuses text with errors, saying where', async () => {
    assert.equal((await post(JSON.stringify({ text: FLOW }), 'application/json')).status, 201)

    const bad = await post('api = process "API"\nb = hexagon "B"')
    assert.equal(bad.status, 422)
    const body = (await bad.json()) as { errors: { line: number }[] }
    assert.equal(body.errors[0].line, 2)
  })

  it('refuses a diagram bigger than the limit, and an empty one', async () => {
    assert.equal((await post(`${FLOW}\n# ${'x'.repeat(3000)}`)).status, 413)
    assert.equal((await post('   ')).status, 422)
  })
})

describe('reading a link', () => {
  it('serves the brief, the source, the drawing and the document', async () => {
    const { id } = await publish()

    const markdown = await fetch(`${base}/d/${id}.md`)
    assert.match(markdown.headers.get('content-type') ?? '', /^text\/markdown/)
    const brief = await markdown.text()
    assert.match(brief, /^# Shop\n/)
    assert.match(brief, /- \*\*API\*\* → \*\*Orders\*\*: SQL/)
    assert.match(brief, /- Use NestJS and PostgreSQL/)

    assert.match(await (await fetch(`${base}/d/${id}.flow`)).text(), /api -> db : SQL/)
    assert.match(await (await fetch(`${base}/d/${id}.svg`)).text(), /^<svg /)
    const json = (await (await fetch(`${base}/d/${id}.json`)).json()) as {
      document: { nodes: unknown[] }
    }
    assert.equal(json.document.nodes.length, 2)
  })

  it('opens as a page that carries the brief as text, for AI fetchers', async () => {
    const { id } = await publish()
    const page = await fetch(`${base}/d/${id}`)
    const html = await page.text()

    assert.match(page.headers.get('content-type') ?? '', /^text\/html/)
    assert.match(html, /<title>Shop · isketch<\/title>/)
    assert.match(html, /\*\*API\*\* → \*\*Orders\*\*: SQL/)
    assert.match(html, /href="https:\/\/app\.isketch\.test\/flow#flow=z[\w-]+"/)
    assert.equal(page.headers.get('x-robots-tag'), 'noindex')
  })

  it('is its own preview: og tags name the diagram, and the PNG is the drawing', async () => {
    const { id, editToken } = await publish()

    const page = await fetch(`${base}/d/${id}`)
    const html = await page.text()
    assert.match(html, /<meta property="og:title" content="Shop · isketch">/)
    assert.match(
      html,
      /<meta property="og:description" content="A design sketched in isketch: 2 shapes and 1 connection\./,
    )
    assert.match(
      html,
      /<meta property="og:image" content="https:\/\/isketch\.test\/d\/[A-Za-z0-9]+\/og\.png">/,
    )
    assert.match(html, /<meta name="twitter:card" content="summary_large_image">/)

    const image = await fetch(`${base}/d/${id}/og.png`)
    assert.equal(image.status, 200)
    assert.match(image.headers.get('content-type') ?? '', /^image\/png/)
    const etag = image.headers.get('etag') ?? ''
    assert.match(etag, /-1"$/)
    assert.match(image.headers.get('cache-control') ?? '', /immutable/)

    const png = Buffer.from(await image.arrayBuffer())
    assert.equal(png.subarray(1, 4).toString(), 'PNG')
    assert.equal(png.readUInt32BE(16), 1200)
    assert.equal(png.readUInt32BE(20), 630)

    // A new revision is a new image.
    const updated = await fetch(`${base}/api/diagrams/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'text/plain', authorization: `Bearer ${editToken}` },
      body: FLOW.replace('"Orders"', '"Order store"'),
    })
    assert.equal(updated.status, 200)
    const after = await fetch(`${base}/d/${id}/og.png`)
    assert.notEqual(after.headers.get('etag'), etag)
  })

  it('says so for a link that does not exist, or a format it does not have', async () => {
    assert.equal((await fetch(`${base}/d/nothingHere1234`)).status, 404)
    const { id } = await publish()
    assert.equal((await fetch(`${base}/d/${id}.exe`)).status, 404)
  })
})

describe('changing a link', () => {
  it('updates with the edit token, and refuses without it', async () => {
    const { id, editToken } = await publish()
    const put = (token: string) =>
      fetch(`${base}/api/diagrams/${id}`, {
        method: 'PUT',
        headers: { 'content-type': 'text/plain', authorization: `Bearer ${token}` },
        body: FLOW.replace('"Orders"', '"Order store"'),
      })

    assert.equal((await put('wrong')).status, 403)
    const updated = await put(editToken)
    assert.equal(updated.status, 200)
    assert.equal(((await updated.json()) as { revision: number }).revision, 2)
    assert.match(await (await fetch(`${base}/d/${id}.flow`)).text(), /"Order store"/)
  })

  it('unpublishes with the edit token, after which the link is gone', async () => {
    const { id, editToken } = await publish()
    const remove = (token: string) =>
      fetch(`${base}/api/diagrams/${id}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${token}` },
      })

    assert.equal((await remove('')).status, 403)
    assert.equal((await remove(editToken)).status, 204)
    assert.equal((await fetch(`${base}/d/${id}.md`)).status, 404)
  })
})
