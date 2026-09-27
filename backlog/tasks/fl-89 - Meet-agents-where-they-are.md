---
id: FL-89
title: Meet agents where they are
status: In Progress
assignee:
  - '@raj-khan'
created_date: '2026-09-25 17:39'
updated_date: '2026-09-27 14:36'
labels:
  - mcp
  - growth
milestone: m-3
dependencies: []
priority: high
type: feature
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Distribution to where coding agents already run.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 A Claude Code plugin with a skill that teaches the .flow format and sets up the MCP server
- [ ] #2 Listed in the MCP registry and the main MCP directories
- [x] #3 A VS Code extension previews and edits .flow files beside the code

<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Claude Code plugin in plugin/, with .claude-plugin/marketplace.json at the root so the repo is its own marketplace: a skill that teaches the .flow format and when to read or update a diagram, and .mcp.json running the MCP server bundled into plugin/server/ (rolldown, one file plus the font) so a clone needs no install. CI checks the bundle matches the source.
2. VS Code extension in vscode/: a flow language with a TextMate grammar, a live preview beside the editor (the apps own renderer, dark with VS Code), errors as diagnostics by line, and Open in isketch. Bundled by scripts/make-vscode.mjs; tested against a fake of the vscode API.
3. Listings: server.json for the official MCP registry (the hosted /mcp endpoint) and docs/listings.md with each step, for the owner to run once isketch.online is live.

<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Verified plugin: claude plugin validate passes for ./plugin and the marketplace; the bundled server run from a copy of plugin/ alone (no node_modules) answers initialize, lists its five tools, reads a brief and renders a sketch with the font embedded. sketchFont no longer throws when the font package is absent (require.resolve was outside the catch).

Verified VS Code: vscode/src/**tests**/extension.spec.js (5, through a fake vscode API aliased in the test config: commands registered, preview follows edits, errors underlined on their line with the last good drawing kept, Open in isketch link, escaping and CSP); npx @vscode/vsce package builds a 60 KB .vsix with the bundle, font, grammar and README. vitest 305, e2e 144, lint and typecheck.

Open: AC #2 (listing in the MCP registry and directories) is prepared (server.json, docs/listings.md) but publishing needs the owners GitHub, registry, directory and marketplace accounts and the hosted server at isketch.online, so it is left for the owner.
<!-- SECTION:NOTES:END -->
