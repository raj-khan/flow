---
id: FL-81
title: Phones and tablets
status: To Do
assignee: []
created_date: '2026-09-25 17:39'
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
- [ ] #1 Below 768px the tool bar docks at the bottom, the menu collapses to one button, panels and dialogs become bottom sheets, and nothing scrolls sideways at 360px
- [ ] #2 Pinch to zoom, two-finger pan, long press for the context menu, touch targets at least 44px
- [ ] #3 The pen supports stylus pressure and palm rejection
- [ ] #4 A shared or hosted link on a phone opens a fitted read-only view with Copy for AI and Edit
- [ ] #5 The e2e suite also runs at a phone and a tablet viewport
<!-- AC:END -->
