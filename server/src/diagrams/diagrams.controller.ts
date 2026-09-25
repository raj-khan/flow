import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Post,
  Put,
  Res,
} from '@nestjs/common'
import type { Response } from 'express'

import { CONFIG, type Config } from '../config.js'
import { loadDomain } from '../domain.js'
import { DiagramsService } from './diagrams.service.js'
import { renderPage } from './page.js'
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
  async read(@Param('file') file: string, @Res() res: Response) {
    const [, id, extension = ''] = /^([^.]+)(?:\.(\w+))?$/.exec(file) ?? []
    if (!id) throw new NotFoundException()
    const { row, document } = await this.diagrams.load(id)
    const domain = await loadDomain()

    res.setHeader('ETag', `"${row.id}-${row.revision}"`)
    res.setHeader('Cache-Control', 'public, max-age=60')
    res.setHeader('X-Robots-Tag', 'noindex')
    res.setHeader('Access-Control-Allow-Origin', '*')

    switch (extension) {
      case 'md':
        return res.type('text/markdown; charset=utf-8').send(domain.toBrief(document))
      case 'flow':
        return res.type('text/plain; charset=utf-8').send(row.text)
      case 'svg': {
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
