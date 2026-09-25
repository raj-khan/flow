/**
 * Builds the pages written for AI readers and the crawlers that follow them:
 * /llms.txt and /llms-full.txt from their templates, and /docs/format from
 * format.template.html with the real examples inlined (their text, and the
 * share hash that opens one in the editor). Run with `npm run docs`; the
 * outputs in public/ are committed.
 */
import { copyFile, readFile, writeFile } from 'node:fs/promises'

import { parseFlow } from '../src/domain/flowText.js'
import { encodeShare } from '../src/domain/shareLink.js'

const siteUrl = (process.env.VITE_SITE_URL ?? 'https://isketch.online').replace(/\/+$/, '')
const docsDir = new URL('../docs/', import.meta.url)
const publicDir = new URL('../public/', import.meta.url)

const architecture = await readFile(
  new URL('../examples/architecture.flow', import.meta.url),
  'utf8',
)
const signup = await readFile(new URL('../examples/signup.flow', import.meta.url), 'utf8')
const { document } = parseFlow(architecture)
const hash = (await encodeShare(document)).slice(1)

const escapeHtml = (text) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)

await writeFile(
  new URL('llms.txt', publicDir),
  (await readFile(new URL('llms.template.txt', docsDir), 'utf8')).replaceAll(
    'https://isketch.online',
    siteUrl,
  ),
)
await writeFile(
  new URL('llms-full.txt', publicDir),
  (await readFile(new URL('llms-full.template.txt', docsDir), 'utf8')).replaceAll(
    'https://isketch.online',
    siteUrl,
  ),
)
await writeFile(
  new URL('docs/format/index.html', publicDir),
  (await readFile(new URL('format.template.html', docsDir), 'utf8'))
    .replaceAll('%SITE_URL%', siteUrl)
    .replaceAll('%ARCHITECTURE_FLOW%', escapeHtml(architecture))
    .replaceAll('%SIGNUP_FLOW%', escapeHtml(signup))
    .replaceAll('%TRY_HASH%', hash),
)
await copyFile(
  new URL('../examples/signup.svg', import.meta.url),
  new URL('signup-diagram.svg', publicDir),
)

console.log(`llms.txt, llms-full.txt and docs/format for ${siteUrl}`)
