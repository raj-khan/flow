/**
 * The parts of the `vscode` API the extension uses, recorded rather than
 * shown, so its behaviour is tested without starting VS Code. Aliased as
 * `vscode` in the test config only.
 */
export const ViewColumn = { Beside: -2 }
export const ColorThemeKind = { Light: 1, Dark: 2, HighContrast: 3 }
export const DiagnosticSeverity = { Error: 0 }

export class Diagnostic {
  constructor(range, message, severity) {
    Object.assign(this, { range, message, severity })
  }
}

export const Uri = { parse: (value) => ({ value, toString: () => value }) }

/** Everything the extension did, for the test to look at. */
export const recorded = {
  commands: new Map(),
  diagnostics: new Map(),
  panels: [],
  opened: [],
  errors: [],
  handlers: { open: [], change: [], close: [], theme: [] },
}

export const languages = {
  createDiagnosticCollection: () => ({
    set: (uri, list) => recorded.diagnostics.set(uri.toString(), list),
    delete: (uri) => recorded.diagnostics.delete(uri.toString()),
    dispose() {},
  }),
}

export const commands = {
  registerCommand: (name, run) => {
    recorded.commands.set(name, run)
    return { dispose() {} }
  },
}

export const window = {
  activeTextEditor: undefined,
  activeColorTheme: { kind: ColorThemeKind.Light },
  createWebviewPanel: (type, title) => {
    const panel = {
      type,
      title,
      webview: { html: '', cspSource: 'vscode-resource:' },
      reveal() {},
      onDidDispose() {},
    }
    recorded.panels.push(panel)
    return panel
  },
  showErrorMessage: (message) => recorded.errors.push(message),
  onDidChangeActiveColorTheme: (handler) => {
    recorded.handlers.theme.push(handler)
    return { dispose() {} }
  },
}

export const workspace = {
  textDocuments: [],
  onDidOpenTextDocument: (handler) => (recorded.handlers.open.push(handler), { dispose() {} }),
  onDidChangeTextDocument: (handler) => (recorded.handlers.change.push(handler), { dispose() {} }),
  onDidCloseTextDocument: (handler) => (recorded.handlers.close.push(handler), { dispose() {} }),
}

export const env = { openExternal: async (uri) => recorded.opened.push(uri.value) }

/**
 * A `.flow` document whose text the test changes, as typing would.
 * @param {string} text
 */
export function fakeDocument(text, fileName = '/repo/docs/shop.flow') {
  const document = {
    languageId: 'flow',
    fileName,
    uri: { toString: () => `file://${fileName}` },
    text,
    getText: () => document.text,
    get lineCount() {
      return document.text.split('\n').length
    },
    lineAt: (line) => ({ range: { line } }),
  }
  return document
}
