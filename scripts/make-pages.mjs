/**
 * Builds the pages that bring people in, from data:
 *
 *   /templates/:slug   one page per examples/templates/*.flow: the drawing,
 *                      the .flow source, and a link that opens it live
 *   /vs/:name          fair comparisons with Excalidraw, draw.io, Eraser, tldraw
 *   /convert/:tool     the five conversions, each a static page that runs the
 *                      converter (root convert.html) inside it
 *
 * Every page gets its own head and its own OG image, drawn with the same
 * Chromium Playwright records clips with. Run with `npm run pages`; the
 * outputs in public/ are committed, so a deploy serves static files only.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'

import { chromium } from '@playwright/test'

import { toBrief } from '../src/domain/brief.js'
import { parseFlow } from '../src/domain/flowText.js'
import { renderSvg } from '../src/domain/renderSvg.js'
import { encodeShare } from '../src/domain/shareLink.js'

const siteUrl = (process.env.VITE_SITE_URL ?? 'https://isketch.online').replace(/\/+$/, '')
const publicDir = new URL('../public/', import.meta.url)

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)

/* ---------------------------------------------------------------- templates */

async function loadTemplates() {
  const dir = new URL('../examples/templates/', import.meta.url)
  const { readdir } = await import('node:fs/promises')
  const files = (await readdir(dir)).filter((name) => name.endsWith('.flow')).sort()

  return Promise.all(
    files.map(async (name) => {
      const text = await readFile(new URL(name, dir), 'utf8')
      const { document } = parseFlow(text)
      const slug = name.replace(/\.flow$/, '')
      return {
        slug,
        file: `examples/templates/${name}`,
        document,
        text,
        svg: renderSvg(document, { theme: 'light' }),
        brief: toBrief(document),
        hash: (await encodeShare(document)).slice(1),
      }
    }),
  )
}

/* ---------------------------------------------------------------------- vs */

const VERSUS = [
  {
    slug: 'excalidraw',
    name: 'Excalidraw',
    home: 'https://excalidraw.com',
    better: [
      'A wonderful drawing surface: the fastest free-hand sketching of any tool here, with a library of community shapes.',
      'Live collaboration and a share link out of the box, no server of your own to think about.',
      'A big audience: the hand-drawn look people already recognise from engineering blogs.',
    ],
    adds: [
      'The diagram is also text: every sketch is a `.flow` file an agent reads exactly (names, kinds, directions) instead of a canvas of shapes to guess from.',
      'Copy for AI turns it into a brief a coding agent can build from, and the MCP server lets the agent update the diagram as the code changes.',
      'Files diff line by line, so pull requests can show what changed in the design.',
    ],
  },
  {
    slug: 'drawio',
    name: 'draw.io',
    home: 'https://draw.io',
    better: [
      'A huge shape catalogue (AWS, Azure, GCP, UML, BPMN) and precise connectors with every option you could want.',
      'Mature: integrations with Confluence, Jira, VS Code and Google Drive, twenty years of them.',
      'Strict, formal diagrams when a standards-compliant picture is the deliverable.',
    ],
    adds: [
      'The text format is first-class, not an XML export: writing a diagram by hand or with an agent is as natural as drawing it.',
      'The same diagram is a brief and an MCP-read document, so agents keep it true while the code moves.',
      'A hand-drawn sketch style when you are thinking out loud, and `.drawio` import and export for the diagrams you already have.',
    ],
  },
  {
    slug: 'eraser',
    name: 'Eraser',
    home: 'https://eraser.io',
    better: [
      'Diagram-as-code across many syntaxes, with a polished editor and diagrams that look sharp in docs.',
      'A whole suite around engineering docs: OpenAPI files, release notes, an AI to draft diagrams.',
      'A company behind it, shipping fast.',
    ],
    adds: [
      'Open and local: your diagrams are `.flow` files in your repo, not documents in a service. A CLI renders them with no browser, and no account is needed.',
      'The MCP server works on your folder as it is, so the agent you already run edits the diagrams next to the code they describe.',
      'Sketch when you want to think, structure when you want to build: one diagram, both surfaces.',
    ],
  },
  {
    slug: 'tldraw',
    name: 'tldraw',
    home: 'https://tldraw.com',
    better: [
      'A superb canvas SDK: if you are building a drawing tool, it is the one to build on.',
      'Arrows and shapes that behave beautifully under manipulation; multiplayer by default.',
      'An ecosystem of experiments (computer, copy-paste-as-URL) that show what a canvas can be.',
    ],
    adds: [
      'Built for the step after the sketch: handing the design to a coding agent as structured text it can act on and write back.',
      'Domain imports that matter to code (docker-compose, OpenAPI, SQL DDL, draw.io), not just drawing.',
      'Diagrams as files you own, with a diff a reviewer can read.',
    ],
  },
]

/* ----------------------------------------------------------------- convert */

const CONVERT = [
  {
    id: 'mermaid-to-drawio',
    title: 'Mermaid to draw.io',
    description:
      'Paste Mermaid flowchart syntax and get a draw.io XML file, ready to open in diagrams.net. Runs entirely in your browser.',
    from: 'Mermaid',
    to: 'draw.io XML',
  },
  {
    id: 'drawio-to-mermaid',
    title: 'draw.io to Mermaid',
    description:
      'Paste draw.io XML (compressed or plain, first page) and get Mermaid flowchart syntax back. Runs entirely in your browser.',
    from: 'draw.io',
    to: 'Mermaid',
  },
  {
    id: 'sql-to-er',
    title: 'SQL to ER diagram',
    description:
      'Paste CREATE TABLE statements and get an entity-relationship diagram, with every table and foreign key. Runs entirely in your browser.',
    from: 'SQL',
    to: 'ER diagram',
  },
  {
    id: 'compose-to-diagram',
    title: 'docker-compose to diagram',
    description:
      'Paste a docker-compose.yml and get the services it defines, connected by their dependencies. Runs entirely in your browser.',
    from: 'docker-compose',
    to: 'diagram',
  },
  {
    id: 'openapi-to-diagram',
    title: 'OpenAPI to diagram',
    description:
      'Paste an OpenAPI document and get a diagram of its endpoints and schemas. Runs entirely in your browser.',
    from: 'OpenAPI',
    to: 'diagram',
  },
]

/* ------------------------------------------------------------------ pages */

/** One OG image per page, drawn after the pages themselves are written. */
const ogJobs = []

const STYLES = `<style>
  :root { --canvas: #f4f5f8; --surface: #ffffff; --ink: #14181f; --muted: #64748b; --line: #e3e7ee; --brand-ink: #4f46e5; }
  @media (prefers-color-scheme: dark) { :root { --canvas: #0d1117; --surface: #161b22; --ink: #e6edf3; --muted: #94a3b8; --line: #21262d; } }
  * { box-sizing: border-box }
  body { margin: 0; background: var(--canvas); color: var(--ink); font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; line-height: 1.65 }
  .wrap { max-width: 900px; margin: 0 auto; padding: 24px 24px 64px }
  header { display: flex; align-items: center; gap: 16px; flex-wrap: wrap }
  header img { width: 28px; height: 27px }
  header .wordmark { font-weight: 700; margin-right: 8px }
  header a { color: var(--brand-ink); text-decoration: none }
  header .spacer { flex: 1 }
  h1 { font-size: 34px; letter-spacing: -0.02em; margin: 36px 0 8px }
  h2 { font-size: 22px; margin: 36px 0 6px }
  .sub { color: var(--muted); font-size: 17px; margin: 0 0 12px; max-width: 46em }
  .btn { display: inline-block; background: var(--brand-ink); color: #fff; border-radius: 8px; padding: 8px 16px; font-weight: 600; font-size: 15px; text-decoration: none; border: none; cursor: pointer }
  .btn:hover { opacity: .9 }
  .card { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; margin: 16px 0 }
  .drawing svg { display: block; width: 100%; height: auto; padding: 24px }
  .code-head { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-bottom: 1px solid var(--line); color: var(--muted); font-size: 14px }
  .code-head .grow { flex: 1 }
  pre { margin: 0; padding: 16px 20px; overflow-x: auto; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; line-height: 1.6 }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background: var(--surface); border: 1px solid var(--line); border-radius: 5px; padding: 1px 5px }
  ul li { margin: 8px 0 }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; margin: 20px 0 }
  .step { display: block; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 16px; text-decoration: none; color: inherit }
  .step:hover { border-color: var(--brand-ink) }
  .step b { display: block; margin-bottom: 4px; color: var(--brand-ink) }
  .step p { margin: 0; color: var(--muted); font-size: 14px }
  .step .count { margin-top: 8px; font-size: 13px }
  .convert iframe { display: block; width: 100%; height: 640px; border: 0; background: var(--surface) }
  footer { border-top: 1px solid var(--line); margin-top: 56px; padding-top: 20px; color: var(--muted); font-size: 14px }
  footer a { color: var(--brand-ink) }
</style>`

await writeTemplates(await loadTemplates())
await writeVersus(VERSUS)
await writeConvert(CONVERT)
await writeOgs()
console.log(`templates, vs and convert pages for ${siteUrl}`)

/** @param {Awaited<ReturnType<typeof loadTemplates>>} templates */
async function writeTemplates(templates) {
  for (const template of templates) {
    const { document } = template
    await page(`templates/${template.slug}`, {
      title: `${document.title} template · isketch`,
      description: firstSentence(document),
      body: `
  <h1>${escapeHtml(document.title)}</h1>
  <p class="sub">${escapeHtml(firstSentence(document))}</p>
  <p><a class="btn" href="/flow#${template.hash}">Open this template</a></p>
  <div class="card drawing">${template.svg}</div>
  <h2>The .flow source</h2>
  <p class="sub">The whole template as text: copy it, keep it in your repo, hand it to an agent.</p>
  <div class="card">
    <div class="code-head">examples/templates/${template.slug}.flow<span class="grow"></span><button class="btn" type="button" data-copy-from="the-source">Copy</button></div>
    <pre id="the-source">${escapeHtml(template.text)}</pre>
  </div>`,
      ogImage: { svg: template.svg, title: document.title },
    })
  }

  await page('templates', {
    title: 'Diagram templates · isketch',
    description:
      'Free architecture and UI diagram templates (URL shortener, RAG pipeline, CI/CD, microservices, SaaS database and more), each editable and copyable as text.',
    body: `
  <h1>Templates</h1>
  <p class="sub">Every template is a real diagram: open it in the editor, or copy the <code>.flow</code> source into your repo. Adding one is a pull request.</p>
  <div class="grid">
    ${templates
      .map(
        (template) => `
    <a class="step" href="/templates/${template.slug}">
      <b>${escapeHtml(template.document.title)}</b>
      <p>${escapeHtml(firstSentence(template.document))}</p>
      <p class="count">${template.document.nodes.length} shapes · ${template.document.edges.length} connections</p>
    </a>`,
      )
      .join('')}
  </div>`,
  })
}

async function writeVersus(entries) {
  for (const entry of entries) {
    await page(`vs/${entry.slug}`, {
      title: `isketch vs ${entry.name}, honestly · isketch`,
      description: `What ${entry.name} does better than isketch, and what isketch adds for handing diagrams to coding agents. A fair comparison.`,
      body: `
  <h1>isketch vs ${entry.name}</h1>
  <p class="sub">Different tools for different jobs. Here is where ${entry.name} is the better choice, and where isketch adds something it does not.</p>
  <h2>Where ${entry.name} is better</h2>
  <ul>${entry.better.map((point) => `<li>${point}</li>`).join('')}</ul>
  <h2>Where isketch adds something different</h2>
  <p class="sub">isketch is a sketchpad whose output is agent-ready: the diagram is text a coding agent reads exactly, and can edit back.</p>
  <ul>${entry.adds.map((point) => `<li>${point}</li>`).join('')}</ul>
  <h2>Try both</h2>
  <p><a href="${entry.home}">${entry.name}</a> is good at what it does, and you can bring your ${entry.slug === 'drawio' ? 'draw.io' : entry.name} diagrams along: <a href="/convert">the converters</a> run in your browser.</p>
  <p><a class="btn" href="/new">Sketch something in isketch</a></p>`,
    })
  }
}

async function writeConvert(tools) {
  for (const tool of tools) {
    await page(`convert/${tool.id}`, {
      title: `${tool.title}, free in your browser · isketch`,
      description: tool.description,
      body: `
  <h1>${tool.title}</h1>
  <p class="sub">${tool.description}</p>
  <div class="card convert">
    <iframe title="The ${tool.title} converter" src="/convert.html?tool=${tool.id}" loading="lazy"></iframe>
  </div>
  <p class="sub">Nothing is uploaded: the converter runs on this page, in your browser. The result is a real isketch diagram: open it in the editor, or copy its <code>.flow</code> source and keep it beside the code it describes. The other <a href="/convert">converters</a> are one click away.</p>`,
    })
  }

  await page('convert', {
    title: 'Diagram converters, free in your browser · isketch',
    description:
      'Convert Mermaid to draw.io, draw.io to Mermaid, SQL to an ER diagram, docker-compose and OpenAPI to diagrams. Free, no upload, runs in your browser.',
    body: `
  <h1>Converters</h1>
  <p class="sub">The formats your repo already has, as diagrams, and back. Every conversion runs in your browser; nothing is uploaded.</p>
  <div class="grid">
    ${tools
      .map(
        (tool) => `
    <a class="step" href="/convert/${tool.id}">
      <b>${tool.title}</b>
      <p>${escapeHtml(tool.description)}</p>
    </a>`,
      )
      .join('')}
  </div>
  <h2>Why bother?</h2>
  <p class="sub">A diagram your coding agent can read is worth two it has to guess at. Convert what you have, then hand it over: the diagram stays in your repo as <code>.flow</code> text that diffs cleanly and that an agent can edit back.</p>`,
  })
}

/* ---------------------------------------------------------------- layout */

async function page(path, { title, description, body, ogImage }) {
  const url = `${siteUrl}/${path}`
  ogJobs.push({
    path,
    title: ogImage?.title ?? title,
    subtitle: description,
    svg: ogImage?.svg ?? '',
    brand: ogImage?.brand ?? 'isketch',
  })
  await mkdir(new URL(path, publicDir), { recursive: true })
  await writeFile(
    new URL(`${path}/index.html`, publicDir),
    `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#f4f5f8" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0d1117" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="website">
<meta property="og:site_name" content="isketch">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${url}/og.png">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${url}/og.png">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any">
${STYLES}
<script src="/analytics.js" defer></script>
</head>
<body>
<div class="wrap">
<header>
  <img src="/favicon.svg" alt="">
  <span class="wordmark">isketch</span>
  <span class="spacer"></span>
  <a href="/templates">Templates</a>
  <a href="/convert">Convert</a>
  <a href="/docs/format">Format</a>
  <a class="btn" href="/new">Open the editor</a>
</header>
${body}
<footer>isketch: sketch it, hand it to your agent · <a href="/">Home</a> · <a href="https://github.com/raj-khan/flow#readme">Docs</a> · MIT licence</footer>
</div>
<script>
  for (const button of document.querySelectorAll('[data-copy-from]')) {
    button.addEventListener('click', async () => {
      await navigator.clipboard.writeText(document.getElementById(button.dataset.copyFrom).textContent)
      const was = button.textContent
      button.textContent = 'Copied'
      setTimeout(() => (button.textContent = was), 1500)
    })
  }
</script>
</body>
</html>
`,
  )
}

async function writeOgs() {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
    for (const job of ogJobs) {
      await mkdir(new URL(job.path, publicDir), { recursive: true })
      await page.setContent(ogCard(job), { waitUntil: 'load' })
      await page.screenshot({ path: new URL(`${job.path}/og.png`, publicDir).pathname })
    }
    await page.close()
    console.log(`${ogJobs.length} OG images`)
  } finally {
    await browser.close()
  }
}

/** The note is the description: templates are written to be handed over. */
function firstSentence(document) {
  const note = document.nodes.find((node) => node.type === 'note')?.name ?? ''
  return String(note) || `${document.nodes.length} shapes and ${document.edges.length} connections, sketched in isketch.`
}
function ogCard({ title, subtitle, svg, brand }) {
  return `<!doctype html><html><head><style>
    body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif }
    .card { position: fixed; inset: 0; display: ${svg ? 'grid' : 'flex'}; place-items: center; padding: 56px;
      background: linear-gradient(120deg,#f4f5f8,#fff); color: #14181f }
    .text { max-width: ${svg ? '46' : '76'}%; }
    h1 { font-size: ${svg ? 44 : 54}px; line-height: 1.1; letter-spacing: -.02em; margin: 0 0 12px }
    p { font-size: 22px; line-height: 1.4; color: #64748b; margin: 0 }
    .brand { position: absolute; top: 48px; right: 56px; color: #4f46e5; font-weight: 700; font-size: 24px }
    .drawing { max-width: 46%; max-height: 80%; display: grid; place-items: center }
    .drawing svg { max-width: 100%; max-height: 460px; height: auto; width: auto; display: block }
  </style></head><body><div class="card">
    <div class="text"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div>
    ${svg ? `<div class="drawing">${svg}</div>` : ''}
    <div class="brand">${escapeHtml(brand)}</div>
  </div></body></html>`
}
