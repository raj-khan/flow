import { Resvg } from '@resvg/resvg-js'

/**
 * A hosted diagram as its own 1200x630 link preview: the drawing the app
 * renders, set on the brand canvas with its title, rasterised to PNG. The
 * rasteriser needs a real font, so text names one DejaVu Sans ships with the
 * Docker image and most systems; the drawing itself is text placed by the
 * renderer, so only letterforms differ from the browser, never layout.
 */

const WIDTH = 1200
const HEIGHT = 630
const PAD = 48
const TITLE_BAND = 96

export function renderOgPng(svg: string, title: string): Buffer {
  const viewBox = /viewBox="([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+)"/.exec(svg)
  const viewBoxWidth = Math.max(1, Number(viewBox?.[3] ?? 100))
  const viewBoxHeight = Math.max(1, Number(viewBox?.[4] ?? 60))

  const available = {
    width: WIDTH - PAD * 2,
    height: HEIGHT - PAD * 2 - TITLE_BAND,
  }
  const scale = Math.min(available.width / viewBoxWidth, available.height / viewBoxHeight)
  const width = viewBoxWidth * scale
  const height = viewBoxHeight * scale
  // The drawing goes in nested: its own width and height give way to where it
  // sits in the preview, keeping the viewBox that scales it.
  const rootTag = /^<svg\b[^>]*>/.exec(svg)?.[0] ?? '<svg>'
  const drawing = svg
    .replace(rootTag, rootTag.replace(/\s(?:width|height)="[^"]*"/g, ''))
    .replace(
      /^<svg /,
      `<svg x="${((WIDTH - width) / 2).toFixed(1)}" y="${(TITLE_BAND + PAD + (available.height - height) / 2).toFixed(1)}" width="${width.toFixed(1)}" height="${height.toFixed(1)}" `,
    )

  const page = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#f4f5f8"/>
  <text x="${PAD}" y="${PAD + 40}" font-family="DejaVu Sans, sans-serif" font-size="34" font-weight="bold" fill="#14181f">${escapeXml(title)}</text>
  <text x="${WIDTH - PAD}" y="${PAD + 40}" text-anchor="end" font-family="DejaVu Sans, sans-serif" font-size="22" fill="#94a3b8">isketch</text>
  ${drawing}
</svg>`

  const resvg = new Resvg(page, {
    font: { loadSystemFonts: true, defaultFontFamily: 'DejaVu Sans' },
  })
  return resvg.render().asPng()
}

function escapeXml(text: string): string {
  return text.replace(/[<>&"']/g, (char) => `&#${char.charCodeAt(0)};`)
}
