---
id: FL-75
title: Every shared diagram is its own preview
status: To Do
assignee: []
created_date: '2026-09-25 17:39'
labels:
  - seo
  - server
milestone: m-1
dependencies:
  - FL-71
priority: high
type: feature
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Hosted links (`server/src/diagrams/page.ts`) have one generic description and no preview image. Render the diagram itself as the link preview, so every link posted in chat or a pull request shows the sketch: the main viral loop.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 /d/:id/og.png is rendered from the diagram with the existing SVG renderer and a PNG rasteriser, cached by revision
- [ ] #2 The hosted page sets og:title to the diagram title and og:description to the first line of its brief, with twitter:card summary_large_image
- [ ] #3 Server tests cover the image route and the tags
<!-- AC:END -->
