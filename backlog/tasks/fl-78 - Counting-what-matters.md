---
id: FL-78
title: Counting what matters
status: Done
assignee:
  - '@raj-khan'
created_date: '2026-09-25 17:39'
updated_date: '2026-09-25 20:24'
labels:
  - analytics
milestone: m-1
dependencies: []
priority: medium
type: feature
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

BACKLOG.md measures success by briefs copied and MCP installs, and nothing records either. Add privacy-friendly analytics with no cookie banner.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Page views are recorded without cookies
- [x] #2 Events: brief copied, exported, published, opened from a link, MCP setup copied
- [x] #3 Analytics is off in tests and local development

<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. src/api/analytics.js: analyticsScript(id) builds /analytics.js (GA4 via gtag, Consent Mode storage denied, no-op without VITE_GA_ID, under webdriver or in a frame) and track() for the app.
2. A Vite plugin emits /analytics.js at build and serves the no-op in dev; nginx serves it no-cache.
3. Every page loads it: index.html, convert.html, landing, docs/format, generated pages.
4. Events: brief_copied (useCopyBrief, landing), exported (ExportDialog), published (usePublish), opened_from_link (useOpenSharedLink), mcp_setup_copied (landing data-track).
5. Unit tests for the script and track(); e2e that tests stay offline.

<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Owner chose Google Analytics. client_storage none alone still set _ga cookies; Consent Mode default denied makes GA4 send cookieless pings (gcs=G100) with no cookies.

Frames stay silent (window.top !== window.self): the landing live editor and converter iframes would otherwise double page views and fire opened_from_link.

Verified with a VITE_GA_ID=G-TEST123 build in non-automated Chromium, GA collect requests intercepted: one page_view per page, brief_copied, exported, published (mocked server), opened_from_link, mcp_setup_copied; 0 cookies. Default build ships the no-op (dist/analytics.js). vitest 240, e2e 93, lint and typecheck clean.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Cookieless GA4 (Consent Mode, storage denied) on every page through one build-generated /analytics.js, counting page views and the five events; a no-op without VITE_GA_ID, in dev, in tests and in frames. Verified by intercepting GA requests in a GA build and by unit and e2e tests.
<!-- SECTION:FINAL_SUMMARY:END -->
