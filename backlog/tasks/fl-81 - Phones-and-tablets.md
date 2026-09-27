---
id: FL-81
title: Phones and tablets
status: Done
assignee:
  - '@raj-khan'
created_date: '2026-09-25 17:39'
updated_date: '2026-09-27 13:08'
labels:
  - frontend
  - responsive
milestone: m-2
dependencies:
  - FL-79
priority: high
type: feature
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

There are no responsive styles in src/ and no touch gestures. Anyone opening a shared link on a phone gets a broken desktop layout.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Below 768px the tool bar docks at the bottom, the menu collapses to one button, panels and dialogs become bottom sheets, and nothing scrolls sideways at 360px
- [x] #2 Pinch to zoom, two-finger pan, long press for the context menu, touch targets at least 44px
- [x] #3 The pen supports stylus pressure and palm rejection
- [x] #4 A shared or hosted link on a phone opens a fitted read-only view with Copy for AI and Edit
- [x] #5 The e2e suite also runs at a phone and a tablet viewport

<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Responsive shell below 768px (Tailwind max-md): tool bar docks bottom centre; the menu island is one button; undo/redo move to the top bar; view controls shrink to fit and zoom level; minimap hidden; library, text pane, details drawer and dialogs become bottom sheets; toasts sit above the tool bar; no sideways scroll at 360px.
2. Touch: touch-action none on the canvas (Vue Flow already pinch-zooms and pans with d3-zoom); 44px targets under pointer: coarse; a canvas context menu (Open, Rename, Duplicate, Delete; Remove for a connection) on right click and on a 500ms long press.
3. Pen: record pointer pressure per point as x,y,p; draw pressure strokes as a variable-width outline (perfect-freehand) in the app and the SVG renderer; once a stylus is seen, touch pointers do not draw (palm rejection).
4. Viewer: a diagram opened from a link on a phone-sized screen opens read-only and fitted, with Copy for AI and Edit.
5. Playwright phone (Pixel 7) and tablet (Galaxy Tab S4) projects running e2e/mobile/*.spec.js.

<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Vue Flow cannot pinch when a finger lands on a shape: d3-drag on the node stops the touch propagating to d3-zoom. useTwoFingers handles two-finger pinch and pan in the capture phase, keeping the point between the fingers fixed, so it works over shapes and leaves no Move in history.

Long press is a 500ms timer on touch/pen pointers (iOS sends no contextmenu); the ending tap is swallowed. The same menu opens on right click: Open details, Rename, Duplicate, Delete; Edit label and Remove for a connection.

Pressure is stored as x,y,p per point only when a stylus drew; perfect-freehand turns it into a filled outline in the app and renderSvg. Plain strokes are unchanged. Palm rejection: once a stylus has drawn, touch never draws; a second pointer never joins a stroke.

On a phone, undo/redo join the top bar and the view controls shrink to fit and zoom; the minimap hides. The viewer refits after the shared diagram is measured, because Vue Flow was already mounted with the previous one.

Verified: e2e/mobile/touch.spec.js on phone (Pixel 7) and tablet (Galaxy Tab S4 landscape), 12 runs: no sideways scroll at 360px, tool bar position, 44px targets, CDP two-finger pinch and pan, long press menu and undo, sheets, pen pressure and palm, viewer fitted with Copy for AI and Edit; right-click menu in tools.spec.js; full e2e 119, vitest 247, lint and typecheck; screenshots at 360px, Pixel 7 and tablet.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Phones and tablets: a thumb-first layout below 768px with bottom sheets, 44px targets, pinch and two-finger pan anywhere, a long-press and right-click context menu, stylus pressure with palm rejection, and a fitted read-only viewer for links opened on a phone. Verified by phone and tablet Playwright projects and screenshots.
<!-- SECTION:FINAL_SUMMARY:END -->
