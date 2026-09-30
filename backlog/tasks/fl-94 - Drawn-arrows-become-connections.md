---
id: FL-94
title: Drawn arrows become connections
status: To Do
assignee:
  - '@raj-khan'
created_date: '2026-09-30 13:40'
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

- [ ] #1 A line or arrow drawn from one shape to another becomes a connection between them, in the drawn direction; a head at both ends connects both ways
- [ ] #2 An arrow from a shape into empty space adds a shape of the same kind at its end, connected, with its title ready to type
- [ ] #3 An arrow or line that touches no shape becomes a straight stroke; an arrow keeps a clean head, written in .flow as 'id arrow: end'
- [ ] #4 Each is one undoable change, with Keep as drawn in the toast

<!-- AC:END -->
