/**
 * The page a link opens. It carries the brief as text, not only a picture, so
 * an AI that fetches the link reads the whole design; a person sees the
 * drawing first.
 */
export function renderPage(input: {
  title: string
  brief: string
  links: { page: string; markdown: string; flow: string; svg: string; json: string }
  openUrl: string
  image: string
  updatedAt: Date
}): string {
  const { title, brief, links, openUrl, image, updatedAt } = input
  const description = firstLineOfBrief(brief)
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)} · isketch</title>
<meta name="description" content="${escape(description)}">
<link rel="canonical" href="${escape(links.page)}">
<link rel="alternate" type="text/markdown" href="${escape(links.markdown)}" title="Brief for AI agents">
<link rel="alternate" type="text/plain" href="${escape(links.flow)}" title=".flow source">
<meta property="og:type" content="website">
<meta property="og:site_name" content="isketch">
<meta property="og:title" content="${escape(title)} · isketch">
<meta property="og:description" content="${escape(description)}">
<meta property="og:url" content="${escape(links.page)}">
<meta property="og:image" content="${escape(image)}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${escape(title)}, as a diagram">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escape(title)} · isketch">
<meta name="twitter:description" content="${escape(description)}">
<meta name="twitter:image" content="${escape(image)}">
<style>
  :root { color-scheme: light dark; --ink: #111827; --muted: #6b7280; --line: #e5e7eb; --bg: #ffffff; --panel: #f9fafb; }
  @media (prefers-color-scheme: dark) { :root { --ink: #e5e7eb; --muted: #9ca3af; --line: #30363d; --bg: #0d1117; --panel: #161b22; } }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.55 ui-sans-serif, system-ui, sans-serif; }
  main { max-width: 960px; margin: 0 auto; padding: 24px 16px 48px; }
  header { display: flex; flex-wrap: wrap; gap: 12px; align-items: baseline; justify-content: space-between; }
  h1 { font-size: 22px; margin: 0; }
  nav a { color: inherit; margin-left: 14px; font-size: 13px; }
  .drawing { margin: 20px 0; padding: 16px; border: 1px solid var(--line); border-radius: 12px; background: #fff; overflow-x: auto; }
  .drawing img { display: block; max-width: 100%; height: auto; margin: 0 auto; }
  pre { white-space: pre-wrap; word-break: break-word; background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 16px; font: 13px/1.55 ui-monospace, monospace; }
  footer { color: var(--muted); font-size: 13px; }
</style>
</head>
<body>
<main>
  <header>
    <h1>${escape(title)}</h1>
    <nav>
      <a href="${escape(openUrl)}">Open in isketch</a>
      <a href="${escape(links.markdown)}">Brief (.md)</a>
      <a href="${escape(links.flow)}">.flow</a>
      <a href="${escape(links.svg)}">SVG</a>
    </nav>
  </header>
  <div class="drawing"><img src="${escape(links.svg)}" alt="${escape(title)}, as a diagram"></div>
  <h2>Brief</h2>
  <p>For people and AI agents alike: every shape, what it is for, every connection, and the source.</p>
  <pre>${escape(brief)}</pre>
  <footer>Updated ${escape(updatedAt.toISOString())}. Anyone with this link can read it.</footer>
</main>
</body>
</html>
`
}

function escape(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** What the link is, in the brief's own first line after its title. */
function firstLineOfBrief(brief: string): string {
  const line = brief
    .split('\n')
    .map((candidate) => candidate.trim())
    .find((candidate) => candidate && !candidate.startsWith('#'))
  return line ?? 'A diagram sketched in isketch, readable by people and AI agents.'
}
