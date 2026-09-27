/**
 * Bundles the MCP server for the Claude Code plugin into one file with no
 * dependencies to install, plus the handwriting font beside it, so the plugin
 * works straight from a clone. Run with `npm run plugin` and commit the
 * result; CI checks it is up to date.
 */
import { copyFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'

import { build } from 'rolldown'

const out = new URL('../plugin/server/', import.meta.url)
await mkdir(out, { recursive: true })

await build({
  input: new URL('../bin/mcp-plugin.mjs', import.meta.url).pathname,
  platform: 'node',
  logLevel: 'warn',
  output: {
    file: new URL('isketch-mcp.mjs', out).pathname,
    format: 'esm',
    codeSplitting: false,
    banner:
      '// isketch MCP server, bundled by scripts/make-plugin.mjs. Do not edit; run npm run plugin.',
  },
})

const font = 'patrick-hand-latin-400-normal.woff2'
await copyFile(
  createRequire(import.meta.url).resolve(`@fontsource/patrick-hand/files/${font}`),
  new URL(font, out),
)

console.log('plugin/server/isketch-mcp.mjs and the sketch font')
