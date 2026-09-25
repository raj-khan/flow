# Working in this repo

Instructions for AI coding agents. Kept short on purpose: everything here is
something the code cannot tell you.

## Commands

| Task       | Command             |
| ---------- | ------------------- |
| Dev server | `npm run dev`       |
| Unit tests | `npm test`          |
| E2E        | `npm run test:e2e`  |
| Types      | `npm run typecheck` |
| Lint       | `npm run lint`      |
| Examples   | `npm run examples`  |

`npm run test:e2e` builds and serves the app itself, but it reuses a server already
on port 4173 rather than rebuilding. Kill a running `vite preview` first, or the run
tests the previous build.

## Boundaries

- `src/domain/` has no Vue imports. It is plain JavaScript so it can be tested
  without mounting anything. Keep it that way. The CLI, the MCP server and `server/` all
  run it in Node, so it also uses no browser globals, no `@/` alias, and only packages listed
  under `dependencies`.
- `src/api/flowApi.js` is the only module that touches persistence. It is shaped
  like a real API so it can be swapped for one. Publishing a public link is not
  persistence: it lives in `src/api/publishApi.js`, and is off unless
  `VITE_ISKETCH_API` names a server.
- Per shape behaviour lives in `src/domain/nodeMeta.js`, and each outline in
  `src/domain/shapes.js`. Add an entry there rather than branching on type in a component.
- State has three owners and no copies: TanStack Query owns the document, the route
  owns which node is open, Pinia owns viewport, history, theme and toasts. Do not
  mirror one in another.

## Documents

- A document is `{ version, title, nodes, edges }`. Anything read from storage or a file goes
  through `migrate()` in `src/domain/document.js`, which lifts every older shape. Bump
  `DOCUMENT_VERSION` and extend `migrate()` rather than reading two shapes elsewhere.

## Canvas

Vue Flow measures node handles after mount, and it owns its own graph:

- Sync nodes as a diff. Replacing the array discards measured handle bounds and
  every edge disappears.
- Hide edges rather than removing them, and key an edge by its ends (`edgeIdFor`), so an
  undone removal redraws the same edge.
- `isValidConnection` runs for programmatic `addEdges` too, not just for a drag.

## Conventions

- Read configuration from `.env`. Never hardcode a URL.
- Types are JSDoc, checked by `vue-tsc` in strict mode. Untyped exports fail CI.
- A comment carries a reason the code cannot state. If it restates the next line,
  delete it.
- Tests cover behaviour that can break, not coverage percentage.
- Where a test goes: domain logic and stores are unit tests; a component's own
  behaviour is a component test; anything needing real layout, a real drag or a
  reload is Playwright. happy-dom has no layout, so the canvas cannot be unit
  tested and is not worth mocking into submission.
- Commits: imperative subject, `Add`/`Fix`/`Update`/`Remove`/`Refactor`/`Test`.
  Stage files by name. Never `git add -A`.
- Never commit `.env`, secrets, or anything in `dist/` or `coverage/`. The
  pre-commit hook scans staged changes for credentials and will refuse.

<!-- BACKLOG.MD GUIDELINES START -->
<!-- backlog.md-instructions-version: 1.50.1 -->

<CRITICAL_INSTRUCTION>

## Backlog.md Workflow

This project uses Backlog.md for task and project management.

**For every user request in this project, run `backlog instructions overview` before answering or taking action.**

Use the overview to decide whether to search, read, create, or update Backlog tasks.

Before task lifecycle actions, read the matching detailed guide:

- `backlog instructions task-creation` before creating or splitting tasks
- `backlog instructions task-execution` before planning, changing status or assignee, adding a plan or implementation notes, or implementing task work
- `backlog instructions task-finalization` before checking acceptance criteria, writing final summaries, or moving tasks to terminal statuses

Use `backlog <command> --help` before running unfamiliar commands. Help shows options, fields, and examples.

Do not edit Backlog task, draft, document, decision, or milestone markdown files directly. Use the `backlog` CLI so metadata, relationships, and history stay consistent.

</CRITICAL_INSTRUCTION>
<!-- BACKLOG.MD GUIDELINES END -->
