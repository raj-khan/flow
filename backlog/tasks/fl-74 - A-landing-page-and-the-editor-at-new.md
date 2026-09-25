---
id: FL-74
title: 'A landing page, and the editor at /new'
status: To Do
assignee: []
created_date: '2026-09-25 17:39'
labels:
  - seo
  - frontend
milestone: m-1
dependencies:
  - FL-73
priority: high
type: feature
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Today `/` redirects straight into the client-rendered editor, so there is nothing for search engines or AI fetchers to read. Give `/` a prerendered landing page and move the editor to `/new` (the Excalidraw one-click-to-canvas pattern).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 / is prerendered static HTML: the loop in one line, a live canvas to try, a short clip of sketch to Copy for AI to Claude building it, and the MCP setup line
- [ ] #2 The editor lives at /new; /flow and existing share-hash links still open
- [ ] #3 vercel.json rewrites only app routes to the SPA; content pages are served as static HTML
- [ ] #4 e2e covers the landing page and the redirect of old links
<!-- AC:END -->
