---
id: FL-94
title: Drawn arrows become connections
status: Done
assignee:
  - '@raj-khan'
created_date: '2026-09-30 13:40'
updated_date: '2026-09-30 14:45'
labels:
  - feature
milestone: m-5
dependencies:
  - FL-93
priority: high
type: feature
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Drawing an arrow between two shapes should connect them, the way someone sketching expects. An arrow from a shape into empty space completes the thought: a new connected shape where it ends. An arrow that touches no shape straightens into a clean arrow stroke.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 A line or arrow drawn from one shape to another becomes a connection between them, in the drawn direction; a head at both ends connects both ways
- [x] #2 An arrow from a shape into empty space adds a shape of the same kind at its end, connected, with its title ready to type
- [x] #3 An arrow or line that touches no shape becomes a straight stroke; an arrow keeps a clean head, written in .flow as 'id arrow: end'
- [x] #4 Each is one undoable change, with Keep as drawn in the toast

<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

withDrawnArrow in src/domain/drawn.js turns a recognised line or arrow into a connection between the shapes at its ends (frames and strokes never count as ends; both heads make it two-way), a new connected shape of the same kind past an open end, or a straight stroke with 'id arrow: end|both' drawn by inkHeads on the canvas and in SVG. Each is one undoable change with Keep as drawn.
<!-- SECTION:FINAL_SUMMARY:END -->
