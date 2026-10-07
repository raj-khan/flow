---
id: FL-98
title: Tool keys pick tools on a blank canvas
status: Done
assignee: []
created_date: '2026-10-07 09:36'
updated_date: '2026-10-07 09:36'
labels:
  - bug
dependencies: []
priority: high
ordinal: 28000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

On a blank canvas, type-to-start took every key, so P, V, 1 to 8 and the other tool letters made a shape named with that letter instead of picking the tool. A blank canvas is now the default start, so this hits everyone new.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 A lowercase tool key or digit picks its tool on a blank canvas
- [x] #2 A capital or any other letter still starts a named shape
- [x] #3 With a tool other than Select, typing makes no shape

<!-- AC:END -->
