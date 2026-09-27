---
id: FL-85
title: Import Prisma and Drizzle schemas
status: Done
assignee:
  - '@raj-khan'
created_date: '2026-09-25 17:39'
updated_date: '2026-09-27 13:58'
labels:
  - import
milestone: m-3
dependencies: []
priority: medium
type: feature
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

The schema files most TypeScript projects keep, as entity diagrams, like the SQL DDL import (FL-49).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 schema.prisma models become table shapes with their fields; relations become edges
- [x] #2 Drizzle table definitions import the same way
- [x] #3 Available in the import dialog and the CLI

<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. src/domain/prisma.js: models (and views) become tables listing their fields, @id and @@id as PK; relations with fields: [...] become edges from the holder to the target labelled with the key, marking it FK; lists on both sides with no key become one two-way many-to-many edge; unknown field types are warned by line.
2. src/domain/drizzle.js: pgTable, mysqlTable and sqliteTable calls become tables named as in the database; .primaryKey() and primaryKey({ columns }) mark keys; .references(), foreignKey() and one(..., { fields }) become edges; references to unknown tables are warned.
3. Shared describeColumns with SQL; both in IMPORT_FORMATS (dialog).
4. CLI: isketch import <file> [--from <format>] [-o out.flow] for every import format, with detectFormat from name and content.
5. Unit tests for each reader, detectFormat and the CLI; e2e for both in the dialog.

<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Both readers are line and brace aware rather than full parsers: comments are blanked first, and Drizzle constraints are read only inside their own table call, found by matching its parentheses (a schema without semicolons otherwise leaked one tables foreign keys into another). Prisma one-to-many back relations add nothing; implicit many-to-many is one two-way edge. Both carry an origin, so a re-import updates in place.

Verified: prisma.spec (5), drizzle.spec (4), importers.spec for detectFormat (3), CLI run.spec for isketch import (3: name detection with warnings and summary, --from with an unknown format, unreadable and undetectable files); e2e/schemas.spec.js (2, both formats through the Import dialog). e2e 140, vitest 294, lint and typecheck.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Prisma schemas and Drizzle table definitions import as entity diagrams, with keys marked and relations as labelled edges, from the Import dialog and from a new isketch import command that handles every import format, told from the file name and content. Verified with unit, CLI and e2e tests.
<!-- SECTION:FINAL_SUMMARY:END -->
