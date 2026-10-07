---
id: FL-97
title: Landing page at the site root
status: Done
assignee: []
created_date: '2026-10-07 09:35'
updated_date: '2026-10-07 09:38'
labels:
  - bug
dependencies: []
priority: high
ordinal: 27000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

isketch.online/ serves the editor, not the landing page: Vercel serves dist/index.html for / before the rewrite to /landing.html applies. Build the editor as app.html so / falls through to the landing, and /new and /flow rewrite to the app.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 isketch.online/ shows the landing page
- [x] #2 /new, /new/node/:id and /flow still open the editor, in Vercel, nginx, vite dev and preview
- [x] #3 The service worker still opens the app offline

<!-- AC:END -->
