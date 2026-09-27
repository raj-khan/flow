---
id: FL-90
title: Diagram from words
status: In Progress
assignee:
  - '@raj-khan'
created_date: '2026-09-25 17:39'
updated_date: '2026-09-27 14:40'
labels:
  - ai
milestone: m-3
dependencies: []
priority: low
type: feature
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Describe a system in a sentence and get a .flow diagram, built on the text format. Moved from the Later list.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 A Draft with your agent prompt, copyable from the app, that makes any agent return valid .flow
- [ ] #2 A built-in version is decided by the owner (cost of an API key or server)

<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. src/domain/draft.js: draftPrompt(description) teaches the .flow format (rules, every shape from the registry, a valid example) and asks for one fenced block; readDraft(answer) takes the first fenced block or the whole answer, with line errors; AGENT_LINKS opens the prompt filled in at Claude and ChatGPT.
2. DraftDialog: describe, copy or open the prompt, paste the answer (live status), Use this diagram as one undoable change. In the menu and the command palette.
3. The built-in version (AC #2) is the owners decision on cost; asked, not built.

<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Verified: draft.spec.js (6: description, every shape and the rules in the prompt; its example parses; agent links; fenced and unfenced answers; errors by line; an answer with no shapes); e2e/draft.spec.js (copy, link, a wrong answer blocked with its line, a real-looking answer drawn, undo). Tried on a real model: claude -p --model haiku with the prompt for a URL shortener returned valid .flow at once (8 shapes, 7 connections, every part named). vitest and e2e green.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->

author: @claude
created: 2026-09-27 14:40
---

For the owner: a built-in "Describe and draw" needs either the persons own API key in the browser (no cost to you, a little setup for them) or a call through the isketch server with your key (simplest for them, costs you per diagram, needs rate limits). Which, if either?
---

<!-- COMMENTS:END -->
