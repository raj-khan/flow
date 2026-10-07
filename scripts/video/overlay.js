/**
 * What the demo video draws over the real app, added to every page it opens:
 * a cursor (a recording shows none), captions, title cards, an agent's panel
 * and an address bar. Everything sits in one fixed layer that takes no clicks,
 * so the app underneath works as it always does. Exposed as `window.clip`.
 */
export function installOverlay() {
  const FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
  const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace"
  const CSS = `
    .clip-layer { position: fixed; inset: 0; z-index: 2147483000; pointer-events: none; font-family: ${FONT}; }
    .clip-cursor { position: fixed; left: 0; top: 0; width: 22px; height: 22px; z-index: 2147483647;
      pointer-events: none; transform: translate(-2px, -2px); transition: transform 90ms ease-out; }
    .clip-cursor.down { transform: translate(-2px, -2px) scale(0.86); }
    .clip-cursor .ring { position: absolute; left: -11px; top: -11px; width: 24px; height: 24px; border-radius: 50%;
      background: rgb(249 115 98 / 0.28); opacity: 0; transition: opacity 120ms; }
    .clip-cursor.down .ring { opacity: 1; }
    .clip-caption { position: absolute; left: 50%; bottom: 84px; transform: translate(-50%, 12px); opacity: 0;
      display: flex; align-items: center; gap: 12px; padding: 12px 20px 12px 12px; border-radius: 16px;
      background: rgb(20 24 31 / 0.92); color: #fff; font-size: 20px; font-weight: 600; letter-spacing: -0.01em;
      box-shadow: 0 12px 32px rgb(15 23 42 / 0.25); transition: opacity 320ms ease, transform 320ms ease; white-space: nowrap; }
    .clip-caption.on { opacity: 1; transform: translate(-50%, 0); }
    .clip-caption .step { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px;
      background: #f97362; font-size: 16px; }
    .clip-caption .sub { font-weight: 400; color: #cbd5e1; font-size: 16px; }
    .clip-card { position: absolute; inset: 0; display: grid; place-items: center; text-align: center;
      background: radial-gradient(circle at 50% 40%, #1f2633, #0d1117 70%); color: #fff; opacity: 0;
      transition: opacity 450ms ease; }
    .clip-card.on { opacity: 1; }
    .clip-card .mark { font-size: 84px; font-weight: 800; letter-spacing: -0.04em; }
    .clip-card .mark span { color: #f97362; }
    .clip-card .line { margin-top: 14px; font-size: 30px; color: #e2e8f0; font-weight: 500; }
    .clip-card .small { margin-top: 26px; font-size: 18px; color: #94a3b8; }
    .clip-card .url { display: inline-block; margin-top: 30px; padding: 12px 22px; border-radius: 999px;
      background: #f97362; color: #fff; font-size: 24px; font-weight: 700; }
    .clip-panel { position: absolute; top: 76px; bottom: 150px; width: 470px; border-radius: 16px;
      background: #0f141b; color: #e6edf3; box-shadow: 0 24px 60px rgb(0 0 0 / 0.35); overflow: hidden;
      opacity: 0; transform: translateY(14px); transition: opacity 320ms ease, transform 320ms ease;
      display: flex; flex-direction: column; border: 1px solid #263040; }
    .clip-panel.on { opacity: 1; transform: none; }
    .clip-panel.left { left: 24px; } .clip-panel.right { right: 24px; }
    .clip-panel header { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #161b22;
      border-bottom: 1px solid #263040; font-size: 14px; font-weight: 600; }
    .clip-panel header i { width: 11px; height: 11px; border-radius: 50%; display: inline-block; }
    .clip-panel header .who { margin-left: 6px; } .clip-panel header .where { margin-left: auto; color: #8b98a9; font-weight: 400; }
    .clip-panel .body { padding: 16px; font-family: ${MONO}; font-size: 14.5px; line-height: 1.55; overflow: hidden;
      display: flex; flex-direction: column; gap: 10px; }
    .clip-panel .you { color: #fff; } .clip-panel .you::before { content: '> '; color: #f97362; }
    .clip-panel .say { color: #cbd5e1; font-family: ${FONT}; font-size: 15px; }
    .clip-panel .tool { color: #7dd3fc; } .clip-panel .tool::before { content: '⏺ '; color: #34d399; }
    .clip-panel .out { color: #a7b4c4; padding-left: 18px; border-left: 2px solid #263040; white-space: pre-wrap; }
    .clip-panel .ok { color: #34d399; }
    .clip-panel a { color: #fbbf24; text-decoration: underline; }
    .clip-bar { position: absolute; top: 0; left: 0; right: 0; height: 46px; display: flex; align-items: center;
      gap: 12px; padding: 0 16px; background: #e9edf2; border-bottom: 1px solid #d0d7e0; }
    .clip-bar i { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
    .clip-bar .url { margin-left: 18px; flex: 1; max-width: 720px; height: 30px; border-radius: 15px; background: #fff;
      display: flex; align-items: center; padding: 0 14px; font-size: 14px; color: #334155; }
    .clip-bar .url b { color: #0f172a; font-weight: 600; }
  `

  const ready = () => {
    if (document.querySelector('.clip-layer')) return document.querySelector('.clip-layer')
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.append(style)
    const layer = document.createElement('div')
    layer.className = 'clip-layer'
    document.body.append(layer)

    const cursor = document.createElement('div')
    cursor.className = 'clip-cursor'
    cursor.innerHTML = `<span class="ring"></span><svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 2l15 9.5-6.6 1.4L16.6 21l-3 1.4-4.1-8.1L4 18.7z" fill="#14181f" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`
    document.body.append(cursor)
    const place = (event) => {
      cursor.style.left = `${event.clientX}px`
      cursor.style.top = `${event.clientY}px`
    }
    window.addEventListener('pointermove', place, true)
    window.addEventListener('mousemove', place, true)
    window.addEventListener('pointerdown', () => cursor.classList.add('down'), true)
    window.addEventListener('pointerup', () => cursor.classList.remove('down'), true)
    return layer
  }

  /** @param {string} html */
  const element = (html) => {
    const holder = document.createElement('div')
    holder.innerHTML = html.trim()
    return /** @type {HTMLElement} */ (holder.firstElementChild)
  }
  const show = (node) =>
    requestAnimationFrame(() => requestAnimationFrame(() => node.classList.add('on')))
  const hide = (selector) =>
    document.querySelectorAll(selector).forEach((node) => {
      node.classList.remove('on')
      setTimeout(() => node.remove(), 450)
    })
  const escape = (text) =>
    String(text).replace(
      /[&<>"]/g,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char],
    )

  window.clip = {
    ready: () => void ready(),
    caption(step, text, sub = '') {
      hide('.clip-caption')
      const node = element(
        `<div class="clip-caption"><span class="step">${step}</span><span>${escape(text)}</span>${sub ? `<span class="sub">${escape(sub)}</span>` : ''}</div>`,
      )
      ready().append(node)
      setTimeout(() => show(node), 120)
    },
    uncaption: () => hide('.clip-caption'),
    card(html) {
      const node = element(`<div class="clip-card"><div>${html}</div></div>`)
      ready().append(node)
      show(node)
    },
    uncard: () => hide('.clip-card'),
    panel(side, who, where, dots = ['#ff5f57', '#febc2e', '#28c840']) {
      hide('.clip-panel')
      const node = element(
        `<div class="clip-panel ${side}"><header>${dots.map((c) => `<i style="background:${c}"></i>`).join('')}<span class="who">${escape(who)}</span><span class="where">${escape(where)}</span></header><div class="body"></div></div>`,
      )
      ready().append(node)
      show(node)
    },
    unpanel: () => hide('.clip-panel'),
    /** A new line in the panel, empty for now; `type` fills it. */
    line(kind, html = '') {
      const body = document.querySelector('.clip-panel .body')
      const node = element(`<div class="${kind}">${html}</div>`)
      body?.append(node)
    },
    /** One more character on the panel's last line. */
    type(char) {
      const last = document.querySelector('.clip-panel .body > :last-child')
      if (last) last.append(char)
    },
    bar(url) {
      document.querySelector('.clip-bar')?.remove()
      const [origin, ...rest] = url.replace(/^https?:\/\//, '').split('/')
      ready().append(
        element(
          `<div class="clip-bar"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i><div class="url">🔒&nbsp; <b>${escape(origin)}</b>/${escape(rest.join('/'))}</div></div>`,
        ),
      )
      document.documentElement.style.paddingTop = '46px'
    },
  }

  if (document.body) ready()
  else window.addEventListener('DOMContentLoaded', ready)
}
