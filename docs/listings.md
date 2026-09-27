# Getting isketch listed

Everything below is ready in the repository; each step publishes under the owner's own accounts,
so it is the owner's to run. Do them after isketch.online serves the hosted server (FL-71), since
the listings point at it.

## Claude Code plugin

Already installable from this repository, which is its own marketplace:

```text
/plugin marketplace add raj-khan/flow
/plugin install isketch@isketch
```

It adds the `isketch` skill (the `.flow` format, and when to read or update a diagram) and the local
MCP server, bundled in `plugin/server/` so nothing needs installing. `claude plugin validate ./plugin`
and `claude plugin validate .` both pass. To reach more people, submit it to a community plugin
directory as that directory asks.

## Official MCP registry

`server.json` describes the hosted server's `/mcp` endpoint under `io.github.raj-khan/isketch`,
which the registry verifies through GitHub.

```bash
brew install mcp-publisher        # or download it from the registry's releases
mcp-publisher login github
mcp-publisher publish             # reads server.json
```

## MCP directories

With the registry entry live, add isketch to the directories that list servers by hand, each with
the one-line description from `server.json` and a link to the README:

- Smithery, Glama, PulseMCP and mcp.so, through their submit forms
- awesome-mcp-servers, by pull request, under diagramming or developer tools

## VS Code Marketplace

```bash
npm run vscode                                   # builds vscode/dist
cd vscode && npx @vscode/vsce login raj-khan     # a Personal Access Token from Azure DevOps
npx @vscode/vsce publish
```

The publisher id in `vscode/package.json` is `raj-khan`; create it at
marketplace.visualstudio.com/manage first. `npx @vscode/vsce package` makes a `.vsix` to try
locally with _Extensions: Install from VSIX_. Publish to Open VSX too (`npx ovsx publish`), for
Cursor, Windsurf and VSCodium.
