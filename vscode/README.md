# isketch for VS Code

Preview and edit [isketch](https://isketch.online) diagrams beside your code. A `.flow` file is an
architecture, database, flow or UI sketch written as text that a coding agent reads exactly and
edits back; this extension draws it as you type.

- **Live preview** to the side (`Ctrl+K V`, or the preview button on a `.flow` file), redrawn on
  every edit, in your theme. While the text has an error, the last good drawing stays up.
- **Errors by line**, underlined where they are, with the parser's own words.
- **Syntax colours** for shapes, ids, names, descriptions, connections and notes.
- **Open in isketch** to sketch on it in the full editor. The diagram travels inside the link;
  nothing is uploaded.

Pair it with the isketch MCP server or the Claude Code plugin, and watch the drawing change as your
agent edits the file.

## The format

```text
title: Shop

api = process "API" -- REST
db = database "Orders"
api -> db : SQL
```

The whole format is at [isketch.online/docs/format](https://isketch.online/docs/format).
