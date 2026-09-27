/**
 * Bundles the VS Code extension into vscode/dist: one CommonJS file with the
 * app's own domain code inside it (VS Code supplies `vscode`), and the sketch
 * font beside it. `npm run vscode`, then `npx @vscode/vsce package` in vscode/
 * makes the .vsix to install or publish.
 */
import { copyFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'

import { build } from 'rolldown'

const out = new URL('../vscode/dist/', import.meta.url)
await mkdir(out, { recursive: true })

await build({
  input: new URL('../vscode/src/extension.js', import.meta.url).pathname,
  platform: 'node',
  external: ['vscode'],
  logLevel: 'warn',
  output: {
    file: new URL('extension.cjs', out).pathname,
    format: 'cjs',
    codeSplitting: false,
  },
})

const font = 'patrick-hand-latin-400-normal.woff2'
await copyFile(
  createRequire(import.meta.url).resolve(`@fontsource/patrick-hand/files/${font}`),
  new URL(font, out),
)

console.log('vscode/dist/extension.cjs and the sketch font')
