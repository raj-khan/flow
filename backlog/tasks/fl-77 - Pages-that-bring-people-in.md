---
id: FL-77
title: Pages that bring people in
status: Done
assignee:
  - '@raj-khan'
created_date: '2026-09-25 17:39'
updated_date: '2026-09-25 19:03'
labels:
  - seo
  - content
milestone: m-1
dependencies:
  - FL-74
priority: medium
type: feature
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Prerendered pages built from data, each with the diagram, its .flow source, its brief and Open in isketch. Templates, converter tools (features the app already has) and honest comparisons. Patterns: shipseo free tools, openlookup-web compare/[slug], aiagentflow.dev use-cases/[slug].
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 /templates/:slug pages generated from examples/, so a new template is a pull request; at least 10 at launch (URL shortener, chat app, rate limiter, RAG pipeline, auth flow, CI/CD, microservices, SaaS database, mobile app screens)
- [x] #2 /convert pages for Mermaid to draw.io, draw.io to Mermaid, SQL to ER diagram, docker-compose to diagram, OpenAPI to diagram, converting in the browser
- [x] #3 /vs/excalidraw, /vs/drawio, /vs/eraser, /vs/tldraw say fairly what each does better and what isketch adds
- [x] #4 Every page is in the sitemap and has its own title, description and OG image

<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Ten .flow templates in examples/templates.
2. scripts/make-pages.mjs prerenders /templates, /vs and /convert pages into public/, each with its own head and a Playwright-drawn OG image.
3. convert.html is a second Vite entry that runs the existing converters in the browser; each /convert page embeds it.
4. make-sitemap.mjs lists every generated page.
5. e2e/pages.spec.js covers templates, comparisons, converters and heads.

<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Converters fail politely: read() results with errors throw a readable message instead of a stack.

Fixed pages.spec: #flow is a textarea, so it asserts toHaveValue, not toContainText. Removed em-dashes from generated titles and copy (" · isketch" separator).

Verified: npx playwright test (92 passed), vitest 235 passed, eslint and typecheck clean; all five converters produce output in a production build (probe script); sitemap has 25 URLs; 10 templates, 4 comparisons.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Added 10 templates, 4 honest comparisons and 5 in-browser converters as prerendered pages, each with its own title, description and OG image, all in the sitemap. Verified with e2e/pages.spec.js (6 tests), the full e2e suite and a production-build probe of every converter.
<!-- SECTION:FINAL_SUMMARY:END -->
