---
id: FL-88
title: Embeds that stay current
status: Done
assignee:
  - '@raj-khan'
created_date: '2026-09-25 17:39'
updated_date: '2026-09-27 14:25'
labels:
  - server
  - growth
milestone: m-3
dependencies:
  - FL-71
priority: medium
type: feature
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Let hosted diagrams live inside READMEs, docs and Notion, each a link back to isketch.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 /d/:id.svg works as an image in a GitHub README and updates when the diagram does
- [x] #2 An iframe embed and an oEmbed endpoint for Notion, Medium and docs sites

<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. /d/:id.svg: Cache-Control no-cache, an ETag per revision and format, and an explicit 304 on If-None-Match, so GitHubs image proxy asks every time and an update shows.
2. /d/:id/embed: the drawing alone, fitted, linking back, framable by any site (frame-ancestors *).
3. /oembed?url=: rich oEmbed JSON with an iframe sized to the drawing within maxwidth/maxheight, a thumbnail, 404 for other links and 501 for XML; the page advertises it with an application/json+oembed link.
4. Share: Copy README image and Copy embed code, built from the link.
5. Server tests against PostgreSQL; the publish e2e covers the two buttons.

<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Express did not answer the conditional request with 304 by itself through Nest, so the read handler compares If-None-Match itself. ETags now include the format, so a page and its SVG never share one.

Verified: server tests against PostgreSQL 16 in Docker (16 pass; new: svg no-cache with 304 until an update then 200 with the new text; embed framable with the drawing and a link back; oEmbed JSON, sizing, thumbnail, discovery link, 404 and 501). e2e publish.spec covers both copy buttons. e2e 144, vitest 300, lint and typecheck.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Hosted diagrams embed and stay current: the .svg link revalidates on every view so a README image shows each new version, /d/:id/embed is an iframe any site may frame, and /oembed lets Notion, Medium and docs sites embed a pasted link. Share copies both. Verified with server tests against PostgreSQL and the publish e2e.
<!-- SECTION:FINAL_SUMMARY:END -->
