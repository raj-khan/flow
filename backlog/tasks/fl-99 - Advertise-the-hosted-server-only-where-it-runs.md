---
id: FL-99
title: Agents can sketch for someone from the site alone
status: Done
assignee: []
created_date: '2026-10-07 09:36'
updated_date: '2026-10-07 09:42'
labels:
  - docs
dependencies: []
priority: high
ordinal: 29000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

An agent asked to sketch with isketch fetched /new, found an empty app shell, and went looking for a publish API that is not hosted. The landing page and llms-full.txt also told agents to add https://isketch.online/mcp, which returns 404. Now the editor page, llms.txt, llms-full.txt, the landing page and the Claude Code skill say how to answer with a #flow= link, and the hosted server is described as one you run.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 A fetch of /new, without running script, says how to make a link
- [x] #2 llms.txt and the skill give the recipe, and its link opens the diagram
- [x] #3 Nothing points at a hosted /mcp on isketch.online

<!-- AC:END -->
