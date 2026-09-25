---
id: FL-72
title: Remote MCP
status: To Do
assignee: []
created_date: '2026-09-25 17:39'
labels:
  - server
  - mcp
milestone: m-0
dependencies:
  - FL-71
priority: high
type: feature
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The MCP tools over HTTP, so an agent in the cloud can read and update hosted diagrams (today `isketch mcp` is stdio and local only).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 An HTTP MCP endpoint on the server exposes list, read (brief or text), write, render and diff for hosted diagrams
- [ ] #2 Writes need the diagram edit token; reads need only the link
- [ ] #3 README has a setup line for a remote MCP client
- [ ] #4 Tests cover the endpoint against PostgreSQL
<!-- AC:END -->
