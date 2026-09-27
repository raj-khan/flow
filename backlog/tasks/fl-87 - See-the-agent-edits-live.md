---
id: FL-87
title: See the agent edits live
status: Done
assignee:
  - '@raj-khan'
created_date: '2026-09-25 17:39'
updated_date: '2026-09-27 14:14'
labels:
  - frontend
  - mcp
milestone: m-3
dependencies: []
priority: medium
type: feature
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

When the open .flow file changes on disk (an agent writing through MCP or an editor), reload it and highlight what changed, so a person watches the agent draw.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 An open file that changes on disk reloads without losing unsaved-change protection
- [x] #2 Changed shapes and connections are highlighted with the existing diff for a few seconds
- [x] #3 A conflict with unsaved local edits asks which to keep

<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. File store remembers what the file held (canonical .flow) and its lastModified, on open, launch and save.
2. useWatchFile polls the open handle every second (a browser cannot be notified); a newer lastModified whose parsed diagram differs from what was saved is a change. Nothing unsaved here: it replaces the diagram as one undoable change and flashes the diff. Unsaved edits: a dialog asks which to keep. A file that does not parse is refused with its line.
3. Canvas marks added, changed and moved shapes and added or changed connections for four seconds, in the diff colours.
4. e2e with a stand-in file handle whose contents the test changes.

<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Own saves are recognised by comparing the canonical .flow of the file with what was last saved, not just the timestamp, so a save never reads as an outside change. Keep mine records the files version as the saved one, so the next outside change asks again and the next Save overwrites. The watcher pauses while the tab is hidden and while the dialog is open.

Verified: e2e/live.spec.js (4: a change comes in with added and changed marks that fade, and undo; its own save is not a change; unsaved edits ask, Keep mine keeps them and the next change asks again, Use the files version replaces; a broken file is refused with its line). FlowNodeCard unit tests now mount with Pinia. e2e 144, vitest 300, lint and typecheck.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

The open .flow file is watched: a change made on disk by an agent or an editor shows up within a second as one undoable change with what changed glowing for a few seconds, and a conflict with unsaved edits asks which to keep. Verified with e2e/live.spec.js.
<!-- SECTION:FINAL_SUMMARY:END -->
