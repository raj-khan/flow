import { parseFlow, serialiseFlow } from '../domain/flowText.js'
import { detectFormat, IMPORT_FORMATS, importFormat } from '../domain/importers.js'
import { combineSources, importSources, PEEKED, pickSources } from '../domain/scan.js'
import { describeDiff, diffDocuments, isUnchanged, mergeForDiff } from '../domain/diff.js'
import { renderSvg } from '../domain/renderSvg.js'
import { toBrief } from '../domain/brief.js'
import { isSketch } from '../domain/sketch.js'

export const USAGE = `Usage:
  isketch render <file.flow> [-o <out.svg>] [--dark]   Draw a diagram as SVG
  isketch check <file.flow>...                         Report errors, exit 1 if any
  isketch brief <file.flow>                            A Markdown brief for a coding agent
  isketch import <file> [--from <format>] [-o <out.flow>]
                                                       Turn a schema, spec or drawing into .flow
                                                       (${IMPORT_FORMATS.map((format) => format.id).join(', ')})
  isketch scan [folder] [-o <out.flow>]                A first architecture diagram of a repository,
                                                       from its compose, SQL, Prisma, OpenAPI and
                                                       Drizzle files, each in a frame
  isketch mcp [folder]                                 An MCP server for the .flow files in a folder
  isketch diff <before.flow> <after.flow> [-o <out.svg>] [--dark]
                                                       List what changed, and draw it
`

/**
 * The command line, with its I/O handed in so it tests without a process.
 *
 * @param {string[]} argv the arguments after the command name
 * @param {{
 *   readFile: (path: string) => Promise<string>,
 *   writeFile: (path: string, text: string) => Promise<void>,
 *   stdout: (text: string) => void,
 *   stderr: (text: string) => void,
 *   sketchFont?: () => Promise<string>,
 *   listFiles?: (folder: string) => Promise<string[]>,
 * }} io  `sketchFont` gives the handwriting font to embed in a sketch; `listFiles`
 *   every file under a folder, relative to it, for `scan`
 * @returns {Promise<number>} the exit code
 */
export async function run(argv, io) {
  const [command, ...rest] = argv

  if (command === 'render') return render(rest, io)
  if (command === 'check') return check(rest, io)
  if (command === 'diff') return diff(rest, io)
  if (command === 'brief') return brief(rest, io)
  if (command === 'import') return importFile(rest, io)
  if (command === 'scan') return scan(rest, io)

  io.stderr(USAGE)
  return command === undefined || command === '--help' || command === '-h' ? 0 : 2
}

/**
 * @param {string[]} args
 * @param {Parameters<typeof run>[1]} io
 */
async function render(args, io) {
  const { files, out, dark } = options(args)
  const [input] = files

  if (!input || out === '') {
    io.stderr(USAGE)
    return 2
  }

  const document = await read(input, io)
  if (!document) return 1

  const svg = renderSvg(document, {
    theme: dark ? 'dark' : 'light',
    sketchFont: await fontFor(document, io),
  })
  if (out) {
    await io.writeFile(out, svg)
    io.stderr(`Rendered ${input} to ${out}\n`)
  } else {
    io.stdout(svg)
  }
  return 0
}

/**
 * @param {string[]} args
 * @param {Parameters<typeof run>[1]} io
 */
async function brief(args, io) {
  const { files } = options(args)
  if (files.length !== 1) {
    io.stderr(USAGE)
    return 2
  }

  const document = await read(files[0], io)
  if (!document) return 1

  io.stdout(toBrief(document))
  return 0
}

/**
 * @param {string[]} args
 * @param {Parameters<typeof run>[1]} io
 */
async function diff(args, io) {
  const { files, out, dark } = options(args)
  if (files.length !== 2 || out === '') {
    io.stderr(USAGE)
    return 2
  }

  const [before, after] = await Promise.all(files.map((file) => read(file, io)))
  if (!before || !after) return 1

  const changes = diffDocuments(before, after)
  io.stdout(
    isUnchanged(changes) ? 'No changes.\n' : `${describeDiff(before, after, changes).join('\n')}\n`,
  )

  if (out) {
    const { document, highlight } = mergeForDiff(before, after, changes)
    await io.writeFile(
      out,
      renderSvg(document, {
        theme: dark ? 'dark' : 'light',
        highlight,
        sketchFont: await fontFor(document, io),
      }),
    )
  }
  return 0
}

/**
 * A file in any import format, as `.flow` text: to stdout, or to `-o`. The
 * format is read from the name, and from the content where names are shared;
 * `--from` says it outright. What was skipped is reported like a check error.
 * @param {string[]} args
 * @param {Parameters<typeof run>[1]} io
 */
async function importFile(args, io) {
  const fromIndex = args.findIndex((arg) => arg === '--from')
  const from = fromIndex === -1 ? '' : (args[fromIndex + 1] ?? '')
  const { files, out } = options(
    args.filter((_, index) => fromIndex === -1 || (index !== fromIndex && index !== fromIndex + 1)),
  )
  const [input] = files
  if (!input || out === '' || (fromIndex !== -1 && !from)) {
    io.stderr(USAGE)
    return 2
  }

  let text
  try {
    text = await io.readFile(input)
  } catch {
    io.stderr(`${input}: cannot be read\n`)
    return 1
  }

  const format = from ? importFormat(from) : detectFormat(input, text)
  if (!format) {
    io.stderr(
      from
        ? `${input}: there is no "${from}" import. Try one of: ${IMPORT_FORMATS.map((each) => each.id).join(', ')}\n`
        : `${input}: the format cannot be told from the name. Say it with --from.\n`,
    )
    return from ? 2 : 1
  }

  const { document, warnings } = format.read(text)
  warnings.forEach(({ line, message }) =>
    io.stderr(line ? `${input}:${line}: ${message}\n` : `${input}: ${message}\n`),
  )
  if (!document) return 1

  const flow = serialiseFlow(document)
  if (out) {
    await io.writeFile(out, flow)
    io.stderr(
      `Imported ${input} (${format.label}) to ${out}: ${count(document.nodes.length, 'shape')}, ${count(document.edges.length, 'connection')}\n`,
    )
  } else io.stdout(flow)
  return 0
}

/**
 * A repository's own files, as one framed diagram.
 * @param {string[]} args
 * @param {Parameters<typeof run>[1]} io
 */
async function scan(args, io) {
  const { files, out } = options(args)
  const folder = files[0] ?? '.'
  if (files.length > 1 || out === '' || !io.listFiles) {
    io.stderr(USAGE)
    return 2
  }

  let paths
  try {
    paths = await io.listFiles(folder)
  } catch {
    io.stderr(`${folder}: cannot be read\n`)
    return 1
  }

  const join = (/** @type {string} */ path) =>
    folder === '.' ? path : `${folder.replace(/\/+$/, '')}/${path}`
  /** @type {Map<string, string>} */
  const contents = new Map()
  for (const path of paths.filter((each) => PEEKED.test(each))) {
    contents.set(path, await io.readFile(join(path)).catch(() => ''))
  }

  const sources = pickSources(paths, (path) => contents.get(path) ?? '')
  const { parts, warnings } = await importSources(sources, async (path) =>
    contents.has(path) ? /** @type {string} */ (contents.get(path)) : io.readFile(join(path)),
  )
  warnings.forEach(({ path, line, message }) =>
    io.stderr(
      line && !/ files$/.test(path)
        ? `${join(path)}:${line}: ${message}\n`
        : `${path}: ${message}\n`,
    ),
  )
  if (!parts.length) {
    io.stderr(`${folder}: found no compose, SQL, Prisma, OpenAPI or Drizzle files to draw.\n`)
    return 1
  }

  const name = folder === '.' ? '' : folder.replace(/\/+$/, '').split('/').pop()
  const document = combineSources(parts, name ? `${name} architecture` : 'Architecture')
  const flow = serialiseFlow(document)
  if (out) {
    await io.writeFile(out, flow)
    const found = parts.map(({ source }) => source.paths.join(', ')).join('; ')
    io.stderr(
      `Scanned ${folder} (${found}) to ${out}: ${count(document.nodes.length - parts.length, 'shape')} in ${count(parts.length, 'frame')}\n`,
    )
  } else io.stdout(flow)
  return 0
}

/** @param {number} n @param {string} noun */
const count = (n, noun) => `${n} ${noun}${n === 1 ? '' : 's'}`

/**
 * The font to embed, read only when a sketch needs it.
 * @param {import('../domain/types.js').FlowDocument} document
 * @param {Parameters<typeof run>[1]} io
 */
const fontFor = async (document, io) =>
  isSketch(document) && io.sketchFont ? await io.sketchFont() : ''

/**
 * Positional files, and the value of `-o`, which is '' when it is given
 * without one.
 * @param {string[]} args
 */
function options(args) {
  const outIndex = args.findIndex((arg) => arg === '-o' || arg === '--out')
  return {
    out: outIndex === -1 ? null : (args[outIndex + 1] ?? ''),
    dark: args.includes('--dark'),
    files: args.filter(
      (arg, index) => !arg.startsWith('-') && (outIndex === -1 || index !== outIndex + 1),
    ),
  }
}

/**
 * @param {string[]} files
 * @param {Parameters<typeof run>[1]} io
 */
async function check(files, io) {
  if (!files.length) {
    io.stderr(USAGE)
    return 2
  }

  let failed = false
  for (const file of files) {
    if (!(await read(file, io))) failed = true
  }
  return failed ? 1 : 0
}

/**
 * Errors in the form editors and CI annotate: `file:line: message`.
 * @param {string} file
 * @param {Parameters<typeof run>[1]} io
 */
async function read(file, io) {
  let text
  try {
    text = await io.readFile(file)
  } catch {
    io.stderr(`${file}: cannot be read\n`)
    return null
  }

  const { document, errors } = parseFlow(text)
  errors.forEach(({ line, message }) => io.stderr(`${file}:${line}: ${message}\n`))
  return document
}
