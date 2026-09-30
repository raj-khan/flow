---
id: FL-96
title: Discard all
status: Done
assignee:
  - '@raj-khan'
created_date: '2026-09-30 14:57'
updated_date: '2026-09-30 14:59'
labels:
  - feature
milestone: m-5
dependencies: []
priority: medium
type: feature
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Clear everything on the canvas in one go, as Excalidraw's Reset the canvas: every shape, stroke and connection gone, while the title, notes, style and the open file stay, so it is a clean sheet of the same diagram rather than a new one.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Discard all in the menu and the command palette removes every shape, stroke and connection in one change
- [x] #2 No confirmation, as with New diagram: a toast says what went, and its Undo, or one undo, brings it all back
- [x] #3 The title, diagram notes, style and the open file are kept; the canvas shows the blank hint

<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

useDiscardAll clears nodes and edges with withNothingDrawn (document.js) in one undoable change, keeping title, notes, style and the file handle; menu item (danger, disabled when empty) and a command palette entry. No confirmation, matching New diagram; the toast has Undo.
<!-- SECTION:FINAL_SUMMARY:END -->
