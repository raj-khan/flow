---
id: FL-87
title: See the agent edits live
status: To Do
assignee: []
created_date: '2026-09-25 17:39'
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
- [ ] #1 An open file that changes on disk reloads without losing unsaved-change protection
- [ ] #2 Changed shapes and connections are highlighted with the existing diff for a few seconds
- [ ] #3 A conflict with unsaved local edits asks which to keep
<!-- AC:END -->
