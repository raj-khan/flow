---
id: FL-92
title: Colours for shapes and strokes
status: Done
assignee:
  - '@raj-khan'
created_date: '2026-09-30 13:40'
updated_date: '2026-09-30 13:52'
labels:
  - feature
milestone: m-5
dependencies: []
priority: high
type: feature
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Every shape is drawn in its kind's accent today, and every pen stroke in ink. Let people colour them, as Excalidraw does, from a small named palette that reads in light and dark themes. The colour is a name, not a hex, so the .flow text stays readable and an agent can use colour to mean something (red for what is failing).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 A palette of named colours (red, orange, yellow, green, teal, blue, violet, pink, grey) with light and dark values; a coloured shape strokes in the colour and fills with its soft tint
- [x] #2 Selecting one or more shapes shows the swatches; picking one colours them all in one undoable change, and a Default swatch clears it
- [x] #3 The pen has its own colour, shown while the pen is on, used for every new stroke
- [x] #4 .flow writes and reads 'id color: red'; an unknown colour is an error naming the choices
- [x] #5 SVG and PNG export draw the colours; Excalidraw import and export map strokeColor and backgroundColor to the nearest named colour

<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Named palette in src/domain/colors.js (Open Color values, light and dark), stored as data.color and written as 'id color: red' in .flow. Selection toolbar shows swatches for one or more shapes; the pen has its own remembered colour. SVG export and Excalidraw import/export carry colours; format docs, the skill and the draft prompt teach the line.
<!-- SECTION:FINAL_SUMMARY:END -->
