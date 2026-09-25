/**
 * Writes public/robots.txt and public/sitemap.xml from one list of pages, so
 * the sitemap cannot fall behind the site: add the page here when it ships.
 * Run with `npm run sitemap` and commit the results, so a deploy needs
 * nothing but static files.
 */
import { writeFile } from 'node:fs/promises'

const siteUrl = (process.env.VITE_SITE_URL ?? 'https://isketch.online').replace(/\/+$/, '')

/** Every page a person or a crawler can open without knowing a diagram. */
const PAGES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/flow', changefreq: 'weekly', priority: '0.8' },
]

const publicDir = new URL('../public/', import.meta.url)
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
