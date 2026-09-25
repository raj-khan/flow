---
id: FL-79
title: Canvas first
status: To Do
assignee: []
created_date: '2026-09-25 17:39'
labels:
  - frontend
  - layout
milestone: m-2
dependencies: []
priority: high
type: feature
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A fixed header, a fixed 192px palette and the text panel take the edges of the screen. Give the whole viewport to the canvas and float the tools over it, as Excalidraw and tldraw do. This layout is also what makes phones work (FL-81).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The canvas fills the viewport; the fixed header and palette are gone
- [ ] #2 A floating tool bar at the top centre (select, hand, shapes, connector, text, pen, eraser) with number-key shortcuts
- [ ] #3 A menu at the top left (file, import, export, theme, help); Share and Copy for AI at the top right; zoom and undo at the bottom left
- [ ] #4 The shape palette opens as a library panel from the tool bar; the text panel and details drawer float and can be closed
- [ ] #5 Existing e2e flows still pass
<!-- AC:END -->
