---
id: FL-91
title: Launch kit
status: In Progress
assignee:
  - '@raj-khan'
created_date: '2026-09-25 17:39'
updated_date: '2026-09-27 14:52'
labels:
  - launch
milestone: m-4
dependencies:
  - FL-73
  - FL-74
  - FL-75
priority: medium
type: chore
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Mostly the owner's to do, listed so it is not forgotten.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 A 60 second demo video (made with idemo.video) and a README hero GIF of the loop
- [ ] #2 Posts: Show HN, Product Hunt, r/ClaudeAI, r/ChatGPTCoding, dev.to, X
- [ ] #3 Listings: awesome-mcp-servers, awesome-claude-code, AlternativeTo against Excalidraw, draw.io and Eraser
- [x] #4 An optional, removable Made with isketch mark on exported PNGs and hosted pages

<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. What lives in the repo, done here: a README hero GIF of the loop (recorded with the clip, encoded in the browser with gifenc, since there is no ffmpeg), the landing clip re-recorded with the current UI, and an optional Made with isketch mark on exported pictures (on by default, one checkbox to take it off, remembered) and hosted pages.
2. What is the owners: the 60 second demo video (idemo.video), the posts and the listings; drafted ready to post in docs/launch.md, with the registry and marketplace steps in docs/listings.md.

<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Done in the repo: docs/loop.gif (92 frames, 3.1 MB, 720px) from npm run clip, which also re-records public/demo.webm; renderSvg credit option; Export checkbox; hosted page footer credit. Verified: renderSvg spec, export e2e (mark on by default, off when unticked and remembered), server test for the page footer; vitest 312, e2e 146, server 16.

Left for the owner: AC #1 needs the idemo.video demo (the GIF half is done); AC #2 posts and AC #3 listings are drafted in docs/launch.md and docs/listings.md and need the owners accounts, after isketch.online is live.
<!-- SECTION:NOTES:END -->
