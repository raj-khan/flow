/**
 * Renders the brand set from the one mark, public/favicon.svg:
 * og.png at 1200x630 (mark, wordmark, tagline, a real diagram drawn by the
 * app's own renderer), the icon PNGs (maskable ones padded to their safe
 * zone), and favicon.ico as PNG-in-ICO. Run with `npm run brand` when the mark
 * or the wording changes; the outputs are committed so a deploy needs no
 * browser. Chromium comes from Playwright, which the e2e suite already uses.
 */
import { readFile, writeFile } from 'node:fs/promises'

import { chromium } from '@playwright/test'

import { parseFlow } from '../src/domain/flowText.js'
import { renderSvg } from '../src/domain/renderSvg.js'

const siteUrl = (process.env.VITE_SITE_URL ?? 'https://isketch.online').replace(/\/+$/, '')
const publicDir = new URL('../public/', import.meta.url)
const favicon = await readFile(new URL('favicon.svg', publicDir), 'utf8')

const browser = await chromium.launch()
try {
  // One diagram, drawn as the app draws it, beside the loop it exists for.
  const { document } = parseFlow(
    await readFile(new URL('../examples/architecture.flow', import.meta.url), 'utf8'),
  )
  const diagram = renderSvg(document, { theme: 'light' })

  const og = await browser.newPage({ viewport: { width: 1200, height: 630 } })
  try {
    await og.setContent(ogPage(diagram), { waitUntil: 'load' })
    await og.screenshot({ path: new URL('og.png', publicDir).pathname })
    console.log('public/og.png 1200x630')
  } finally {
    await og.close()
  }

  for (const size of [32, 180, 192, 512]) {
    await icon(size, false)
  }
  // Maskable icons live inside a safe zone of the full square, on the dark
  // canvas colour, so a launcher mask never clips the mark.
  for (const size of [192, 512]) {
    await icon(size, true)
  }

  await writeFile(
    new URL('favicon.ico', publicDir),
    ico(await readFile(new URL('icon-32.png', publicDir))),
  )
  console.log('public/favicon.ico (32x32 PNG in an ICO wrapper)')
} finally {
  await browser.close()
}

/** @param {number} size @param {boolean} maskable */
async function icon(size, maskable) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  try {
    const scale = maskable ? 0.7 : 1
    await page.setContent(
      `<body style="margin:0">${maskable ? '<div style="position:fixed;inset:0;background:#0d1117"></div>' : ''}` +
        `<style>svg{width:100%;height:auto;display:block}</style>` +
        `<div style="position:fixed;inset:0;display:grid;place-items:center">` +
        `<div style="width:${scale * 100}%;aspect-ratio:48/46">${favicon}</div></div></body>`,
    )
    const name = maskable
      ? `icon-${size}-maskable.png`
      : size === 32
        ? 'icon-32.png'
        : size === 180
          ? 'apple-touch-icon.png'
          : `icon-${size}.png`
    await page.screenshot({
      path: new URL(name, publicDir).pathname,
      omitBackground: !maskable,
    })
    console.log(`public/${name} ${size}x${size}${maskable ? ' maskable' : ''}`)
  } finally {
    await page.close()
  }
}

/** A 32x32 PNG inside the ICO container; every current browser reads that. */
function ico(png) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // an icon
  header.writeUInt16LE(1, 4) // one image
  const entry = Buffer.alloc(16)
  entry.writeUInt8(32, 0) // width
  entry.writeUInt8(32, 1) // height
  entry.writeUInt8(0, 2) // no palette
  entry.writeUInt8(0, 3) // reserved
  entry.writeUInt16LE(1, 4) // colour planes
  entry.writeUInt16LE(32, 6) // bits per pixel
  entry.writeUInt32LE(png.length, 8)
  entry.writeUInt32LE(22, 12) // where the image starts
  return Buffer.concat([header, entry, png])
}

function ogPage(diagram) {
  return `<!doctype html><html><head><style>
    svg{display:block}
    .mark svg{width:100%;height:auto}
    .diagram svg{height:100%;width:auto;max-width:100%}
  </style></head><body style="margin:0">
  <div style="position:fixed;inset:0;display:grid;grid-template-columns:1fr 1.2fr;gap:48px;padding:64px;background:linear-gradient(120deg,#f4f5f8 0%,#ffffff 100%);font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;box-sizing:border-box">
    <div style="display:flex;flex-direction:column;justify-content:center;gap:28px">
      <div class="mark" style="width:112px">${favicon}</div>
      <h1 style="margin:0;font-size:76px;line-height:1.05;letter-spacing:-0.03em;color:#14181f">isketch</h1>
      <p style="margin:0;font-size:34px;line-height:1.3;color:#4f46e5;font-weight:600">sketch it, hand it to your agent</p>
      <p style="margin:0;font-size:21px;line-height:1.45;color:#64748b">Every sketch is also text an agent reads exactly, and can edit back.</p>
      <p style="margin:0;font-size:19px;color:#94a3b8">${siteUrl.replace('https://', '')}</p>
    </div>
    <div class="diagram" style="display:grid;place-items:center;height:502px">
      <div style="height:100%;filter:drop-shadow(0 8px 24px rgba(15,23,42,.12));border-radius:8px;overflow:hidden;background:#ffffff">${diagram}</div>
    </div>
  </div></body></html>`
}
