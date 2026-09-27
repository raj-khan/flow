---
id: FL-82
title: Installable
status: Done
assignee:
  - '@raj-khan'
created_date: '2026-09-25 17:39'
updated_date: '2026-09-27 13:17'
labels:
  - frontend
  - pwa
milestone: m-2
dependencies:
  - FL-73
priority: low
type: feature
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Make isketch a PWA so it installs, works offline, and opens .flow files from the operating system.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Installable, with the app shell cached for offline use
- [x] #2 Opens .flow files from the OS via file handlers
- [x] #3 Accepts shared text as a new diagram via a share target

<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Manifest: start_url /new, file_handlers for .flow, a GET share_target at /new with title, text, url.
2. A hand-rolled service worker written by a Vite plugin at build, listing the hashed bundle and public shell files: navigations network first with the cached app or landing as fallback, same-origin assets cache first, cross-origin untouched. Registered in production only.
3. useLaunchFiles: launchQueue consumer opens a launched .flow file through the same path as Open (undoable, remembers the handle).
4. useSharedText: /new?text=... opens shared .flow text (or Mermaid) as an undoable change and clears the query.
5. e2e: service worker caches the shell and /new loads offline; ?text= opens a shared diagram; a simulated launchQueue opens a file.

<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Service worker is hand rolled (src/pwa/serviceWorker.js), written by a post-enforced Vite plugin so the HTML pages are in the bundle it lists. Cache lookups ignore Vary: a module import sends Origin and the install did not, so without it the lazy drawer chunk missed the cache offline.

launch_handler focus-existing was left out: it would hand a share to an open window through the launch queue instead of navigating to ?text=. Playwright blocks service workers except in the offline spec, so a cached build never outlives a rebuild in tests. nginx serves /sw.js no-cache.

Verified: e2e/installable.spec.js (6): offline reload of /new and a deep node route with the worker, CDP Page.getInstallabilityErrors [] and no manifest errors, manifest file_handlers and share_target, ?text= opens (undoable) and non-diagrams are refused, a stubbed launchQueue opens a .flow file. Unit tests for readSharedText and the worker source. e2e 125, vitest 254, lint and typecheck.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

isketch installs as a PWA that opens offline (a build-generated service worker caches the shell), opens .flow files from the system through file handlers, and takes shared .flow or Mermaid text as a new, undoable diagram through a share target. Verified with Chrome installability checks, offline e2e and launch/share e2e.
<!-- SECTION:FINAL_SUMMARY:END -->
