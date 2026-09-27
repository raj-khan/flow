---
id: FL-84
title: Import and export Excalidraw
status: Done
assignee:
  - '@raj-khan'
created_date: '2026-09-25 17:39'
updated_date: '2026-09-27 13:50'
labels:
  - import
milestone: m-3
dependencies: []
priority: high
type: feature
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

With draw.io done (FL-70), Excalidraw import lets anyone bring existing diagrams from either big tool to their agent.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 .excalidraw files and pasted Excalidraw clipboard data import
- [x] #2 Rectangles, ellipses, diamonds and text become shapes; bound arrows become connections; free drawing becomes ink
- [x] #3 Skipped elements are listed, as the draw.io import does
- [x] #4 Export to .excalidraw; unit tests cover a round trip

<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. src/domain/excalidraw.js: fromExcalidraw reads files and clipboard data (type excalidraw or excalidraw/clipboard); rectangles, ellipses, diamonds, loose text and frames become shapes named by their bound text; arrows bound at both ends become connections (label, dashed, two-way, reversed heads); freedraw becomes ink with pressure; skipped elements are counted into warnings; roughness sets sketch style.
2. toExcalidraw: frames first, shapes with bound text labels, bound arrows listed on both shapes, freedraw for ink; kind, description and notes in customData so a round trip is exact; seeded so output is stable.
3. Import dialog format; Export dialog format; Excalidraw clipboard pastes onto the canvas.
4. Unit tests (import, export, round trip) and e2e (import with skipped list, export, paste).

<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Round trip is exact through customData (isketch kind, description, notes): Excalidraw keeps unknown customData on elements. A standalone text shape keeps its own box; a bound label is centred in what holds it. An arrow with its head at the start only is read the way it points. Frames map both ways (Excalidraw frame and magicframe). The import dialog lists warnings without a line number when a format has none.

Verified: src/domain/**tests**/excalidraw.spec.js (9: shapes, bound labels, arrows with label and dashes, freedraw with pressure, skipped list, sketch style, clipboard form, refusal, export shape, round trip, stable bytes); e2e/excalidraw.spec.js (2: import with the skipped list, export file with bound arrow, clipboard paste as one undo). e2e 138, vitest 279, lint and typecheck.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Excalidraw both ways: .excalidraw files and Excalidraw clipboard data import (in the Import dialog and by pasting on the canvas) with skipped elements listed, and Export writes a .excalidraw file that round-trips exactly. Verified with unit and e2e tests.
<!-- SECTION:FINAL_SUMMARY:END -->
