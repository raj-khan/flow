/**
 * Counting what matters: Google Analytics 4 with no cookies and nothing kept
 * in the browser (Consent Mode with storage denied), so there is no banner to show.
 *
 * Every page, the app and the static ones alike, loads one /analytics.js that
 * the build writes from analyticsScript(). Without VITE_GA_ID at build time,
 * in development and under a test browser, it is a no-op.
 */

const MEASUREMENT_ID = /^G-[A-Z0-9]+$/

/**
 * The source of /analytics.js.
 * @param {string | undefined} id a GA4 measurement id, such as G-ABC123
 * @returns {string}
 */
export function analyticsScript(id) {
  if (!id || !MEASUREMENT_ID.test(id)) {
    return '// Analytics is off: this build has no VITE_GA_ID.\nwindow.isketchTrack = () => {}\n'
  }
  const quoted = JSON.stringify(id)
  return `// Google Analytics 4, without cookies or client storage.
;(() => {
  window.isketchTrack = () => {}
  // A test browser, or a page framed in another (the landing's live editor, a
  // converter): the page around it already counts.
  if (navigator.webdriver || window.top !== window.self) return

  window.dataLayer = window.dataLayer || []
  function gtag() {
    window.dataLayer.push(arguments)
  }
  // Consent Mode with storage denied: GA4 sends cookieless pings and keeps nothing.
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })
  gtag('js', new Date())
  gtag('config', ${quoted}, { client_storage: 'none' })

  const script = document.createElement('script')
  script.async = true
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + ${quoted}
  document.head.append(script)

  window.isketchTrack = (name, params) => gtag('event', name, params || {})

  // Static pages mark what to count with data-track, such as a copy button.
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-track]') : null
    if (target) gtag('event', target.getAttribute('data-track'), { page: location.pathname })
  })
})()
`
}

/**
 * Count an event, when analytics is on; otherwise nothing happens.
 * @param {'brief_copied' | 'exported' | 'published' | 'opened_from_link' | 'mcp_setup_copied'} name
 * @param {Record<string, string>} [params]
 */
export function track(name, params) {
  const page =
    /** @type {Window & { isketchTrack?: (name: string, params?: Record<string, string>) => void }} */ (
      window
    )
  page.isketchTrack?.(name, params)
}
