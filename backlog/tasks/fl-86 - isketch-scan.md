---
id: FL-86
title: isketch scan
status: Done
assignee:
  - '@raj-khan'
created_date: '2026-09-25 17:39'
updated_date: '2026-09-27 14:05'
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

- [x] #1 `isketch scan <dir>` reads compose files, SQL migrations, Prisma schemas and OpenAPI specs it finds
- [x] #2 It writes one .flow file combining them, laid out automatically
- [x] #3 Unit tests cover a fixture repository

<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. src/domain/scan.js (pure): pickSources(paths) chooses compose files, SQL migrations (all .sql together, in name order), Prisma schemas, OpenAPI specs (by content) and Drizzle schemas (by content), skipping node_modules, .git, dist and build; combineSources lays each imported document out on its own, places them side by side, draws a frame around each named after its source, and renames only ids that collide.
2. CLI: isketch scan [dir] [-o out.flow] lists the tree through a new io.listFiles, reads the chosen files, imports each with its format, and writes one .flow; skipped items are reported per file.
3. Unit tests over a fixture repository in memory; the CLI test runs scan end to end with a fake file system.

<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Each source is imported by the same readers as the Import dialog, laid out on its own, and framed side by side (frames from FL-83), so different sources never collide in space and the brief groups them; an id is renamed (prefixed with its source) only when two sources share it. SQL files are joined in name order, as migrations build on each other. Dependencies, build output and tests or fixtures are skipped; the real CLI never descends into ignored folders, so scanning this repository takes 0.25s.

Verified: scan.spec.js over the fixture repository in src/tests/fixtures/repo.js (pickSources finds compose, OpenAPI, Prisma, Drizzle and SQL but nothing in node_modules, dist or tests; frames named after sources, side by side and not overlapping; every shape inside its frame; clashing ids renamed with connections kept); CLI scan end to end with a fake file system, and the empty case. Ran the real binary on this repository: 5 shapes in 2 frames, rendered and checked. vitest 300, e2e 140, lint and typecheck.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

isketch scan [folder] [-o out.flow] turns a repositorys compose files, SQL migrations, Prisma and Drizzle schemas and OpenAPI specs into one .flow diagram, each source framed and laid out side by side. Verified with a fixture repository, CLI tests and a real scan of this repository.
<!-- SECTION:FINAL_SUMMARY:END -->
