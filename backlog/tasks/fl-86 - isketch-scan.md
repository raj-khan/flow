---
id: FL-86
title: isketch scan
status: To Do
assignee: []
created_date: '2026-09-25 17:39'
labels:
  - cli
milestone: m-3
dependencies:
  - FL-85
priority: medium
type: feature
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Point the CLI at a repository and get a first architecture diagram from what it finds, which an agent then refines through MCP.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `isketch scan <dir>` reads compose files, SQL migrations, Prisma schemas and OpenAPI specs it finds
- [ ] #2 It writes one .flow file combining them, laid out automatically
- [ ] #3 Unit tests cover a fixture repository
<!-- AC:END -->
