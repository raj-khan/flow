import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import * as vscode from 'vscode'

import { parseFlow } from '../../src/domain/flowText.js'
import { encodeShare } from '../../src/domain/shareLink.js'
import { previewHtml, renderFlow } from './preview.js'

/** Where "Open in isketch" goes; the diagram travels in the link, not to a server. */
const EDITOR_URL = 'https://isketch.online/new'

/**
 * isketch in VS Code: `.flow` files get colours, their errors underlined by
 * line, and a live drawing beside the text that follows every keystroke.
 * @param {vscode.ExtensionContext} context
 */
export function activate(context) {
  const diagnostics = vscode.languages.createDiagnosticCollection('isketch')
  /** @type {Map<string, { panel: vscode.WebviewPanel, lastSvg: string }>} */
  const previews = new Map()
  let font = ''
  readFile(join(context.extensionPath, 'dist', 'patrick-hand-latin-400-normal.woff2'))
    .then((bytes) => (font = `data:font/woff2;base64,${bytes.toString('base64')}`))
    .catch(() => {})

  const isDark = () =>
    [vscode.ColorThemeKind.Dark, vscode.ColorThemeKind.HighContrast].includes(
      vscode.window.activeColorTheme.kind,
    )

  /** @param {vscode.TextDocument} document */
  function check(document) {
    if (document.languageId !== 'flow') return
    const { errors } = parseFlow(document.getText())
    diagnostics.set(
      document.uri,
      errors.map((error) => {
        const line = Math.max(0, Math.min(error.line - 1, document.lineCount - 1))
        return new vscode.Diagnostic(
          document.lineAt(line).range,
          error.message,
          vscode.DiagnosticSeverity.Error,
        )
      }),
    )
  }

  /** @param {vscode.TextDocument} document */
  function refresh(document) {
    const preview = previews.get(document.uri.toString())
    if (!preview) return
    const dark = isDark()
    const { svg, title, errors } = renderFlow(document.getText(), { dark, sketchFont: font })
    // While the text has an error, the last good drawing stays up.
    if (svg) preview.lastSvg = svg
    if (title) preview.panel.title = `${title} (preview)`
    preview.panel.webview.html = previewHtml({
      svg: preview.lastSvg,
      errors,
      cspSource: preview.panel.webview.cspSource,
      dark,
    })
  }

  /** @type {Map<string, ReturnType<typeof setTimeout>>} */
  const pending = new Map()
  /** @param {vscode.TextDocument} document */
  function soon(document) {
    const key = document.uri.toString()
    clearTimeout(pending.get(key))
    pending.set(
      key,
      setTimeout(() => {
        check(document)
        refresh(document)
      }, 120),
    )
  }

  const openPreview = () => {
    const document = vscode.window.activeTextEditor?.document
    if (!document || document.languageId !== 'flow') return
    const key = document.uri.toString()
    const open = previews.get(key)
    if (open) {
      open.panel.reveal(vscode.ViewColumn.Beside, true)
      return
    }
    const panel = vscode.window.createWebviewPanel(
      'isketch.preview',
      `${document.fileName.split(/[\\/]/).pop()} (preview)`,
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      { enableScripts: false, localResourceRoots: [] },
    )
    previews.set(key, { panel, lastSvg: '' })
    panel.onDidDispose(() => previews.delete(key))
    refresh(document)
  }

  const openInIsketch = async () => {
    const document = vscode.window.activeTextEditor?.document
    if (!document || document.languageId !== 'flow') return
    const parsed = parseFlow(document.getText()).document
    if (!parsed) {
      vscode.window.showErrorMessage('Fix the errors in this diagram first; they are underlined.')
      return
    }
    await vscode.env.openExternal(vscode.Uri.parse(`${EDITOR_URL}${await encodeShare(parsed)}`))
  }

  context.subscriptions.push(
    diagnostics,
    vscode.commands.registerCommand('isketch.openPreviewToSide', openPreview),
    vscode.commands.registerCommand('isketch.openInIsketch', openInIsketch),
    vscode.workspace.onDidOpenTextDocument(check),
    vscode.workspace.onDidChangeTextDocument((event) => soon(event.document)),
    vscode.workspace.onDidCloseTextDocument((document) => diagnostics.delete(document.uri)),
    vscode.window.onDidChangeActiveColorTheme(() =>
      vscode.workspace.textDocuments.forEach(refresh),
    ),
  )
  vscode.workspace.textDocuments.forEach(check)
}

export function deactivate() {}
