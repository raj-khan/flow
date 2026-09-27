import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Inject,
  NotFoundException,
  NotImplementedException,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common'
import type { Request, Response } from 'express'

import { CONFIG, type Config } from '../config.js'
import { loadDomain } from '../domain.js'
import { DiagramsService } from './diagrams.service.js'
import { renderEmbed, renderPage, svgSize } from './page.js'
import { renderOgPng } from './preview.js'

/** A text body arrives as a string; a JSON one may carry `{ text }`. */
const textOf = (body: unknown) =>
  typeof body === 'string' ? body : (body as { text?: unknown } | undefined)?.text

const tokenOf = (authorization: string | undefined) =>
  /^Bearer\s+(\S+)$/i.exec(authorization ?? '')?.[1] ?? ''

@Controller()
export class DiagramsController {
  constructor(
    private readonly diagrams: DiagramsService,
    @Inject(CONFIG) private readonly config: Config,
  ) {}

  @Get('health')
  health() {
    return { ok: true }
  }

  /** The diagram itself as the link preview, one PNG per revision. */
  @Get('d/:id/og.png')
  async ogImage(@Param('id') id: string, @Res() res: Response) {
    const { row, document } = await this.diagrams.load(id)
    const domain = await loadDomain()
    const svg = domain.renderSvg(document)
    const png = renderOgPng(svg, document.title)

    res.setHeader('ETag', `"${row.id}-${row.revision}"`)
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.setHeader('X-Robots-Tag', 'noindex')
    res.setHeader('Access-Control-Allow-Origin', '*')
    return res.type('image/png').send(png)
  }

  /** The drawing alone, for an iframe; any site may frame it. */
  @Get('d/:id/embed')
  async embed(@Param('id') id: string, @Res() res: Response) {
    const { row, document } = await this.diagrams.load(id)
    const domain = await loadDomain()
    const sketchFont = document.style === 'sketch' ? await domain.sketchFont() : ''
    const { url } = this.diagrams.describe(row.id, row.revision)

    res.setHeader('ETag', `"${row.id}-${row.revision}-embed"`)
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Content-Security-Policy', 'frame-ancestors *')
    res.setHeader('X-Robots-Tag', 'noindex')
    return res.type('text/html; charset=utf-8').send(
      renderEmbed({
        title: document.title,
        svg: domain.renderSvg(document, { sketchFont }),
        pageUrl: url,
      }),
    )
  }

  /**
   * oEmbed (https://oembed.com), so pasting a link into Notion, Medium or a
   * docs site gives the live drawing rather than a bare link.
   */
  @Get('oembed')
  async oembed(
    @Query('url') url: string | undefined,
    @Query('format') format: string | undefined,
    @Query('maxwidth') maxwidth: string | undefined,
    @Query('maxheight') maxheight: string | undefined,
    @Res() res: Response,
  ) {
    if (format && format !== 'json') throw new NotImplementedException('Only JSON is offered.')
    const prefix = `${this.config.publicUrl}/d/`
    const id = url?.startsWith(prefix)
      ? /^([A-Za-z0-9]+)/.exec(url.slice(prefix.length))?.[1]
      : undefined
    if (!id) throw new NotFoundException(`Give the url of a diagram, starting ${prefix}.`)

    const { row, document } = await this.diagrams.load(id)
    const domain = await loadDomain()
    const { links } = this.diagrams.describe(row.id, row.revision)
    // Sized to the drawing, within what the site asks for, with room for the footer.
    const drawing = svgSize(domain.renderSvg(document))
    const limit = {
      width: Math.min(Number(maxwidth) || 800, 1200),
      height: Math.min(Number(maxheight) || 800, 1200),
    }
    const scale = Math.min(1, limit.width / drawing.width, (limit.height - 26) / drawing.height)
    const width = Math.round(drawing.width * scale)
    const height = Math.round(drawing.height * scale) + 26

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 'public, max-age=60')
    return res.json({
      version: '1.0',
      type: 'rich',
      provider_name: 'isketch',
      provider_url: this.config.appUrl,
      title: document.title,
      html: `<iframe src="${links.embed}" width="${width}" height="${height}" style="border:0;max-width:100%" loading="lazy" title="${document.title.replace(/"/g, '&quot;')}"></iframe>`,
      width,
      height,
      thumbnail_url: `${links.page}/og.png`,
      thumbnail_width: 1200,
      thumbnail_height: 630,
    })
  }

  @Post('api/diagrams')
  publish(@Body() body: unknown) {
    return this.diagrams.publish(textOf(body) as string)
  }

  @Put('api/diagrams/:id')
  update(@Param('id') id: string, @Headers('authorization') auth: string, @Body() body: unknown) {
    return this.diagrams.update(id, tokenOf(auth), textOf(body) as string)
  }

  @Delete('api/diagrams/:id')
  @HttpCode(204)
  async unpublish(@Param('id') id: string, @Headers('authorization') auth: string) {
    await this.diagrams.unpublish(id, tokenOf(auth))
  }

  /**
   * One link, several readings: the page for people and AI fetchers, `.md` the
   * brief, `.flow` the source, `.svg` the drawing, `.json` the document.
   */
  @Get('d/:file')
  async read(@Param('file') file: string, @Req() req: Request, @Res() res: Response) {
    const [, id, extension = ''] = /^([^.]+)(?:\.(\w+))?$/.exec(file) ?? []
    if (!id) throw new NotFoundException()
    const { row, document } = await this.diagrams.load(id)
    const domain = await loadDomain()

    const etag = `"${row.id}-${row.revision}${extension ? `.${extension}` : ''}"`
    res.setHeader('ETag', etag)
    res.setHeader('Cache-Control', 'public, max-age=60')
    res.setHeader('X-Robots-Tag', 'noindex')
    res.setHeader('Access-Control-Allow-Origin', '*')
    // Unchanged since the asker's copy: say so, and send nothing.
    if (req.headers['if-none-match'] === etag) {
      if (extension === 'svg') res.setHeader('Cache-Control', 'no-cache, max-age=0')
      return res.status(304).end()
    }

    switch (extension) {
      case 'md':
        return res.type('text/markdown; charset=utf-8').send(domain.toBrief(document))
      case 'flow':
        return res.type('text/plain; charset=utf-8').send(row.text)
      case 'svg': {
        // An image in a README goes through GitHub's proxy, which keeps it as long as it is
        // told to: always ask again, so an update shows, and a 304 keeps that cheap.
        res.setHeader('Cache-Control', 'no-cache, max-age=0')
        const sketchFont = document.style === 'sketch' ? await domain.sketchFont() : ''
        return res.type('image/svg+xml').send(domain.renderSvg(document, { sketchFont }))
      }
      case 'json':
        return res.json({ ...this.diagrams.describe(row.id, row.revision), document })
      case '': {
        const { links } = this.diagrams.describe(row.id, row.revision)
        const openUrl = `${this.config.appUrl}/flow${await domain.encodeShare(document)}`
        return res.type('text/html; charset=utf-8').send(
          renderPage({
            title: document.title,
            brief: domain.toBrief(document),
            links,
            openUrl,
            image: `${links.page}/og.png`,
            updatedAt: new Date(row.updatedAt),
          }),
        )
      }
      default:
        throw new NotFoundException(
          `No .${extension} for a diagram. Try .md, .flow, .svg or .json.`,
        )
    }
  }
}
