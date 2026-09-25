/**
 * Records the landing clip: the real app sketching, Copy for AI, then an
 * agent's answer building from the brief. One take, scripted, against the
 * production build on a local server; the webm is committed as
 * public/demo.webm. Run with `npm run clip`.
 */
import { spawn } from 'node:child_process'
import { cp, mkdtemp, readdir, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { chromium } from '@playwright/test'

const PORT = 4188
const nodeAt = (page, id) => page.locator(`.vue-flow__node[data-id="${id}"]`)

const server = spawn('npm', ['run', 'preview', '--', '--port', String(PORT)], {
  stdio: 'ignore',
  shell: process.platform === 'win32',
})
const browser = await chromium.launch()
const take = await mkdtemp(join(tmpdir(), 'isketch-clip-'))

try {
  await waitUntil(`http://localhost:${PORT}/new`)

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: take, size: { width: 1280, height: 720 } },
  })
  const page = await context.newPage()

  // 1 · Sketch: the starter diagram, a shape moved, a title renamed in place.
  await page.goto(`http://localhost:${PORT}/flow`)
  await nodeAt(page, 'b6a0c1').waitFor({ state: 'visible' })
  await pause(1200)

  const card = nodeAt(page, 'b6a0c1')
  const box = await card.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + 12)
  await page.mouse.down()
  await page.mouse.move(box.x - 180, box.y - 60, { steps: 24 })
  await page.mouse.up()
  await pause(600)

  await card.dblclick()
  await pause(400)
  await page.keyboard.type('Support bot', { delay: 45 })
  await page.keyboard.press('Enter')
  await pause(1000)

  // 2 · Hand it over: the brief goes onto the clipboard.
  await page.getByRole('button', { name: 'Copy for AI' }).click()
  await pause(1800)

  // 3 · The agent builds from it.
  await page.evaluate(addChat)
  await page.locator('.clip-chat').waitFor({ state: 'visible' })
  await pause(2600)
  await page.locator('.clip-code').waitFor({ state: 'visible' })
  await pause(2800)

  await context.close()
} finally {
  await browser.close()
  server.kill()
}

// The video file appears once the context closes; find it and move it in.
const files = await readdirRecursive(take)
const webm = files.find((file) => file.endsWith('.webm'))
if (webm) {
  await cp(webm, new URL('../public/demo.webm', import.meta.url).pathname)
  console.log(`public/demo.webm (${((await readFile(webm)).length / 1024 / 1024).toFixed(1)} MB)`)
}
await rm(take, { recursive: true, force: true })

/** @param {string} url */
async function waitUntil(url) {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Not up yet.
    }
    await pause(500)
  }
  throw new Error(`The preview server never came up on ${url}`)
}

function pause(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function readdirRecursive(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory() ? readdirRecursive(join(dir, entry.name)) : join(dir, entry.name),
    ),
  )
  return files.flat()
}

/** A chat overlay: the brief pasted to an agent, and its answer arriving. */
function addChat() {
  const style = document.createElement('style')
  style.textContent = `
    .clip-chat { position: fixed; right: 24px; bottom: 24px; width: 420px; max-width: 90vw;
      background: #0d1117; color: #e6edf3; border-radius: 12px; padding: 16px;
      font-family: ui-sans-serif, system-ui, sans-serif; font-size: 13px; line-height: 1.5;
      box-shadow: 0 12px 40px rgba(0,0,0,.45); animation: clip-in .5s ease; z-index: 9999 }
    @keyframes clip-in { from { opacity: 0; transform: translateY(12px) } }
    .clip-chat .who { font-weight: 700; margin-bottom: 4px; color: #a5b4fc }
    .clip-chat pre { margin: 8px 0 0; background: #161b22; border-radius: 8px; padding: 10px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px;
      white-space: pre-wrap; color: #c9d1d9 }
    .clip-code { display: none; margin-top: 10px }
    .clip-chat.typing .clip-code { display: block; animation: clip-in .4s ease }
    .clip-chat .dots::after { content: '…'; animation: clip-dots 1.2s steps(4) infinite }
    @keyframes clip-dots { 0% { content: '' } 25% { content: '.' } 50% { content: '..' } 75% { content: '...' } }
  `
  document.head.append(style)
  const chat = document.createElement('div')
  chat.className = 'clip-chat'
  chat.innerHTML = `
    <div class="who">You</div>
    <div>Build this. Here is the diagram as a brief:</div>
    <pre>**Support bot** → **Escalation** …

The brief itself stays on your clipboard —
in the real thing you paste all of it here.</pre>
    <div class="who" style="margin-top:12px">Claude</div>
    <div><span class="dots">Scaffolding the services the sketch names</span></div>
    <pre class="clip-code">const escalation = await page.getByRole('button', { name: 'Away' })
// support-bot/escalation.ts — from the sketch, not a guess</pre>
  `
  document.body.append(chat)
  setTimeout(() => chat.classList.add('typing'), 2400)
}
