# Backlog

## isketch: sketch it, hand it to your agent

**The honest problem.** A diagram editor on its own is a hard sell: draw.io and Excalidraw are free
and good. What neither does well is the step that now matters most: getting what is in your head
into a coding agent. Today people sketch in Excalidraw, screenshot it, and paste the picture into
Claude or Copilot. The agent then guesses at boxes and arrows from pixels. Names get misread,
arrows lose their direction, and nothing the agent writes back can be put on the diagram.

**isketch is a sketchpad whose output is agent-ready context.** Sketch loosely like Excalidraw,
structure it like draw.io, and every sketch is also precise text that an agent reads exactly and
can edit back: the `.flow` format, a Markdown brief, Mermaid, and an MCP server so an agent can
open, change and redraw your diagrams itself.

The loop it is built for, from a rough idea to production:

1. **Sketch** an architecture, a database, a UI screen or a flow in minutes, hand-drawn look and all.
2. **Hand it over**: _Copy for AI_ puts a structured brief on the clipboard; or the agent reads the
   `.flow` file in the repo; or it connects over MCP.
3. **The agent builds from it**: services, tables, components, with names and relationships taken
   from the sketch rather than guessed from a picture.
4. **The diagram stays true**: the agent updates the `.flow` file as the code changes, and every pull
   request shows the diagram diff (already shipped).

**Why an agent benefits, concretely** (said by one): a picture costs me guesses; text with ids,
kinds, directions and notes costs me nothing to read and lets me write back. Given a sketch as
`.flow` or a brief, I can scaffold the tables, services and screens it names, and update the
diagram when I change them, so the design and the code stop drifting apart.

**What is already true today:** the text format, two-way editing, Mermaid, imports from compose,
OpenAPI and SQL, files in the repo, a CLI, and diagram diffs on pull requests. Those were built as
"diagrams next to your code", and they are exactly the foundation an agent needs.

**What is not true yet, and matters:** a share link today keeps the diagram in the part of the URL
after `#`, which browsers never send to a server, so an AI that fetches the link sees nothing.
Links an agent can read need a small server (Milestone 7).

**How we will know.** People paste a brief into an agent, or connect the MCP server, and come back.
Measure: briefs copied per sketch, and MCP installs.

## How we work

One ticket, one branch, one pull request, merged when CI is green. Tickets carry on from the
original build (FL-00 to FL-36, in the git history). The product was called Flow until FL-63.

**Status:** ✅ done · 🚧 in progress · ⏭️ next · ⬜ not started

## Milestone 0: Own the codebase ✅

| Ticket | What                                                                     | Status |
| ------ | ------------------------------------------------------------------------ | ------ |
| FL-37  | Remove the payload dependency: bundled starter, no proxies, no config    | ✅     |
| FL-38  | Product README and backlog                                               | ✅     |
| FL-39  | Rename to Flow, `flow:` storage keys, one time migration of the old ones | ✅     |

## Milestone 1: A real diagram model

The app still stores a bare array of chat-bot nodes whose one edge comes from `parentId`. Nothing
in milestone 2 is possible until diagrams are nodes and edges.

### FL-40 · Document model v2 ✅

- `{ version: 2, title, nodes: [], edges: [] }` with explicit edges
  `{ id, source, target, label? }`
- A pure `migrate()` in `src/domain/` lifts a v1 array into v2, including what is already saved
- `graph.js` builds from `edges`; deleting a node deletes its edges, nothing is re-parented
- Any number of incoming and outgoing edges; self loops and exact duplicates are refused
- Connecting adds an edge instead of moving the target

**Done when** a saved v1 document opens unchanged, and two nodes can both point at a third.

### FL-41 · General shapes ✅

- Registry entries for process (rectangle), terminal (rounded), decision (diamond), data
  (parallelogram), database (cylinder), document, note, and text
- One card component draws any shape as an SVG outline with a label and an optional description
- The chat-bot types migrate onto shapes so nothing drawn is lost; their drawer bodies, the
  business hours logic and `@vuepic/vue-datepicker` are removed

### FL-42 · New diagram, blank canvas and samples ✅

- "Reset flow" becomes "New diagram", which starts empty with a hint
- The old support flow and a small architecture diagram become samples

### FL-43 · Shape palette ✅

A left sidebar lists every shape; drag one onto the canvas to create it where it lands, or click to
add it at the centre. Replaces the create dialog.

## Milestone 2: The wedge

### FL-44 · The `.flow` text format ✅

- A small line based format: one node or edge per line, stable order, so a diff shows exactly
  what changed
- `parse()` and `serialise()` in `src/domain/`, round trip exact, errors with line numbers
- Layout is kept apart from meaning: positions live in a block at the end, so moving a box never
  touches the lines that describe the system

### FL-45 · Two way text editor ✅

A split pane: text on the left, canvas on the right. Typing re-renders the canvas as you type,
keeping every position it can; editing the canvas rewrites the text. Parse errors are shown on the
line, and the canvas keeps the last good diagram.

### FL-46 · Mermaid import and export ✅

Flowchart subset: nodes, shapes, labelled edges, direction. Paste Mermaid, get an editable diagram;
export any diagram as Mermaid to drop into a README.

### FL-47 · Import `docker-compose.yml` ✅

Services become nodes, `depends_on` and shared networks become edges, ports and images become
descriptions. Re-importing updates the diagram and keeps the layout.

### FL-48 · Import OpenAPI ✅

Tags or path groups become nodes, schemas referenced between them become edges.

### FL-49 · Import SQL DDL as an entity diagram ✅

`CREATE TABLE` becomes a table node listing its columns; foreign keys become edges.

### FL-50 · Share as a link ✅

The whole diagram compressed into the URL hash. Opening the link opens a copy; nothing touches a
server.

## Milestone 3: Git native

### FL-51 · Open and save files ✅

Open a `.flow` file from disk and save back to it (File System Access API, with download and upload
as the fallback), so a diagram lives in a repository rather than in the browser.

### FL-52 · Render without a browser ✅

A pure SVG renderer in `src/domain/`, and `npx flow render diagram.flow -o diagram.svg`, so CI and
docs sites can build images.

### FL-53 · Visual diff ✅

Compare two versions of a diagram: added, removed and changed nodes and edges highlighted, on the
canvas and as an SVG.

### FL-54 · GitHub Action ✅

On a pull request that changes a `.flow` file, post the before and after as a comment.

## Milestone 5: Built for agents ✅

### FL-63 · Become isketch ✅

- The name everywhere in the app, the package and the docs; `isketch` as the command
- The positioning above, in the README
- The repository rename to `isketch.online` and the domain are the owner's to do

### FL-64 · Copy for AI ✅

- One button that puts a Markdown brief on the clipboard: what the diagram is, every shape with
  its kind and notes, every connection in words, then the `.flow` source to edit and hand back
- Kinds read as intent: a database becomes "a data store", a decision "a branch the code must
  handle", a table lists its columns
- `isketch brief diagram.flow` prints the same, for scripts and agents

### FL-65 · MCP server ✅

- `isketch mcp` runs a local MCP server over stdio, pointed at a folder of `.flow` files
- Tools: list diagrams, read one as a brief or as text, write one (validated, with line errors
  back), render to SVG, diff two versions
- A setup line for Claude Code and Claude Desktop in the README

### FL-66 · Wireframe shapes ✅

Screen, button, input, card, list and image shapes, in their own palette section, so a UI can be
sketched and handed over as an interface to build, not only boxes and arrows. Navigation is a
screen connected to screens.

### FL-67 · Notes an agent can act on ✅

A free-text note on the diagram (`note: ...`) and on each shape (`id note: ...`, or "Notes for
the builder" in its details), such as "paginate this" or "must be idempotent". Noted shapes are
marked on the canvas, and notes travel with the brief, the `.flow` file and MCP.

## Milestone 6: Sketch feel ✅

### FL-68 · Hand-drawn style ✅

A sketch or clean switch per diagram (`style: sketch`): outlines and edges redrawn by Rough.js,
seeded by id so they hold still, and a handwritten font (Patrick Hand, bundled, embedded in
exported SVGs). The same diagram underneath, in the app and in SVG.

### FL-69 · Freehand pen ✅

A pen (`P`) that draws strokes over the diagram, each an `ink` shape that moves, resizes and undoes
like any other, with its points in an `@ink` block. Clicks pass through a stroke's box to the shape
it circles. Strokes stay out of the brief, Mermaid and draw.io. Freehand arrows are left for later:
a connection already says "this goes there" in a way an agent can read.

### FL-70 · draw.io XML import and export ✅

Import a `.drawio` file (compressed or plain, first page) or Edit Diagram XML, mapping styles to
the nearest shape, reading entity tables with their rows, and flattening lanes; skipped arrows and
pages are listed. Export plain XML, marked with an `isketch` style key so a round trip is exact.

## Milestone 7: Links an agent can read

### FL-71 · Hosted diagrams ✅

A small service (NestJS and PostgreSQL) that stores a diagram behind an unguessable link, serving a
page that carries the brief as text to people and AI fetchers, and `.md`, `.flow`, `.svg` and
`.json` forms. Readable by anyone with the link, changeable only with its edit token.

- ✅ The server, its tests against PostgreSQL, Docker and CI
- ✅ Publish from the app: a public link from Share, updated in place on later publishes
- ⬜ Hosting it at isketch.online, which is the owner's to do

### FL-72 · Remote MCP ⏭️

Tracked in `backlog/`.

## Where the gaps are (audit, 2026-09-26)

A product this good at being read by agents is almost invisible to search engines and people:

- **Search and sharing.** `index.html` has a title and nothing else: no description, canonical,
  Open Graph or Twitter tags, no `robots.txt`, `sitemap.xml`, web manifest, `apple-touch-icon` or
  structured data. A shared `isketch.online` link unfurls as a bare URL. The hosted page
  (`server/src/diagrams/page.ts`) has one generic description and no preview image.
- **Nothing to index.** `/` redirects straight into the editor, a client-rendered SPA. There is no
  landing page, no docs page for the `.flow` format, no templates and no pages for the converters
  that already exist (Mermaid, draw.io, SQL, compose, OpenAPI).
- **Phones and tablets.** No responsive classes anywhere in `src/`, a fixed 192px palette and a
  fixed header with every button in one row, no touch gestures. Anyone opening a shared link on a
  phone gets a broken desktop layout.
- **The canvas is boxed in.** Header, palette and text panel take the edges of the screen, where
  Excalidraw and tldraw give the whole viewport to the canvas and float the tools over it.
- **No way to measure.** "How we will know" counts briefs copied and MCP installs, and nothing
  records either.

The patterns to reuse are already in the owner's other projects: metadata, `opengraph-image`,
JSON-LD and `llms.txt` in idemo.video; `sitemap.ts`, `robots.ts`, `manifest.ts`, `compare/[slug]`
and `llms-full.txt` in openlookup-web; free single-purpose tool pages in shipseo; `use-cases/[slug]`
in aiagentflow.dev.

**Order:** Milestone 8 first (cheap, and every later launch depends on links that unfurl), then 9
and 10 together, then 11. None of it pays off until isketch.online is live (FL-71).

## Milestones 8 to 11

From FL-72 on, each ticket is a task in `backlog/` ([Backlog.md](https://github.com/MrLesk/Backlog.md)),
with its description and acceptance criteria. `backlog board` shows them; `backlog browser` opens
the web board.

| Milestone                            | Tickets                                                                      |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| M8 Findable                          | FL-73 head tags, FL-74 landing page, FL-75 diagram previews, FL-76 llms.txt  |
|                                      | FL-77 templates, converters, comparisons; FL-78 analytics                    |
| M9 The whole screen, on every screen | FL-79 canvas first, FL-80 full screen, FL-81 phones, FL-82 PWA, FL-83 extras |
| M10 Own the niche                    | FL-84 Excalidraw, FL-85 Prisma, FL-86 scan, FL-87 live edits, FL-88 embeds   |
|                                      | FL-89 agent plugins, FL-90 diagram from words                                |
| M11 Launch                           | FL-91 launch kit                                                             |

## Milestone 4: Editing essentials (continues alongside)

| Ticket | What                                                                     | Status |
| ------ | ------------------------------------------------------------------------ | ------ |
| FL-55  | Multi-select: box, Shift+click, Ctrl+A; move and delete as one undo step | ✅     |
| FL-56  | Inline text editing on double-click, for shapes and edge labels          | ✅     |
| FL-57  | Resize shapes, stored on the node                                        | ✅     |
| FL-58  | Connectors: four sides, straight, orthogonal or curved, arrows, dashes   | ✅     |
| FL-59  | Copy, cut, paste and duplicate, with the edges between copied shapes     | ✅     |
| FL-60  | Grid, snapping, align and distribute                                     | ✅     |
| FL-61  | Automatic layout for any graph, not only trees                           | ✅     |
| FL-62  | Export PNG and SVG from the app                                          | ✅     |

## Later, if the wedge holds

- Many documents with a home page, and IndexedDB storage
- Terraform and Kubernetes import
- A backend, accounts and live collaboration
