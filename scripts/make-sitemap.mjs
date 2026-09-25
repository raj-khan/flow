/**
 * Writes public/robots.txt and public/sitemap.xml from the pages that exist:
 * a short list of hand-placed pages, plus every generated page under
 * public/templates, public/vs and public/convert (npm run pages creates and
 * refreshes them). Run with `npm run sitemap` and commit the results, so a
 * deploy needs nothing but static files.
 */
import { readdir, writeFile } from 'node:fs/promises'

const siteUrl = (process.env.VITE_SITE_URL ?? 'https://isketch.online').replace(/\/+$/, '')
const publicDir = new URL('../public/', import.meta.url)

/** Pages with no directory of their own. */
const STATIC_PAGES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/new', changefreq: 'weekly', priority: '0.8' },
  { path: '/docs/format', changefreq: 'monthly', priority: '0.9' },
]

/** Every directory with an index.html in it, deepest last. */
async function generatedPages() {
  const pages = []
  for (const section of ['convert', 'templates', 'vs']) {
    const base = new URL(`${section}/`, publicDir)
    const entries = await readdir(base, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      if (entry.isDirectory()) pages.push(`/${section}/${entry.name}`)
    }
    pages.push(`/${section}`)
  }
  return pages.map((path) => ({ path, changefreq: 'weekly', priority: '0.7' }))
}

const PAGES = [...STATIC_PAGES, ...(await generatedPages())]
const today = new Date().toISOString().slice(0, 10)

const urls = PAGES.map(
  (page) =>
    `  <url>\n    <loc>${siteUrl}${page.path === '/' ? '/' : page.path}</loc>\n` +
    `    <lastmod>${today}</lastmod>\n    <changefreq>${page.changefreq}</changefreq>\n` +
    `    <priority>${page.priority}</priority>\n  </url>`,
).join('\n')

await writeFile(
  new URL('sitemap.xml', publicDir),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
)
await writeFile(
  new URL('robots.txt', publicDir),
  `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
)
console.log(`robots.txt and sitemap.xml for ${PAGES.length} page(s) at ${siteUrl}`)
