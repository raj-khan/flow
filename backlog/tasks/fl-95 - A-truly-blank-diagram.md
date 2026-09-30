---
id: FL-95
title: A truly blank diagram
status: Done
assignee:
  - '@raj-khan'
created_date: '2026-09-30 14:34'
updated_date: '2026-09-30 14:52'
labels:
  - feature
milestone: m-5
dependencies: []
priority: high
type: feature
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

New diagram empties the diagram, but an empty diagram replaces the canvas with a list of samples, so the only way forward feels like picking a template: the pen, text and tools cannot be used on it. A blank diagram should be a blank canvas, ready to draw on, with samples offered quietly, not in the way.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 An empty diagram shows the canvas itself, with the tools, pen, text and double-click all working on it
- [x] #2 A small hint on the blank canvas says how to begin, never blocks drawing, and goes as soon as the first shape or stroke is added
- [x] #3 Samples are still one click away from the hint and from the menu (New from a sample), and undo still brings back the previous diagram

<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

An empty diagram now keeps the canvas mounted (CanvasState only for loading and errors), with BlankHint over it: pointer-events none except its link, gone at the first shape. Samples sit behind Start from a sample and a New from a sample item in the menu and command palette. The minimap hides while blank. Also fixed the Ctrl+K e2e race (Escape pressed before the new shape's title field existed).
<!-- SECTION:FINAL_SUMMARY:END -->
