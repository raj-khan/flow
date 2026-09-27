// The Claude Code plugin's MCP server: the same server as `isketch mcp`, for
// the folder Claude Code runs it in. scripts/make-plugin.mjs bundles it, with
// everything it needs, into plugin/server/.
import process from 'node:process'

import { serve } from './mcp.mjs'

serve(process.argv[2] ?? '.')
