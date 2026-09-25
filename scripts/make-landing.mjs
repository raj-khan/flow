/**
 * Fills landing.template.html into public/landing.html: the share hash of the
 * example the live canvas opens, and its brief for the Copy for AI block. Run
 * with `npm run landing` after changing the template or the example; the
 * result is committed, so a deploy serves a static file.
 */
import { readFile, writeFile } from 'node:fs/promises'

import { toBrief } from '../src/domain/brief.js'
import { parseFlow } from '../src/domain/flowText.js'
import { renderSvg } from '../src/domain/renderSvg.js'
import { encodeShare } from '../src/domain/shareLink.js'

const siteUrl = (process.env.VITE_SITE_URL ?? 'https://isketch.online').replace(/\/+$/, '')

const template = await readFile(new URL('../landing.template.html', import.meta.url), 'utf8')
const { document } = parseFlow(
  await readFile(new URL('../examples/architecture.flow', import.meta.url), 'utf8'),
)
const hash = (await encodeShare(document)).slice(1) // the iframe takes it after the #

const escapeHtml = (text) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)

await writeFile(
  new URL('../public/landing-diagram.svg', import.meta.url),
  renderSvg(document, { theme: 'light' }),
)
await writeFile(
  new URL('../public/landing.html', import.meta.url),
  template
    .replaceAll('%SITE_URL%', siteUrl)
    .replaceAll('%TRY_HASH%', hash)
    .replaceAll('%TRY_BRIEF%', escapeHtml(toBrief(document))),
)
console.log(
  `public/landing.html and landing-diagram.svg for ${siteUrl} (example: ${document.title})`,
)
