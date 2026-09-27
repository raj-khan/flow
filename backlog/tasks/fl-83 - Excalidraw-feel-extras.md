---
id: FL-83
title: Excalidraw-feel extras
status: In Progress
assignee:
  - '@raj-khan'
created_date: '2026-09-25 17:39'
updated_date: '2026-09-27 13:30'
labels:
  - frontend
  - editing
milestone: m-2
dependencies:
  - FL-79
priority: medium
type: feature
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

The quick, keyboard-first touches that make Excalidraw, tldraw and Whimsical feel fast.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 An eraser tool and a laser pointer
- [x] #2 Typing on an empty canvas creates a shape; Tab adds a connected shape next to the selected one
- [x] #3 A command palette (Ctrl+K) reaches every action and shape
- [ ] #4 Frames: a named region grouping shapes, exported and briefed on its own

<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Part 1 (one PR): an eraser layer that deletes everything it is dragged over as one change; a laser pointer tool (8/K) whose trail fades and saves nothing; typing on a blank diagram starts a shape named with the keys (buffered until its title field has focus, ahead of the one-letter tool keys); a double click on empty canvas adds a shape there; Tab adds a connected shape below the selected one (withConnectedShape); a Ctrl+K command palette over every menu action, tool, view action and shape.
2. Part 2 (second PR): frames, a named region grouping the shapes inside it, moved together, and exported and briefed on its own.

<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Part 1 verified: e2e/quick.spec.js (6: drag erase and one undo, laser trail fades with the document unchanged, typing on a blank diagram names the shape and picks no tool, double click adds, Tab adds a connected named shape, Ctrl+K adds a shape, opens Export, says when nothing matches, and closes); unit tests for withConnectedShape, withErased and filterCommands. e2e 131, vitest 261, lint and typecheck. The laser is left off a phone tool bar, which has room for seven 44px targets.
<!-- SECTION:NOTES:END -->
