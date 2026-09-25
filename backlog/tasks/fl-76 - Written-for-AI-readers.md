---
id: FL-76
title: Written for AI readers
status: Done
assignee:
  - '@pi'
created_date: '2026-09-25 17:39'
updated_date: '2026-09-25 18:25'
labels:
  - seo
  - docs
milestone: m-1
dependencies: []
priority: medium
type: docs
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Make isketch legible to AI assistants and search: an llms.txt like idemo.video and openlookup-web, and the .flow format as a public page so an agent can look it up.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 /llms.txt and /llms-full.txt describe isketch, the .flow format, the MCP tools and the CLI
- [x] #2 /docs/format is a prerendered page with the .flow spec and examples

<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. scripts/make-docs.mjs (npm run docs) generates public/llms.txt and public/llms-full.txt from a template with VITE_SITE_URL: what isketch is, the .flow spec (sourced from the same facts as the README section), the five MCP tools (stdio) and the hosted /mcp tools, and the CLI commands. 2. The same script renders public/docs/format/index.html, a prerendered static page with the spec, inline examples and a copyable link to open one in the editor; styling follows the landing. 3. sitemap gains /docs/format; README links llms.txt. 4. Verified by build output + e2e that /docs/format and /llms.txt serve on the preview server.

<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

npm run docs (scripts/make-docs.mjs) builds public/llms.txt and public/llms-full.txt from docs templates (what isketch is, the full .flow spec with real examples, the brief, the five stdio MCP tools + hosted read/publish/update tools with setup lines, the CLI as it exists, hosted links), and public/docs/format/index.html from docs/format.template.html with the architecture + signup examples inlined (text beside its rendered SVG) and a link that opens the example live. Sitemap gains /docs/format; README's What works today notes the AI readers. A preview middleware change also 301s clean directory URLs (/docs/format) to their page instead of the SPA fallback. Verified: e2e checks both llms files' content and the format page (79 e2e pass), 235 unit, typecheck, lint.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Added the AI-reader pages, generated and committed: /llms.txt (the index: what isketch is, links to the format, tools and CLI) and /llms-full.txt (everything in one file: the .flow spec with real examples, the brief, MCP tools over stdio and HTTP with setup lines, the CLI, hosted links), plus /docs/format — a prerendered static page with the full spec, the architecture and signup examples as text beside their renderings, and a live Open-this-diagram link. Verified by e2e on the built site (both files serve their content, the page serves the spec) with the whole 79-test suite green.
<!-- SECTION:FINAL_SUMMARY:END -->
