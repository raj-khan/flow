import { parseFlow } from '../../src/domain/flowText.js'
import { renderSvg } from '../../src/domain/renderSvg.js'
import { isSketch } from '../../src/domain/sketch.js'

/**
 * The preview's pure half, apart from VS Code so it tests on its own: a
 * `.flow` text as a drawing, and its errors as editor diagnostics.
 */

/**
 * @param {string} text
 * @param {{ dark?: boolean, sketchFont?: string }} [options]
 * @returns {{ svg: string, title: string, errors: { line: number, message: string }[] }}
 */
export function renderFlow(text, { dark = false, sketchFont = '' } = {}) {
  const { document, errors } = parseFlow(text)
  if (!document) return { svg: '', title: '', errors }
  return {
    svg: renderSvg(document, {
      theme: dark ? 'dark' : 'light',
      sketchFont: isSketch(document) ? sketchFont : '',
    }),
    title: document.title ?? '',
    errors,
  }
}

/** @param {string} text */
const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)

/**
 * The webview's page: the drawing, fitted, or what is wrong with the text. The
 * last good drawing stays up while the text has an error, as in the app.
 *
 * @param {{ svg: string, errors: { line: number, message: string }[], cspSource: string, dark: boolean }} input
 * @returns {string}
 */
export function previewHtml({ svg, errors, cspSource, dark }) {
  const problems = errors.length
    ? `<ul class="errors" role="alert">${errors
        .map((error) => `<li>Line ${error.line}: ${escapeHtml(error.message)}</li>`)
        .join('')}</ul>`
    : ''
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} data:; style-src 'unsafe-inline'; font-src data:;">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { margin: 0; padding: 12px; background: ${dark ? '#0d1117' : '#ffffff'}; color: ${dark ? '#e6edf3' : '#14181f'}; font: 13px/1.5 var(--vscode-font-family, system-ui); }
  .drawing svg { display: block; max-width: 100%; height: auto; margin: 0 auto; }
  .errors { margin: 0 0 12px; padding: 8px 12px 8px 28px; border-radius: 6px; background: ${dark ? '#3b1d22' : '#fef2f2'}; color: ${dark ? '#fda4af' : '#b91c1c'}; }
  .empty { color: ${dark ? '#9aa7b6' : '#64748b'}; }
</style>
</head>
<body>
${problems}
${svg ? `<div class="drawing">${svg}</div>` : '<p class="empty">Nothing to draw yet.</p>'}
</body>
</html>`
}
