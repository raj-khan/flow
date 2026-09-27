import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeDocument, recorded, window, workspace } from 'vscode'

import { activate } from '../extension.js'
import { previewHtml, renderFlow } from '../preview.js'

const SHOP = 'title: Shop\napi = process "API"\ndb = database "Orders"\napi -> db : SQL\n'

describe('the extension', () => {
  /** @type {ReturnType<typeof fakeDocument>} */
  let document

  beforeEach(() => {
    vi.useFakeTimers()
    document = fakeDocument(SHOP)
    workspace.textDocuments = [document]
    window.activeTextEditor = { document }
    activate({ extensionPath: '/nowhere', subscriptions: [] })
  })

  afterEach(() => {
    vi.useRealTimers()
    recorded.commands.clear()
    recorded.diagnostics.clear()
    recorded.panels.length = 0
    recorded.opened.length = 0
    Object.values(recorded.handlers).forEach((list) => (list.length = 0))
  })

  it('adds its two commands, and checks the open .flow files', () => {
    expect([...recorded.commands.keys()]).toEqual([
      'isketch.openPreviewToSide',
      'isketch.openInIsketch',
    ])
    expect(recorded.diagnostics.get('file:///repo/docs/shop.flow')).toEqual([])
  })

  it('draws the diagram beside the text, and follows every edit', async () => {
    recorded.commands.get('isketch.openPreviewToSide')()
    const [panel] = recorded.panels
    expect(panel.title).toBe('Shop (preview)')
    expect(panel.webview.html).toContain('<svg ')
    expect(panel.webview.html).toContain('>API</text>')

    document.text = SHOP.replace('"Orders"', '"Invoices"')
    recorded.handlers.change.forEach((handler) => handler({ document }))
    await vi.advanceTimersByTimeAsync(200)
    expect(panel.webview.html).toContain('>Invoices</text>')
  })

  it('underlines an error on its line, and keeps the last good drawing up', async () => {
    recorded.commands.get('isketch.openPreviewToSide')()
    const [panel] = recorded.panels

    document.text = `${SHOP}api -> nowhere\n`
    recorded.handlers.change.forEach((handler) => handler({ document }))
    await vi.advanceTimersByTimeAsync(200)

    const [problem] = recorded.diagnostics.get('file:///repo/docs/shop.flow')
    expect(problem.range.line).toBe(4)
    expect(problem.message).toMatch(/nowhere/)
    expect(panel.webview.html).toContain('Line 5:')
    expect(panel.webview.html).toContain('>API</text>')
  })

  it('opens the diagram in isketch, carried in the link', async () => {
    await recorded.commands.get('isketch.openInIsketch')()
    expect(recorded.opened[0]).toMatch(/^https:\/\/isketch\.online\/new#flow=[zt][\w-]+$/)
  })
})

describe('the preview page', () => {
  it('draws in the dark theme when VS Code is dark, and escapes what it shows', () => {
    const { svg } = renderFlow(SHOP, { dark: true })
    expect(svg).toContain('#0d1117')
    const html = previewHtml({
      svg: '',
      errors: [{ line: 2, message: 'Unknown shape "<script>"' }],
      cspSource: 'x',
      dark: false,
    })
    expect(html).toContain('Line 2: Unknown shape &#34;&#60;script&#62;&#34;')
    expect(html).toContain("default-src 'none'")
  })
})
