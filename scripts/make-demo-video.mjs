/**
 * Records the demo video, with sound: the real app, scripted, in one take.
 *
 *   1. Sketch by hand: boxes snap clean, drawn arrows connect them.
 *   2. Copy for AI: the brief an agent reads exactly.
 *   3. An agent edits the same diagram, as .flow text.
 *   4. A remote agent publishes a diagram over isketch's MCP endpoint, and the
 *      link opens for anyone, then opens in isketch to edit.
 *
 * The picture is Playwright's recording of the production build; the hosted
 * pages come from a real isketch server, so the link in scene 4 is one the
 * server made. https://isketch.online is routed to the two local servers, as
 * it is in production: /d, /mcp and /oembed to the server, the rest to the app.
 * Every effect is logged as it happens and synthesised into a soundtrack
 * (scripts/video/sound.mjs), then ffmpeg puts the two together.
 *
 *   npm run build
 *   ISKETCH_SERVER=http://localhost:3917 FFMPEG=/path/to/ffmpeg node scripts/make-demo-video.mjs out.mp4
 *
 * The server needs PUBLIC_URL and APP_URL set to https://isketch.online.
 */
import { spawn, spawnSync } from 'node:child_process'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { chromium } from '@playwright/test'

import { serialiseFlow } from '../src/domain/flowText.js'
import { installOverlay } from './video/overlay.js'
import { writeSoundtrack } from './video/sound.mjs'

const OUT = resolve(process.argv[2] ?? 'isketch-demo.mp4')
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg'
const API = (process.env.ISKETCH_SERVER ?? 'http://localhost:3917').replace(/\/+$/, '')
const PORT = 4189
const APP = `http://localhost:${PORT}`
const SITE = 'https://isketch.online'
const SIZE = { width: 1280, height: 720 }

/** @type {import('./video/sound.mjs').Cue[]} */
const cues = []
let t0 = 0
const cue = (name, extra = {}) => cues.push({ at: Date.now() - t0, name, ...extra })
const pause = (ms) => new Promise((done) => setTimeout(done, ms))

// Vite itself, not through npx, so stopping it at the end stops the server.
const preview = spawn(
  'node_modules/.bin/vite',
  ['preview', '--port', String(PORT), '--strictPort'],
  {
    stdio: 'ignore',
  },
)
const browser = await chromium.launch()
const take = await mkdtemp(join(tmpdir(), 'isketch-video-'))
/** @type {import('@playwright/test').Page | undefined} */
let shown

try {
  await waitUntil(`${APP}/new`)
  await waitUntil(`${API}/mcp`, 'POST')

  const context = await browser.newContext({
    viewport: SIZE,
    deviceScaleFactor: 1,
    recordVideo: { dir: take, size: SIZE },
    serviceWorkers: 'block',
    permissions: ['clipboard-read', 'clipboard-write'],
  })
  await context.route(`${SITE}/**`, async (route) => {
    const url = new URL(route.request().url())
    const server = /^\/(d\/|mcp|oembed)/.test(url.pathname) ? API : APP
    const response = await route.fetch({ url: `${server}${url.pathname}${url.search}` })
    await route.fulfill({ response })
  })
  await context.addInitScript(installOverlay)

  const page = await context.newPage()
  shown = page
  t0 = Date.now()

  // A clean, blank diagram, with the pen and its settings at their defaults.
  await page.goto(`${SITE}/new`)
  await page.evaluate(() => {
    localStorage.clear()
    // The picture is the diagram; the minimap would only repeat it, small.
    localStorage.setItem('flow:minimap', 'off')
    localStorage.setItem(
      'flow:document',
      JSON.stringify({ version: 3, title: 'Checkout', nodes: [], edges: [] }),
    )
  })
  await page.reload()
  await page.getByTestId('blank-hint').waitFor()

  // ── Title ────────────────────────────────────────────────────────────────
  await page.evaluate(() =>
    window.clip.card(
      `<div class="mark">i<span>sketch</span></div><div class="line">Sketch it. Hand it to your agent.</div><div class="small">Diagrams your coding agent reads exactly, not guesses from a screenshot.</div>`,
    ),
  )
  await pause(500)
  const begin = Date.now() - t0
  cue('title')
  await pause(3200)
  cue('whoosh')
  await page.evaluate(() => window.clip.uncard())
  await pause(700)

  // ── 1 · Sketch ───────────────────────────────────────────────────────────
  await page.evaluate(() => window.clip.caption(1, 'Sketch the idea by hand', 'boxes snap clean'))
  await pause(900)
  await clickAt(page, page.getByRole('button', { name: 'Pen', exact: true }))
  await pause(500)

  await drawBox(page, 110, 205, 230, 112)
  await name(page, 'Web app')
  await drawBox(page, 530, 205, 230, 112)
  await name(page, 'API')
  await drawBox(page, 950, 205, 230, 112)
  await name(page, 'Payments')

  await page.evaluate(() => window.clip.caption(1, 'Draw an arrow', 'it becomes a connection'))
  await drawArrow(page, [300, 262], [565, 266])
  await pause(500)
  await drawArrow(page, [720, 262], [985, 266])
  await pause(500)
  await page.evaluate(() => window.clip.caption(1, 'Arrow into open space', 'adds the next step'))
  await drawArrow(page, [645, 300], [648, 452])
  await name(page, 'Orders DB')
  await pause(300)

  // Colour what matters.
  await page.keyboard.press('Escape')
  await pause(300)
  await page.evaluate(() => window.clip.caption(1, 'Colour what matters'))
  await clickAt(page, page.locator('.vue-flow__node').nth(2), { modifiers: ['Shift'] })
  const selection = page.getByRole('toolbar', { name: 'Selection' })
  await clickAt(page, selection.getByRole('radio', { name: 'Violet' }))
  await pause(500)
  // A click on empty canvas lets go of it.
  await page.mouse.move(420, 600, { steps: 14 })
  await page.mouse.click(420, 600)
  cue('click')
  await pause(300)
  await clickAt(page, page.locator('.vue-flow__node').nth(3), { modifiers: ['Shift'] })
  await clickAt(page, selection.getByRole('radio', { name: 'Green' }))
  await pause(400)
  await page.keyboard.press('Escape')
  await page.mouse.move(300, 560, { steps: 12 })
  await pause(900)

  // ── 2 · Copy for AI ──────────────────────────────────────────────────────
  cue('whoosh')
  await page.evaluate(() =>
    window.clip.caption(2, 'Copy for AI', 'a brief your agent reads exactly'),
  )
  await pause(900)
  await clickAt(page, page.getByRole('button', { name: 'Copy for AI' }))
  cue('chime')
  await pause(500)
  const brief = await page.evaluate(() => navigator.clipboard.readText())
  await page.evaluate(() => window.clip.panel('right', 'Clipboard', 'brief.md'))
  const briefLines = brief
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('```'))
    .slice(0, 15)
  for (const line of briefLines) {
    await page.evaluate((text) => {
      window.clip.line(text.startsWith('#') ? 'you' : 'out', '')
      window.clip.type(text.replace(/^#+\s*/, ''))
    }, line)
    cue('key')
    await pause(150)
  }
  await pause(2400)
  await page.evaluate(() => window.clip.unpanel())
  await pause(500)

  // ── 3 · An agent edits the same diagram ──────────────────────────────────
  cue('whoosh')
  await page.evaluate(() =>
    window.clip.caption(3, 'Your agent builds from it', 'and edits the same diagram, as text'),
  )
  await page.evaluate(() => window.clip.panel('left', 'Claude Code', '~/shop'))
  await pause(600)
  await typeLine(page, 'you', 'Build the checkout from this. Payments must be idempotent.')
  await pause(500)
  await typeLine(page, 'tool', 'Read checkout.flow', 12)
  await typeLine(page, 'out', '4 shapes, 3 connections, 0 notes', 8)
  await pause(400)
  await typeLine(
    page,
    'say',
    'Building it. The design needs a webhook queue, so I am adding it to the diagram too.',
    14,
  )
  await typeLine(page, 'tool', 'Edit checkout.flow', 12)
  await typeLine(
    page,
    'out',
    '+ queue = process "Webhook queue"\n+ payments --> queue : events\n+ payments note: idempotency key on every charge',
    8,
  )
  await pause(300)

  // The edit lands through the text pane: the diagram is its .flow text.
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('flow:document')))
  const payments = before.nodes.find((node) => node.name === 'Payments')
  const edited = {
    ...before,
    nodes: [
      ...before.nodes.map((node) =>
        node.id === payments.id
          ? { ...node, data: { ...node.data, notes: 'Idempotency key on every charge' } }
          : node,
      ),
      {
        id: 'queue',
        type: 'process',
        name: 'Webhook queue',
        data: { description: '', color: 'pink' },
        position: { x: payments.position.x, y: payments.position.y + 248 },
        size: { ...payments.size },
      },
    ],
    edges: [
      ...before.edges,
      {
        id: `e-${payments.id}-queue`,
        source: payments.id,
        target: 'queue',
        label: 'events',
        dashed: true,
      },
    ],
  }
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await page.getByRole('menu').getByRole('menuitemcheckbox', { name: 'Edit as text' }).click()
  const text = page.getByLabel('Diagram as .flow text')
  await text.fill(serialiseFlow(edited))
  await pause(700)
  await page.getByRole('button', { name: 'Close text' }).click()
  cue('snap')
  await typeLine(page, 'ok', '✓ Diagram updated. Building the queue consumer next.', 10)
  await pause(1600)
  await page.evaluate(() => window.clip.unpanel())
  await page.mouse.move(900, 560, { steps: 14 })
  await pause(2200)

  // ── 4 · A remote agent publishes by URL ──────────────────────────────────
  cue('whoosh')
  await page.evaluate(() =>
    window.clip.caption(4, 'Agents publish diagrams by URL', 'over the isketch MCP server'),
  )
  await page.evaluate(() => window.clip.panel('right', 'Claude', 'connector: isketch.online/mcp'))
  await pause(600)
  await typeLine(page, 'you', 'Draw our checkout as a diagram the team can open.')
  await pause(400)
  await typeLine(page, 'tool', 'isketch · publish_diagram', 12)

  const flow = serialiseFlow(
    await page.evaluate(() => JSON.parse(localStorage.getItem('flow:document'))),
  )
  const published = await publish(flow)
  const link = /Published at (\S+)/.exec(published)?.[1]
  if (!link) throw new Error(`The server did not publish: ${published}`)
  await typeLine(page, 'out', `Published at ${link}`, 6)
  cue('chime')
  await page.evaluate((url) => {
    window.clip.line(
      'say',
      `Here it is: <a class="clip-link" href="${url}">${url.replace('https://', '')}</a>`,
    )
  }, link)
  await pause(1500)

  // Anyone opens the link.
  const anchor = page.locator('.clip-link')
  const box = await anchor.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 24 })
  await pause(250)
  await page.mouse.down()
  cue('click')
  await page.mouse.up()
  cue('whoosh')
  await page.goto(link)
  await page.evaluate((url) => {
    window.clip.bar(url)
    window.clip.caption(4, 'Anyone opens the link and sees it', 'people and agents alike')
  }, link)
  await page.mouse.move(640, 400)
  await pause(3000)
  for (let step = 0; step < 14; step += 1) {
    await page.mouse.wheel(0, 40)
    await pause(60)
  }
  await pause(1800)
  for (let step = 0; step < 14; step += 1) {
    await page.mouse.wheel(0, -40)
    await pause(40)
  }
  await pause(600)

  // And opens it in isketch, to change it.
  const open = page.getByRole('link', { name: 'Open in isketch' })
  await clickAt(page, open, { navigate: true })
  await page.locator('.vue-flow__node').first().waitFor()
  await page.evaluate((url) => {
    window.clip.bar(url)
    window.clip.caption(4, 'Open it in isketch', 'edit, then hand it back')
  }, `${SITE}/flow`)
  await pause(3200)

  // ── End ──────────────────────────────────────────────────────────────────
  cue('title')
  await page.evaluate(() =>
    window.clip.card(
      `<div class="mark">i<span>sketch</span></div><div class="line">Sketch it. Hand it to your agent.</div><div class="small">Free and open source · works offline · Claude Code, Copilot, Cursor or any agent</div><div class="url">isketch.online</div>`,
    ),
  )
  await pause(4200)
  const end = Date.now() - t0

  await context.close()

  const [video] = (await readdir(take)).filter((file) => file.endsWith('.webm'))
  const sound = join(take, 'sound.wav')
  await writeSoundtrack(
    cues.map((each) => ({
      ...each,
      at: each.at - begin,
      ...(each.until === undefined ? {} : { until: each.until - begin }),
    })),
    end - begin,
    sound,
  )

  const encoded = spawnSync(
    FFMPEG,
    [
      '-y',
      '-loglevel',
      'error',
      '-ss',
      (begin / 1000).toFixed(3),
      '-i',
      join(take, video),
      '-i',
      sound,
      '-t',
      ((end - begin) / 1000).toFixed(3),
      '-c:v',
      'libx264',
      '-preset',
      'slow',
      '-crf',
      '18',
      '-pix_fmt',
      'yuv420p',
      '-r',
      '30',
      // Web video loudness, whatever the mix came out at.
      '-af',
      'loudnorm=I=-16:TP=-1.5:LRA=11',
      '-c:a',
      'aac',
      '-ar',
      '48000',
      '-b:a',
      '192k',
      '-movflags',
      '+faststart',
      OUT,
    ],
    { stdio: 'inherit' },
  )
  if (encoded.status !== 0) throw new Error('ffmpeg failed')
  console.log(`${OUT} (${((end - begin) / 1000).toFixed(1)}s)`)
} catch (error) {
  // What the take looked like when it went wrong.
  await shown?.screenshot({ path: `${OUT}.failed.png` }).catch(() => {})
  throw error
} finally {
  await browser.close()
  preview.kill()
  await rm(take, { recursive: true, force: true })
}

/**
 * A rectangle drawn with the pen, a little wobbly and not quite closed, the
 * way a hand draws one. It snaps into a clean box.
 * @param {import('@playwright/test').Page} page
 */
async function drawBox(page, x, y, width, height) {
  const corners = [
    [x + 4, y + 2],
    [x + width, y + 5],
    [x + width - 3, y + height],
    [x - 2, y + height - 3],
    [x + 2, y + 10],
  ]
  await stroke(page, corners)
  cue('snap')
  await pause(350)
}

/**
 * A line with a > head at its tip, in one stroke.
 * @param {import('@playwright/test').Page} page
 * @param {number[]} from
 * @param {number[]} to
 */
async function drawArrow(page, from, to) {
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0])
  const barb = (side) => [
    to[0] - 22 * Math.cos(angle + side * 0.6),
    to[1] - 22 * Math.sin(angle + side * 0.6),
  ]
  await stroke(page, [from, to, barb(1), to, barb(-1)])
  cue('connect')
  await pause(300)
}

/**
 * Drags the pen through the points at a hand's pace, with a slight wobble.
 * @param {import('@playwright/test').Page} page
 * @param {number[][]} points
 */
async function stroke(page, points) {
  await page.mouse.move(points[0][0], points[0][1], { steps: 10 })
  await pause(120)
  await page.mouse.down()
  const start = Date.now() - t0
  for (let index = 1; index < points.length; index += 1) {
    const [ax, ay] = points[index - 1]
    const [bx, by] = points[index]
    const steps = Math.max(4, Math.round(Math.hypot(bx - ax, by - ay) / 14))
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps
      const wobble = Math.sin(t * Math.PI) * Math.sin(index * 1.7 + step) * 1.4
      await page.mouse.move(ax + (bx - ax) * t + wobble, ay + (by - ay) * t - wobble)
      await pause(9)
    }
  }
  await page.mouse.up()
  cues.push({ at: start, name: 'pen', until: Date.now() - t0 })
}

/**
 * Types a title into the shape just drawn, as the pen leaves it ready.
 * @param {import('@playwright/test').Page} page
 * @param {string} title
 */
async function name(page, title) {
  const field = page.getByRole('textbox', { name: 'Shape title' })
  await field.waitFor()
  await pause(200)
  await field.press('ControlOrMeta+a')
  for (const char of title) {
    await page.keyboard.type(char)
    cue('key')
    await pause(55 + Math.random() * 40)
  }
  await pause(150)
  await page.keyboard.press('Enter')
  cue('key')
  await pause(400)
}

/**
 * A new line in the agent's panel, typed out.
 * @param {import('@playwright/test').Page} page
 * @param {string} kind you, say, tool, out or ok
 * @param {string} text
 * @param {number} [every] milliseconds per character
 */
async function typeLine(page, kind, text, every = 32) {
  await page.evaluate((kind) => window.clip.line(kind), kind)
  for (const [index, char] of [...text].entries()) {
    await page.evaluate((char) => window.clip.type(char), char)
    if (kind === 'you' && char !== ' ') cue('key')
    else if (index % 6 === 0 && kind !== 'out') cue('key')
    await pause(every)
  }
  await pause(250)
}

/**
 * Glides the cursor to an element and clicks it.
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} target
 * @param {{ modifiers?: ('Shift')[], navigate?: boolean }} [options]
 */
async function clickAt(page, target, { modifiers = [], navigate = false } = {}) {
  const box = await target.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 22 })
  await pause(180)
  for (const key of modifiers) await page.keyboard.down(key)
  cue('click')
  if (navigate) await Promise.all([page.waitForEvent('load'), target.click({ modifiers })])
  else {
    await page.mouse.down()
    await page.mouse.up()
  }
  for (const key of modifiers) await page.keyboard.up(key)
  await pause(250)
}

/**
 * The remote agent's call: publish_diagram on the isketch MCP server.
 * @param {string} text
 */
async function publish(text) {
  const response = await fetch(`${API}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'publish_diagram', arguments: { text } },
    }),
  })
  const body = await response.json()
  return body.result?.content?.[0]?.text ?? JSON.stringify(body)
}

/** @param {string} url @param {string} [method] */
async function waitUntil(url, method = 'GET') {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(url, { method })
      if (response.status < 500) return
    } catch {
      // Not up yet.
    }
    await pause(250)
  }
  throw new Error(`${url} never came up`)
}
