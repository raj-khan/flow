---
id: FL-71
title: Hosted diagrams
status: Done
assignee:
  - '@raj-khan'
created_date: '2026-09-25 17:38'
updated_date: '2026-09-25 17:39'
labels:
  - server
milestone: m-0
dependencies: []
priority: high
type: feature
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A small service (NestJS and PostgreSQL, in `server/`) stores a diagram behind an unguessable link and serves a page that carries the brief as text to people and AI fetchers, plus `.md`, `.flow`, `.svg` and `.json` forms. Readable by anyone with the link, changeable only with its edit token. Merged in PR #71. Hosting it at isketch.online is the owner's to do.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Server, its tests against PostgreSQL, Docker and CI
- [x] #2 Publish from the app: a public link from Share, updated in place on later publishes
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Merged in PR #71 (3e9c893).
<!-- SECTION:FINAL_SUMMARY:END -->
