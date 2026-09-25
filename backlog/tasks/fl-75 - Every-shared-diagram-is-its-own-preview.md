---
id: FL-75
title: Every shared diagram is its own preview
status: Done
assignee:
  - '@pi'
created_date: '2026-09-25 17:39'
updated_date: '2026-09-25 18:11'
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

- [x] #1 /d/:id/og.png is rendered from the diagram with the existing SVG renderer and a PNG rasteriser, cached by revision
- [x] #2 The hosted page sets og:title to the diagram title and og:description to the first line of its brief, with twitter:card summary_large_image
- [x] #3 Server tests cover the image route and the tags

<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

server/src/diagrams/preview.ts composes a 1200x630 brand canvas with the diagram's own renderSvg output nested (viewBox-parsed, letterboxed) and its title, rasterised with @resvg/resvg-js (DejaVu Sans as the text font — apk font-dejavu added to the server image; letterforms differ from the browser, layout never does). Route GET /d/:id/og.png serves it with ETag id-revision and Cache-Control immutable (one image per revision). renderPage now sets og:title (title · isketch), og:description (the brief's first line), og:image/og:image:alt, twitter:card summary_large_image with twitter:title/description/image, plus canonical and og:url. Verified: 13 server tests against PostgreSQL, including PNG magic bytes and 1200x630 dimensions, tag presence, and a revision bump changing the ETag.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Every hosted diagram is its own link preview: /d/:id/og.png rasterises the diagram (existing SVG renderer + @resvg/resvg-js) onto a 1200x630 brand card with its title, served immutable per revision, and the hosted page's head now carries og:title (the diagram title), og:description (the brief's first line) and twitter:card summary_large_image pointing at that PNG. Verified by the server test suite against PostgreSQL (PNG dimensions, headers, tags, revision-keyed ETag); README documents the route.
<!-- SECTION:FINAL_SUMMARY:END -->
