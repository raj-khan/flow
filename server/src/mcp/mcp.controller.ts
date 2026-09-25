import { Body, Controller, Get, Header, HttpCode, Options, Post, Res } from '@nestjs/common'
import type { Response } from 'express'

import { McpService } from './mcp.service.js'

/**
 * MCP Streamable HTTP: JSON-RPC messages POSTed to `/mcp`, each answered with
 * plain JSON. Stateless, so a client may connect, call and forget; browser
 * clients get CORS, since the tokens a write needs travel as tool arguments
 * and never as cookies.
 */
@Controller()
export class McpController {
  constructor(private readonly mcp: McpService) {}

  @Post('mcp')
  async call(@Body() body: unknown, @Res() res: Response) {
    const messages = Array.isArray(body) ? body : [body]
    const responses = []
    for (const message of messages) responses.push(await this.mcp.handle(message))
    const present = responses.filter(
      (response): response is NonNullable<typeof response> => !!response,
    )

    res.setHeader('MCP-Protocol-Version', '2025-06-18')
    if (!present.length) return res.status(202).send()
    return res.status(200).json(Array.isArray(body) ? present : present[0])
  }

  /** No listening stream: this server answers only what it is asked. */
  @Get('mcp')
  @HttpCode(405)
  @Header('Allow', 'POST, OPTIONS')
  stream() {}

  @Options('mcp')
  @HttpCode(204)
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Access-Control-Allow-Methods', 'POST, OPTIONS')
  @Header('Access-Control-Allow-Headers', 'Content-Type, Accept, MCP-Protocol-Version')
  @Header('Allow', 'POST, OPTIONS')
  preflight() {}
}
