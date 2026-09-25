---
id: FL-80
title: Full screen and focus
status: Done
assignee:
  - '@raj-khan'
created_date: '2026-09-25 17:39'
updated_date: '2026-09-25 20:51'
labels:
  - frontend
milestone: m-2
dependencies:
  - FL-79
priority: medium
type: feature
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Let people give the diagram the whole screen, for thinking and for presenting.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 F or a button toggles browser full screen
- [x] #2 Zen mode (Alt+Z) hides every tool until the pointer nears an edge
- [x] #3 Zoom to fit (Shift+1) and to selection (Shift+2), and a minimap that can be hidden
- [x] #4 The help dialog lists the new shortcuts

<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. useFullScreen (Fullscreen API) and useViewKeys: F toggles full screen, Alt+Z (physical key) toggles zen; menu items for both.
2. Zen mode in the store; FlowView fades the header and bottom islands, bringing each back when the pointer is within 96px of its edge or it holds focus; the minimap hides too.
3. CanvasControls binds Shift+1 (fit) and Shift+2 (selection, or fit when nothing is selected) and gains a Minimap toggle remembered in this browser.
4. @vue-flow/minimap bottom right, themed from tokens.
5. Help: a View group from the same data; Alt reads Option on a Mac.

<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Verified: e2e/view.spec.js (5 tests: F and menu full screen via document.fullscreenElement, zen opacity and edge reveal, Shift+1/Shift+2 zoom change, minimap toggle persisting across reload, help lists the shortcuts); full e2e 106, vitest 243, lint and typecheck; minimap checked by screenshot in light and dark.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Full screen on F and in the menu, zen mode on Alt+Z that hides every tool until the pointer nears an edge, Shift+1 and Shift+2 to fit the diagram or the selection, and a minimap that can be hidden and stays hidden; all listed in help. Verified with e2e/view.spec.js and the full suite.
<!-- SECTION:FINAL_SUMMARY:END -->
