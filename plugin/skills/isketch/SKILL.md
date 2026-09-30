---
name: isketch
description: Read, create and update isketch diagrams (.flow files) of architectures, databases, flows and UI screens. Use when the user shares an isketch brief or link, when the repository has .flow files, when asked to sketch, draw or diagram a system, or after changing code that a .flow diagram describes, so the diagram stays true.
---

# isketch diagrams

An isketch diagram is a `.flow` file: plain text naming every shape, what kind it is, and how the
shapes connect. Read it exactly; never guess a design from a picture. Write it back when the code
changes, so the diagram and the code agree.

The `isketch` MCP server in this plugin works on the `.flow` files in the project:

| Tool             | Use it to                                                             |
| ---------------- | --------------------------------------------------------------------- |
| `list_diagrams`  | find every diagram, with its title and size                           |
| `read_diagram`   | read one as a brief (what to build) or as `.flow` text (what to edit) |
| `write_diagram`  | create or replace one; invalid text comes back with line numbers      |
| `render_diagram` | draw one as SVG, to check it or to put in docs                        |
| `diff_diagrams`  | compare a diagram with a proposed version before writing it           |

## Building from a diagram

1. `list_diagrams`, then `read_diagram` as a brief for the one that matters.
2. Build what it names, using the shape ids and names it gives: a `database` is a data store, a
   `decision` a branch the code must handle, a `table` a database table with the columns listed,
   a `screen` a page of the interface.
3. Follow every note (`note:` for the diagram, `id note:` for one shape): they are instructions
   from whoever sketched it.

## Keeping a diagram true

After changing code a diagram describes (a new service, table, screen or connection):

1. `read_diagram` as `.flow` text.
2. Change only the lines that changed. Keep every id, and keep the `@layout` block as it is: new
   shapes need no position, they are laid out automatically.
3. `diff_diagrams` against the new text, check the changes are the ones you meant, then
   `write_diagram`. Fix any line it reports and write again.
4. Tell the person what you changed in the diagram, in a sentence.

If the person has the file open in isketch, they see your change as it happens.

## The .flow format

```text
title: Shop
note: Use PostgreSQL; every write must be idempotent

api = process "API" -- REST, documented with OpenAPI
db = database "Orders"
pay = decision "Paid?"
db note: Paginate every list

api -> db : SQL
api -> pay
pay --> api : retry

@layout
api 0,0
db 0,176
```

- `id = shape "Name" -- description` declares a shape. Ids are letters, digits, `_` and `-`,
  and never change once other lines refer to them.
- Shapes: `process`, `terminal`, `decision`, `data`, `database`, `document`, `note`, `table`,
  `text`, `frame`; for interfaces `screen`, `button`, `input`, `card`, `list`, `image`. A
  `table` lists its columns in its description: `id PK, email, user_id FK`.
- `a -> b : label` connects two shapes. `-->` is dashed (optional or asynchronous), `<->` has
  an arrow at each end, `<-->` is both.
- `note: ...` under the title, and `id note: ...` for a shape, one line each.
- `id color: red` colours a shape or stroke: `red`, `orange`, `yellow`, `green`, `teal`, `blue`, `violet`, `pink` or `grey`. Use colour to
  mean something, and say what in a note.
- `id arrow: end` or `both` puts a head on a pen stroke; it is a mark, not a connection.
- `id = frame "Name"` is a named region; the shapes inside it (by position) belong to it.
- Under the title, `style: sketch` draws by hand and `lines: curved` or `lines: straight`
  changes how connections run.
- `@layout` holds positions, `id x,y` with ` WxH` for a resized shape; `@ink` holds pen
  strokes. Leave both alone unless asked to move things.
- `#` starts a comment. A newline inside a description is written `\n`.

## Starting a diagram

For a new diagram, write it with `write_diagram` to `docs/architecture.flow` (or where the
person asks), with no `@layout`: isketch lays it out. For a first draft of a whole repository,
the isketch CLI can do it: `isketch scan . -o docs/architecture.flow`.

The person can open any `.flow` file at https://isketch.online/new (Open file) to see it and
sketch on it.
