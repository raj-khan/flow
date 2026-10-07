import { describeDiff, diffDocuments, isUnchanged, mergeForDiff } from '../domain/diff.js'
import { parseFlow } from '../domain/flowText.js'
import { toMermaid } from '../domain/mermaid.js'

/** Marks the comment, so a later run edits it instead of adding another. */
export const REPORT_MARKER = '<!-- flow-diagram-report -->'

/**
 * A pull request comment for the `.flow` files a change touched: for each, a
 * list of what changed and a Mermaid drawing with the changes coloured, which
 * GitHub renders in place with nothing to host.
 *
 * @param {{ path: string, before: string, after: string }[]} files '' for a side that does not exist
 * @returns {string} empty when no diagram changed in substance
 */
export function prReport(files) {
  const sections = files
    .map(({ path, before, after }) => section(path, before, after))
    .filter(Boolean)
  if (!sections.length) return ''

  return [
    REPORT_MARKER,
    '### Diagrams in this pull request',
    '',
    ...sections,
    '<sub>Green was added, red dashed was removed, amber changed. Drawn by <a href="https://github.com/raj-khan/isketch">isketch</a> from the <code>.flow</code> files.</sub>',
    '',
  ].join('\n')
}

/**
 * @param {string} path
 * @param {string} beforeText
 * @param {string} afterText
 * @returns {string}
 */
function section(path, beforeText, afterText) {
  const before = parseFlow(beforeText)
  const after = parseFlow(afterText)

  if (!after.document) {
    const errors = after.errors.map(({ line, message }) => `- Line ${line}: ${message}`)
    return [`#### \`${path}\` does not parse`, '', ...errors, ''].join('\n')
  }

  // A file that did not parse before is compared as new, so it still gets a picture.
  const old = before.document ?? { ...after.document, nodes: [], edges: [] }
  const diff = diffDocuments(old, after.document)
  if (isUnchanged(diff)) return ''

  const status = !beforeText ? ' (new)' : !afterText.trim() ? ' (removed)' : ''
  const { document, highlight } = mergeForDiff(old, after.document, diff)

  return [
    `#### \`${path}\`${status}`,
    '',
    '```diff',
    ...describeDiff(old, after.document, diff),
    '```',
    '',
    '<details open><summary>Drawing</summary>',
    '',
    '```mermaid',
    toMermaid(document, { highlight }).trimEnd(),
    '```',
    '',
    '</details>',
    '',
  ].join('\n')
}
