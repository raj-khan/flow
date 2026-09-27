import { parseFlow } from './flowText.js'
import { fromMermaid } from './mermaid.js'

/**
 * Text another app shared to isketch, as a diagram: `.flow` text first, then
 * a Mermaid flowchart. Null when it is neither.
 *
 * @param {{ text?: string, title?: string, url?: string }} shared
 * @returns {import('./types.js').FlowDocument | null}
 */
export function readSharedText({ text = '', title = '', url = '' }) {
  // Apps disagree about where the words go; some put everything in `url`.
  const body = [text, url].filter(Boolean).join('\n').trim()
  if (!body) return null

  const asFlow = parseFlow(body).document
  const found = asFlow?.nodes.length ? asFlow : fromMermaid(body).document
  if (!found?.nodes.length) return null

  const named = title.trim()
  return named && !/^title:/m.test(body) ? { ...found, title: named } : found
}
