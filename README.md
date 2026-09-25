<div align="center">

# isketch

**Sketch it, hand it to your agent.**

A sketchpad for software engineers whose output is exact, agent-ready text. Sketch an
architecture, a database or a flow on a canvas; every sketch is also a readable `.flow` file that
Claude, Copilot or any coding agent reads without guessing, and can edit back.

[Backlog](BACKLOG.md) · [Security](SECURITY.md) · [Agent rules](AGENTS.md)

[![CI](https://github.com/raj-khan/flow/actions/workflows/ci.yml/badge.svg)](https://github.com/raj-khan/flow/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-ff5a2c.svg)](LICENSE)

https://github.com/user-attachments/assets/cbfbc844-7373-4891-a985-50e2870fe1b5

</div>

## Why not draw.io or Excalidraw?

Both are free and good at drawing. Neither is good at the step that now matters most: getting the
design in your head into a coding agent. A screenshot makes the agent guess at boxes and arrows
from pixels; names get misread, arrows lose their direction, and nothing it writes back can go on
the diagram. A `.drawio` file is an XML blob nobody reviews, so the picture also drifts from the
code until it is wrong.

isketch aims at that gap:

- **Every sketch is exact text.** Ids, kinds, directions and notes, in a line-based `.flow` file
  an agent reads without guessing. Edit the canvas or the text; the other follows.
- **Sketch like a whiteboard, keep it precise.** A hand-drawn style for when the design is still
  rough, a clean one for when it is not, over the same exact diagram.
- **Sketch the interface too.** Wireframe shapes (screen, button, input, card, list, image) sit
  on the same canvas as the architecture, so a whole feature is one sketch.
- **Built for the hand-off.** _Copy for AI_ puts a Markdown brief on the clipboard: every shape by
  what it means for the code, every connection in words, and the source to edit and hand back. An
  [MCP server](#connect-your-agent-mcp) lets an agent list, read, update and draw your diagrams
  itself, and notes on the diagram and its shapes travel as instructions to follow.
- **Git native.** Files diff cleanly, a CLI renders SVG with no browser, and pull requests get a
  visual diff, so the design and the code stop drifting apart.
- **Start from real files.** Your existing `.drawio` diagrams, `docker-compose.yml`, OpenAPI and
  SQL DDL, with re-import that keeps your layout. And a `.drawio` back out whenever you want one.
- **Local first.** No account, no server, works offline, shareable as a link.
- **Written for AI readers.** [/llms.txt](https://isketch.online/llms.txt) and
  [/docs/format](https://isketch.online/docs/format) describe the format, the tools and the CLI
  for agents and crawlers that fetch them.

What is honestly not there yet: a private share link keeps the diagram after the `#`, which
browsers never send to a server, so an AI that fetches it sees nothing. Public links an agent can
read come from the [server](#hosted-links-for-agents), which is built and wired into Share, but
nobody hosts it yet: run it yourself, or hand over the `.flow` file or the brief.

> **Status: early.** isketch started as a flow chart exercise called Flow. The canvas, text
> format, importers, CLI and pull request diffs below work today.

## What works today

- **Shapes.** Process, start / end, decision, input / output, database, document, note, table and text,
  each drawn as its own outline. Change a shape's type at any time.
- **Notes for the builder.** Give a shape notes ("paginate this", "must be idempotent") in its
  details, or the whole diagram notes in the text. The canvas marks noted shapes, and the notes
  go with Copy for AI, the `.flow` file and MCP as instructions to follow.
- **Wireframes.** Screen, button, input, card, list and image, to sketch an interface next to the
  architecture behind it. The brief reads them as a UI to build: "a screen", "a form field", "a button".
- **Canvas first.** The canvas fills the screen and the tools float over it, as in Excalidraw:
  the menu (file, import, export, view, help) at the top left, the tool bar at the top centre,
  Share and Copy for AI at the top right, undo and the view controls at the bottom left.
- **Tools** on number keys and letters: Select (`1`/`V`), Hand (`2`/`H`), Shapes (`3`), Connector
  (`4`/`C`, click one shape then another), Text (`5`/`T`, click the canvas to write), Pen (`6`/`P`)
  and Eraser (`7`/`E`, click a shape or connection to delete it). Escape goes back to Select.
- **New diagram and samples.** Start empty, or from a web app architecture or support flow
  sample. Undo brings back whatever was there.
- **Shape library.** The Shapes tool opens it over the canvas. Drag a shape onto the canvas to drop
  it there, or click it (or press Enter) to add it in a clear spot near the middle.
- **Resize.** Select a shape and drag its handles; hold Shift to keep its proportions.
- **Edit in place.** Double-click a shape to rename it, or a connection to add or change its
  label; F2 renames the focused shape. Enter saves, Escape cancels.
- **Select several.** Shift-click, or Shift-drag a box, to select shapes; move them together, or
  delete them with Delete, as one undoable step.
- **Align and distribute.** With two or more shapes selected, a toolbar lines them up by any edge or
  centre, and with three or more spaces them evenly, across or down.
- **Snap to grid.** Dragged shapes snap to the canvas's dots; the switch beside the zoom controls
  turns it off, and this browser remembers.
- **Copy, cut, paste and duplicate** (`Ctrl+C`, `Ctrl+X`, `Ctrl+V`, `Ctrl+D`), with the connections
  between copied shapes. The clipboard holds `.flow` text, so shapes paste between tabs, and any
  `.flow` text an agent writes pastes straight onto the canvas.
- **Edit and delete.** Every change updates the canvas immediately and rolls back if it fails.
- **Connections.** Drag from one node to another to connect them, as many in and out as you like.
  Each leaves from the side that faces the shape it goes to, with an arrowhead. From its own
  controls, make one dashed (optional or asynchronous) or two-way, or remove it. The whole diagram's
  lines run in steps, curves or straight, from the button beside the zoom controls.
- **Undo and redo** for every change, from the bottom left or `Ctrl+Z` / `Ctrl+Shift+Z`.
- **Deep links.** Each node's details open at `/new/node/:id`, so a node can be linked to.
- **Keyboard first.** Arrow keys walk the nodes, Enter opens one, `?` lists every shortcut.
- **Automatic layout** for anything you have not placed by hand: a tidy tree for a tree, and layers
  for any other graph, so merges, skipped steps and loops still read top down, with long
  connections given a lane of their own. _Tidy up_ beside the zoom controls lays out the whole
  diagram, and undo puts it back.
- **Pen.** Pick up the pen (`P`) to circle, underline or scribble over the diagram by hand. Each
  stroke moves, resizes and undoes like a shape, clicks pass through it to what it circles, and the
  brief leaves strokes out: they are marks on the picture, not parts of the design.
- **Sketch style.** One switch draws the whole diagram by hand, like a whiteboard: wobbly outlines
  (drawn by [Rough.js](https://roughjs.com), as in Excalidraw) and a handwritten font. The
  diagram underneath is the same, so switching back is lossless, and exported SVGs carry the font.
- **Light and dark themes**, following the system until you choose.
- **Saved locally.** Edits are kept in `localStorage` and survive a reload.
- **Edit as text.** Open the text pane beside the canvas and edit the diagram in the
  [`.flow` format](#the-flow-format): typing redraws the canvas, and changes on the canvas rewrite
  the text. Errors are listed by line, and the canvas keeps the last valid diagram meanwhile.
- **Import.** Paste or open a Mermaid flowchart, a `docker-compose.yml`, an OpenAPI spec or
  SQL `CREATE TABLE` statements. Compose services
  become shapes that fit their image (Postgres a database, RabbitMQ a queue), and dependencies
  become connections. An OpenAPI spec becomes a map of its tags and the schemas they use, and SQL an entity diagram
  with keys marked and foreign keys as labelled connections.
  Re-importing updates the diagram and keeps its layout and anything added by
  hand. Anything skipped is listed by line.
- **draw.io, both ways.** Import a `.drawio` file, compressed or not, or the XML from Extras > Edit
  Diagram: shapes map to the nearest one here, entity tables keep their rows, and lanes are
  flattened with their shapes kept. _Export_ writes a file draw.io
  opens as it is, sketch style included, and that comes back into isketch unchanged.
- **Copy for AI.** One button copies a Markdown brief for Claude, Copilot or any coding agent: each
  shape with its id and what it means ("a data store", "a branch the code must handle"), each
  connection in words, and the `.flow` source at the end so the agent can change the diagram and
  hand it back. `isketch brief` prints the same from the command line.
- **Export** as PNG (at twice the size, for slides and chat), SVG or a draw.io file, light or
  dark, with a preview. Sketches carry their handwriting font inside the file.
- **Copy as Mermaid** from the text pane, for a README.
- **Open and save `.flow` files** (`Ctrl+O`, `Ctrl+S`). In Chrome and Edge, Save writes back to
  the file you opened, so a diagram can live in a repository next to the code it describes.
  Elsewhere Save downloads a copy.
- **Compare versions.** Compare the diagram on screen with the file in your repository, or any
  other version, and see what was added, removed and changed, as a list and as a marked-up
  picture.
- **Share.** A private link carries the whole diagram in the link itself, compressed, so nothing is
  uploaded; opening one gives the visitor their own copy, and undo brings back theirs. With a
  server configured (`VITE_ISKETCH_API`, see `.env.example`), Share also publishes a public link an
  AI can read, updates it in place, or unpublishes it; the edit token stays in this browser.
- **Works offline.** The samples are bundled, so the app makes no network requests.

## The `.flow` format

Every diagram can be written as plain text that reads well and diffs cleanly:

```text
title: Web app architecture

browser = terminal "Browser" -- Single page app
api = process "API" -- REST, documented with OpenAPI
db = database "PostgreSQL"

browser -> api : HTTPS
api -> db : SQL

@layout
browser 276,0
api 276,176
db 276,352
```

- `id = shape "Name" -- description` declares a node. The name and description are optional.
  Shapes are `process`, `terminal`, `decision`, `data`, `database`, `document`, `note`, `table`, `text`,
  and for wireframes `screen`, `button`, `input`, `card`, `list`, `image`.
- `note: ...` under the title is a note for the whole diagram, and `id note: ...` a note for one
  shape, one line each: instructions for whoever builds from it, person or agent.
- `a -> b : label` connects two nodes. The label is optional, and a line may refer to a node
  defined further down. `a --> b` is dashed, `a <-> b` has an arrow at each end, and `a <--> b`
  is both.
- `lines: curved` or `lines: straight` under the title changes how every connection runs; the
  default is steps.
- `@layout` starts the positions, one `id x,y` per line, with ` WxH` after it for a resized shape. A node with no position is laid out
  automatically, so a hand-written diagram needs no layout block at all.
- Pen strokes are `id = ink` shapes, with their points in an `@ink` block after the layout, so
  they never clutter the lines that say what the system is.
- `style: sketch` under the title draws the diagram by hand. Leave it out for clean lines.
- `#` starts a comment. A newline inside a description or label is written `\n`.

The full example, [`examples/architecture.flow`](examples/architecture.flow), drawn by
`isketch render` with no browser. CI fails if this picture falls out of date:

![The web app architecture example, rendered to SVG](examples/architecture.svg)

A wireframe in the sketch style, [`examples/signup.flow`](examples/signup.flow), drawn the same
way:

![A sign-up page wireframe, drawn by hand and rendered to SVG](examples/signup.svg)

One node or edge per line, in a stable order, with the layout kept apart: moving a box changes
one line at the end, and never the lines that say what the system is. `parseFlow` and
`serialiseFlow` in `src/domain/flowText.js` read and write it, reporting every error with its
line number; the text pane, files, share links and the command line all go through them.

## Where it is going

| Milestone               | Highlights                                                          |
| ----------------------- | ------------------------------------------------------------------- |
| 1. A real diagram model | Nodes and edges, general shapes, new diagram, shape palette         |
| 2. The wedge            | `.flow` text format, two way editor, Mermaid, compose, OpenAPI, SQL |
| 3. Git native           | Open and save files, CLI rendering, visual diff, GitHub Action      |
| 4. Editing essentials   | Multi-select, inline text, resize, connectors, clipboard, export    |
| 5. Built for agents     | Copy for AI brief, MCP server, wireframe shapes, actionable notes   |
| 6. Sketch feel          | Hand-drawn style, freehand pen, draw.io XML import and export       |
| 7. Links an agent reads | Hosted diagrams with plain-text URLs, remote MCP                    |

Every ticket, with what "done" means, is in [BACKLOG.md](BACKLOG.md).

## Quick start

### Node

Node 22 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173. There is nothing to configure.

### Docker

```bash
docker compose up                   # dev server on http://localhost:5173
docker compose --profile prod up    # production build on http://localhost:8080
```

## Command line

```bash
npm run isketch -- render diagram.flow -o diagram.svg   # draw it, add --dark for the dark theme
npm run isketch -- check docs/*.flow                    # file:line errors, exit 1 if any
npm run isketch -- diff old.flow new.flow -o diff.svg   # what changed, listed and drawn
npm run isketch -- brief diagram.flow                   # a Markdown brief for a coding agent
npm run isketch -- mcp docs                             # an MCP server for the diagrams in docs/
npm run examples                                        # redraw every SVG in examples/
```

It needs only Node: the renderer is the same pure code the app uses, so a docs build or CI can
draw diagrams that match the editor.

## Connect your agent (MCP)

`isketch mcp` is a local [Model Context Protocol](https://modelcontextprotocol.io) server for the
`.flow` files in a folder, so an agent can work with your diagrams itself rather than being handed
a screenshot. It has five tools:

| Tool             | What the agent can do                                                    |
| ---------------- | ------------------------------------------------------------------------ |
| `list_diagrams`  | See every diagram in the folder, with its title and size                 |
| `read_diagram`   | Read one as a brief (shapes by meaning, connections in words) or as text |
| `write_diagram`  | Create or update one; invalid text is refused with line numbers          |
| `render_diagram` | Draw one as SVG                                                          |
| `diff_diagrams`  | Compare a diagram with a proposed version                                |

It needs only Node, and only reads and writes inside the folder you give it. isketch is not on npm
yet, so point at a clone:

```bash
# Claude Code, from your project
claude mcp add isketch -- node /path/to/isketch/bin/isketch.mjs mcp .
```

For Claude Desktop, or any client with a JSON config:

```json
{
  "mcpServers": {
    "isketch": {
      "command": "node",
      "args": ["/path/to/isketch/bin/isketch.mjs", "mcp", "/path/to/your/project"]
    }
  }
}
```

Then ask: _"Read docs/architecture.flow and scaffold the services it shows"_, or _"Add the cache
you just built to the architecture diagram"_.

## Hosted links for agents

`server/` is a small NestJS and PostgreSQL service that stores a diagram behind an unguessable link
and serves it in every form a reader wants:

| URL             | What it returns                                                         |
| --------------- | ----------------------------------------------------------------------- |
| `/d/:id`        | A page with the drawing and the brief as text, so AI fetchers read it   |
| `/d/:id.md`     | The brief, as Markdown                                                  |
| `/d/:id.flow`   | The `.flow` source                                                      |
| `/d/:id.svg`    | The drawing, sketch font embedded                                       |
| `/d/:id.json`   | The document                                                            |
| `/d/:id/og.png` | The drawing itself, as a 1200x630 PNG link preview, cached per revision |

`POST /api/diagrams` with `.flow` text (or JSON `{ "text": … }`) publishes it and returns the link and
an edit token, shown once and stored only as a hash. `PUT` and `DELETE` on `/api/diagrams/:id` with
`Authorization: Bearer <token>` update or unpublish it. There are no accounts: anyone with the link
can read, only the token can change it. Invalid text is refused with line numbers.

It reads, briefs and draws with the app's own `src/domain` code, so a link shows exactly what the
editor and the CLI do.

It is also a remote MCP server, at `/mcp` over Streamable HTTP, so an agent that cannot run a local
process can still work with diagrams by their links: `read_diagram` (as a brief or `.flow` text),
`publish_diagram` (returning the link and an edit token for the person) and `update_diagram` (with
that token, saying what changed). Add it to Claude as a custom connector with the server's `/mcp`
URL, or `claude mcp add --transport http isketch https://your-server/mcp`.

```bash
docker compose --profile server up        # the server on :3000, with PostgreSQL
curl -X POST -H 'content-type: text/plain' --data-binary @examples/architecture.flow \
  localhost:3000/api/diagrams
```

To run it without Docker: `cd server && npm ci && npm run build`, then
`DATABASE_URL=postgres://… npm start`. Settings are `PORT`, `DATABASE_URL`, `PUBLIC_URL` (the
links' origin), `APP_URL` (for "Open in isketch"), `CORS_ORIGINS` and `MAX_BYTES`. Its tests run
against a real PostgreSQL: `DATABASE_URL=… npm test` in `server/`.

## Diagrams in pull requests

When a pull request changes a `.flow` file, a comment lists what changed and draws it, with
additions green, removals dashed red and edits amber. The drawing is Mermaid, which GitHub renders
in the comment, so nothing needs hosting. Later pushes update the same comment.

This repository runs it from [`.github/workflows/diagrams.yml`](.github/workflows/diagrams.yml).
Any repository can do the same:

```yaml
on:
  pull_request:
    paths: ['**/*.flow']
permissions:
  contents: read
  pull-requests: write
jobs:
  diagrams:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: raj-khan/flow/.github/actions/diagram-report@main
```

The action needs only git and Node, with nothing to install.

## Scripts

| Command             | What it does                      |
| ------------------- | --------------------------------- |
| `npm run dev`       | Vite dev server                   |
| `npm run build`     | Production bundle                 |
| `npm test`          | Unit and component tests (Vitest) |
| `npm run test:e2e`  | End to end tests (Playwright)     |
| `npm run lint`      | ESLint, with fixes                |
| `npm run typecheck` | Type check the JSDoc types        |

## Stack

Vue 3, [Vue Flow](https://vueflow.dev), TanStack Query, Pinia, Vue Router, Tailwind CSS, Vite.
Plain JavaScript with JSDoc types checked by `vue-tsc` in strict mode.

## How it fits together

```text
src/
  domain/        Pure logic, no Vue imports: document, shapes, samples, graph, layout,
                 validation, shortcuts, formatting
  api/           The storage backend and query keys
  composables/   Queries, optimistic mutations, drafts, keyboard, history, theme
  stores/        Pinia: viewport, undo history, theme, toasts
  components/    canvas/, drawer/, ui/
  views/         FlowView
  router/        Routes, including the nested node route
  cli/           The command line, with its I/O handed in
  mcp/           The MCP server's protocol and tools; bin/mcp.mjs is its stdio side
server/          Hosted links: NestJS and PostgreSQL, TypeScript, reusing src/domain
e2e/             Playwright specs
```

**The document.** A diagram is `{ version, title, nodes, edges }`. `migrate()` in
`src/domain/document.js` lifts anything older, so storage and, later, files only ever hand the
app the current shape.

**The shape registry.** `src/domain/nodeMeta.js` holds everything that differs by shape: label,
hint, accent, and whether it can be opened, edited or deleted. `src/domain/shapes.js` draws each
outline as SVG path data, a pure function the canvas, the pickers and a future exporter all share.
Adding a shape is one entry in each.

**State has three owners.** TanStack Query owns the document. The URL owns which node is open.
Pinia owns the viewport, undo history, theme and toasts. Nothing is copied from one to another, and
form edits live in a local draft until saved, so a refetch cannot overwrite typing.

**Storage is behind an API-shaped module.** `src/api/flowApi.js` is the only code that touches
persistence. Today it seeds a first visit from the samples in `src/domain/samples/` and saves to
`localStorage`; it is
async and shaped like a REST client so a real backend can replace it without touching a component.
Writes carry a small simulated latency so optimistic updates and rollbacks stay honest.

**Optimistic mutations** share one factory: cancel in-flight queries, snapshot the cache, apply the
change, restore the snapshot on failure, then invalidate.

**Layout.** `layoutTree` gives unplaced nodes a tidy top-down tree; anything dragged keeps its
position. `nextFreePosition` stops a new node landing on an existing one.

**Keyboard.** `src/domain/shortcuts.js` is the single source for shortcuts, read by both the
handlers and the help dialog, so a tooltip cannot disagree with the binding. Canvas navigation
stands down while a dialog is open or a field has focus.

**Theme.** Colours are CSS tokens that Vue Flow and every component read, and the interface
respects `prefers-reduced-motion`.

## Tests

| Level      | Covers                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| Unit       | Domain logic, storage, composables, stores, components                 |
| End to end | Rendering, drag, zoom, connect, deep links, create, edit, delete, undo |

happy-dom has no layout, so the canvas is covered by Playwright rather than mocked. Playwright
needs its browser once:

```bash
npx playwright install chromium
```

`npm run test:e2e` builds and serves the app itself. It reuses a `vite preview` already on port
4173, so stop one first or it tests the previous build.

CI runs lint, typecheck, unit tests and the build in one job, and Playwright against the
production build in another.

## Deployment

The build is a static single page app, so any static host works as long as unknown paths fall back
to `index.html`. `docker/nginx.conf` does that for the container and `vercel.json` for Vercel.

## Known limits

- One document per browser.
- Storage is per browser, so two tabs do not see each other's edits and nothing syncs between
  devices.
- Undo history is in memory; the edits themselves survive a reload, the history does not.

## Contributing

Pick a ticket from [BACKLOG.md](BACKLOG.md), branch, and open a pull request against `main`.
[AGENTS.md](AGENTS.md) holds the rules the code cannot tell you, for people and AI agents alike;
`CLAUDE.md` points at it. A pre-commit hook scans staged changes for credentials.

## License

[MIT](LICENSE)
