// The handwriting font as a data URL, so a sketch drawn by the CLI or the MCP
// server looks the same wherever the SVG is opened.
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const FILE = 'patrick-hand-latin-400-normal.woff2'
let loaded

/**
 * Where the font may be: beside this file, as the bundled Claude Code plugin
 * ships it, or in the installed package.
 */
function candidates() {
  const found = [fileURLToPath(new URL(`./${FILE}`, import.meta.url))]
  try {
    found.push(createRequire(import.meta.url).resolve(`@fontsource/patrick-hand/files/${FILE}`))
  } catch {
    // Not installed, as in the plugin: the copy beside this file is the one.
  }
  return found
}

export function sketchFont() {
  loaded ??= (async () => {
    for (const path of candidates()) {
      try {
        return `data:font/woff2;base64,${(await readFile(path)).toString('base64')}`
      } catch {
        // Try the next place.
      }
    }
    return ''
  })()
  return loaded
}
