---
id: FL-79
title: Canvas first
status: Done
assignee:
  - '@raj-khan'
created_date: '2026-09-25 17:39'
updated_date: '2026-09-25 20:45'
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

- [x] #1 The canvas fills the viewport; the fixed header and palette are gone
- [x] #2 A floating tool bar at the top centre (select, hand, shapes, connector, text, pen, eraser) with number-key shortcuts
- [x] #3 A menu at the top left (file, import, export, theme, help); Share and Copy for AI at the top right; zoom and undo at the bottom left
- [x] #4 The shape palette opens as a library panel from the tool bar; the text panel and details drawer float and can be closed
- [x] #5 Existing e2e flows still pass

<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. src/domain/tools.js: the tools (select 1/V, hand 2/H, shapes 3, connector 4/C, text 5/T, pen 6/P, eraser 7/E) and key lookup, unit tested.
2. Canvas store: tool (select by default), setTool, library open state; pen stays as tool === pen.
3. Shell: FlowView becomes a full-viewport canvas with floating islands. Header (still the banner) holds MainMenu top left (file, new, open, save, import, export, compare, text, sketch, theme, help), ToolBar top centre, Share and Copy for AI top right. HistoryControls (undo, redo) and CanvasControls (teleported, horizontal) sit bottom left.
4. Tool behaviour in FlowCanvas: hand pans only; connector clicks source then target; text clicks the canvas to place a text shape; eraser clicks a shape or connection to delete it (one undo step); pen as today.
5. ShapePalette becomes a floating library panel opened by the Shapes tool and closed after adding; TextPanel and the details drawer float with close buttons.
6. Update e2e specs for the menu and moved controls, with a small helper; full suite green.

<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Select keeps its existing behaviour (drag pans, Shift+drag selects a box), so the Hand tool is pan only: no clicks, drags or selection on shapes.

Eraser is click to delete (shape or connection), one undo step; drag-to-erase is left for FL-83. Connector is click then click, reusing the drag-connection highlighting.

Undo/redo moved outside Vue Flow (HistoryControls) because an emptied canvas unmounts it; CanvasControls teleports beside them. The header must stay outside <main> to remain the banner landmark.

Verified: e2e 101 passed (new e2e/tools.spec.js covers full-viewport canvas, every tool, keys, library, floating panels; existing specs migrated via e2e/helpers.js), vitest 243, lint and typecheck; screenshots checked in light and dark.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

The canvas now fills the viewport with floating islands: menu top left, a seven-tool bar top centre on number keys and letters, Share and Copy for AI top right, undo and view controls bottom left; the shape library, text pane and details drawer float and close. Verified with new tool e2e tests, the full migrated e2e suite and screenshots.
<!-- SECTION:FINAL_SUMMARY:END -->
