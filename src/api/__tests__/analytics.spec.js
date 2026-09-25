import { afterEach, describe, expect, it, vi } from 'vitest'

import { analyticsScript, track } from '../analytics.js'

describe('analyticsScript', () => {
  it('is a no-op without a measurement id, or with one that is not', () => {
    for (const id of [undefined, '', 'UA-123', 'G-abc"); alert(1']) {
      const script = analyticsScript(id)
      expect(script).not.toContain('googletagmanager')
      expect(script).toContain('window.isketchTrack = () => {}')
    }
  })

  it('loads GA4 with no cookies or client storage, and stays off under a test browser or in a frame', () => {
    const script = analyticsScript('G-ABC123')
    expect(script).toContain("gtag('config', \"G-ABC123\", { client_storage: 'none' })")
    expect(script).toContain("analytics_storage: 'denied'")
    expect(script).toContain('https://www.googletagmanager.com/gtag/js?id=')
    expect(script).toContain('if (navigator.webdriver || window.top !== window.self) return')
  })

  it('counts clicks on anything marked data-track', () => {
    const events = []
    window.dataLayer = events
    Object.defineProperty(navigator, 'webdriver', { value: false, configurable: true })
    // The test browser loads no remote scripts; only what the snippet records matters.
    const append = vi.spyOn(document.head, 'append').mockImplementation(() => {})
    new Function(analyticsScript('G-ABC123'))()

    document.body.innerHTML = '<button data-track="mcp_setup_copied"><span>Copy</span></button>'
    document.querySelector('span').click()

    const last = [...events.at(-1)]
    expect(last.slice(0, 2)).toEqual(['event', 'mcp_setup_copied'])
    expect(append).toHaveBeenCalledOnce()
    append.mockRestore()
    delete window.isketchTrack
    delete window.dataLayer
  })
})

describe('track', () => {
  afterEach(() => delete window.isketchTrack)

  it('does nothing when analytics is off', () => {
    expect(() => track('brief_copied')).not.toThrow()
  })

  it('hands the event to the loaded script', () => {
    window.isketchTrack = vi.fn()
    track('exported', { format: 'png' })
    expect(window.isketchTrack).toHaveBeenCalledWith('exported', { format: 'png' })
  })
})
