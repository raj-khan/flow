#!/usr/bin/env node
// A thin shell: everything that can be tested lives in src/cli/run.js.
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import process from 'node:process'

import { run } from '../src/cli/run.js'
import { IGNORED_FOLDERS } from '../src/domain/scan.js'
import { sketchFont } from './sketchFont.mjs'

/**
 * Every file under a folder, relative to it, never descending into
 * dependencies or build output.
 * @param {string} folder
 */
async function listFiles(folder) {
  const found = []
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (!IGNORED_FOLDERS.includes(entry.name)) await walk(path)
      } else if (entry.isFile()) found.push(relative(folder, path).split('\\').join('/'))
    }
  }
  await walk(folder)
  return found
}

if (process.argv[2] === 'mcp') {
  // A long-running server, not a command that exits.
  const { serve } = await import('./mcp.mjs')
  serve(process.argv[3] ?? '.')
} else {
  const code = await run(process.argv.slice(2), {
    readFile: (path) => readFile(path, 'utf8'),
    writeFile: (path, text) => writeFile(path, text),
    stdout: (text) => process.stdout.write(text),
    stderr: (text) => process.stderr.write(text),
    sketchFont,
    listFiles,
  })

  process.exit(code)
}
