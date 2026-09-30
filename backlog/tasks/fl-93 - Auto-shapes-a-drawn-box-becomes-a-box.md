---
id: FL-93
title: 'Auto shapes: a drawn box becomes a box'
status: To Do
assignee:
  - '@raj-khan'
created_date: '2026-09-30 13:40'
labels:
  - feature
milestone: m-5
dependencies:
  - FL-92
priority: high
type: feature
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

A pen stroke that is plainly a rectangle, an ellipse or a diamond turns into that shape, as in Procreate's QuickShape or Google Keep, so sketching a diagram by hand ends in a diagram an agent reads exactly. Recognised by geometry in src/domain (closedness, corners of the simplified stroke, how much of its box it fills), with no model and no new dependency.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 src/domain/recognize.js classifies a stroke as line, arrow, rectangle, ellipse, diamond or nothing, and is tested on drawn samples including wobbly and unclosed ones
- [ ] #2 With auto shapes on, a closed rectangle becomes a process, an ellipse a terminal and a diamond a decision, at the stroke's box, in the stroke's colour, with its title ready to type
- [ ] #3 One undo brings back the stroke as drawn; a toast offers Keep as drawn
- [ ] #4 Auto shapes is a toggle next to the pen colour, on by default, remembered; scribbles and handwriting stay ink

<!-- AC:END -->
