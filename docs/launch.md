# Launch kit

Drafts to post, in the owner's voice. Each points at the README, whose hero GIF shows the loop.
Post after isketch.online serves the app and the hosted server, so every link works, and after the
60 second demo video (made with idemo.video) is uploaded to the README.

`npm run video` records a 70 second demo with sound (sketch, Copy for AI, an agent editing the
diagram, a remote agent publishing one by URL). It needs the production build, a local isketch
server with `PUBLIC_URL` and `APP_URL` set to `https://isketch.online`, and ffmpeg: see the
comment at the top of `scripts/make-demo-video.mjs`.

## Show HN

**Title:** Show HN: isketch, a sketchpad your coding agent reads exactly

**Text:**

I kept sketching architectures in Excalidraw, screenshotting them, and pasting the picture into
Claude. The agent then guessed at boxes and arrows from pixels: misread names, lost arrow
directions, and nothing it wrote back could go on the diagram.

isketch is a sketchpad where every sketch is also plain text, a `.flow` file with ids, kinds,
directions and notes. Copy for AI puts a Markdown brief on the clipboard; an MCP server lets
Claude Code or any agent list, read, validate, render and edit the diagrams in your repo; and when
the agent writes the file, the open canvas shows the change as it happens.

It imports draw.io, Excalidraw, Mermaid, docker-compose, OpenAPI, SQL, Prisma and Drizzle,
`isketch scan` drafts a diagram of a whole repository, and pull requests get a visual diff. It works
offline, needs no account, and is MIT licensed.

https://github.com/raj-khan/isketch

## Product Hunt

- **Tagline:** Sketch it, hand it to your agent
- **Description:** A sketchpad whose output is agent-ready: every diagram is also text that Claude,
  Copilot or any coding agent reads exactly and edits back. Hand-drawn look, draw.io and
  Excalidraw import, an MCP server, and a Claude Code plugin.
- **First comment:** why screenshots fail agents (names misread, directions lost, nothing to write
  back), the loop in one line, and one ask: which import should come next.

## Peerlist

- **Title:** isketch: sketch it, hand it to your agent
- **Tagline:** Diagrams your coding agent reads exactly, not guesses from a screenshot.
- **Description:**

  Screenshotting a diagram into Claude or Copilot makes it guess: names misread, arrow directions
  lost, and nothing it figures out can go back onto the picture.

  isketch is a sketchpad where every diagram is also plain text. Sketch an architecture, a
  database or a flow, hand-drawn look included, and it exists as a `.flow` file with ids, kinds,
  directions and notes that an agent reads exactly, and can edit back.

  - **Copy for AI** puts a Markdown brief on the clipboard in one click.
  - **An MCP server** lets Claude Code or any agent list, read, validate, render and edit the
    diagrams in your repo, and the open canvas shows its changes live.
  - **Bring what you have:** draw.io, Excalidraw, Mermaid, docker-compose, OpenAPI, SQL, Prisma
    and Drizzle import; `isketch scan` drafts a diagram of a whole repository.
  - Pull requests get a visual diff, so the design and the code stop drifting apart.

  Works offline, needs no account, MIT licensed.

## r/ClaudeAI

**Title:** I stopped pasting diagram screenshots into Claude. Now it reads and edits the diagram itself.

**Body:** the loop (sketch, Copy for AI or the MCP server, Claude builds, Claude updates the
`.flow` file, the canvas shows it live), the plugin install lines, and a short clip. Ask what
people would want Claude to do with a diagram next.

```text
/plugin marketplace add raj-khan/isketch
/plugin install isketch@isketch
```

## r/ChatGPTCoding

**Title:** Diagrams your coding agent can read: text, not pixels

**Body:** the same loop, told for any agent: Draft with your agent (describe, paste the answer),
Copy for AI, and the `.flow` file an agent edits in the repo. Lead with the before and after of a
screenshot against a brief.

## dev.to

**Title:** Stop screenshotting your Excalidraw for Claude

**Outline:**

1. The screenshot habit, and three ways it fails an agent.
2. What an agent needs instead: ids, kinds, directions, notes, as text.
3. The `.flow` format in ten lines.
4. The loop in practice: sketch, brief, build, the agent keeps the diagram true.
5. Bringing existing diagrams along: draw.io, Excalidraw, Mermaid, schemas, `isketch scan`.
6. Where it goes next.

## X

1. Pasting a diagram screenshot into Claude makes it guess. isketch makes every sketch text it
   reads exactly. (GIF)
2. Copy for AI: a Markdown brief with every shape, what it means, and every connection in words.
3. Or skip the clipboard: the MCP server lets Claude Code read, write and render your diagrams,
   and the open canvas shows its edits live.
4. Bring what you have: draw.io, Excalidraw, Mermaid, compose, OpenAPI, SQL, Prisma, Drizzle.
5. MIT, offline, no account: github.com/raj-khan/isketch

## Listings

Ready to paste; the MCP registry and marketplaces are in [listings.md](listings.md).

- **awesome-mcp-servers:** `- [raj-khan/isketch](https://github.com/raj-khan/isketch) - isketch: read,
write, validate, render and diff .flow architecture diagrams an agent reads exactly.`
- **awesome-claude-code:** under plugins, `isketch: the .flow diagram format as a skill, with an MCP
server to read, write and render diagrams in your repo.`
- **AlternativeTo:** list isketch as an alternative to Excalidraw, draw.io and Eraser, with the
  tagline and the GIF; tags: diagrams, whiteboard, AI, developer tools.
