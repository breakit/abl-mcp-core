# abl-mcp-core

Pure ABL analysis library — no MCP dependency. Can be reused by the language server, CLIs, or other tools.

Part of the [abl-mcp-server](https://github.com/breakit/abl-mcp-server) ecosystem. See also: [`@breakit/abl-mcp-generators`](https://github.com/breakit/abl-mcp-generators), [`@breakit/abl-mcp-contracts`](https://github.com/breakit/abl-mcp-contracts). Documentation utilities live in [`@breakit/abl-mcp-doc`](https://github.com/breakit/abl-mcp-doc).

## Features

### Parsing & Analysis
- **ABL parser** — Parse `.p`/`.w`/`.cls`/`.i` files via tree-sitter-abl, extract functions, includes, preprocessor defines/references
- **DF parser** — Parse `.df` schema files into structured tables, fields, indexes, and sequences
- **DF diff** — Compare two `.df` files and produce a structured diff of added/removed/modified tables, fields, indexes
- **Dependency graph** — Build a full project dependency graph — includes, function calls, cycles, orphans
- **Dead code detection** — Find unused functions, includes, and preprocessor defines

### Linting
- **ABL lint** — 37 Prolint-inspired rules covering NO-UNDO, deprecated keywords, lock safety, performance (WHERE clauses, lock types), style (naming conventions, block labels), bug prevention (backslash-in-strings, dot-comments, RETURN ERROR), cross-platform issues (path separators), and i18n

### REST / OpenAPI
- **OpenAPI generator** — Parse `@openapi.openedge.export` annotations and generate OpenAPI 3.0 JSON specs

### Project Management
- **PROPATH resolver** — Load `abl.toml`, resolve `{include}` paths against PROPATH
- **Project config** — Read `abl.toml` for schema dirs, databases, and PROPATH
- **Symbol extraction** — Extract function signatures, table/field definitions, include dependencies

### Data Contracts → [`@breakit/abl-mcp-contracts`](https://github.com/breakit/abl-mcp-contracts)
Generating temp-table includes, ProDataSet includes, JSON Schema, and TypeScript interfaces — now a separate package.

## Usage

```typescript
import { initAblParser, parseAblFile, loadPropath, parseDf } from '@breakit/abl-mcp-core'
import { buildDependencyGraph, diffDfFiles, lintProject, findDeadCode } from '@breakit/abl-mcp-core'
import { generateOpenApiSpec } from '@breakit/abl-mcp-core'
// Dependency analysis
const graph = buildDependencyGraph('./project-root')

// Schema comparison
const diff = diffDfFiles(oldDfText, newDfText)

// Lint
const report = lintProject('./project-root')

// OpenAPI from ABL REST annotations
const spec = generateOpenApiSpec('./project-root')
```

## Structure

```
src/
├── analysis/
│   ├── dependencies.ts     # Dependency graph
│   ├── df-diff.ts          # .df schema diff
│   ├── dead-code.ts        # Dead code detection
│   ├── lint.ts             # ABL linter
│   └── openapi.ts          # OpenAPI spec generator
├── contracts/
│   ├── abl.ts              # ABL parser types
│   ├── df.ts               # DF schema types
│   ├── project.ts          # PROPATH and config types
│   └── symbol.ts           # Symbol extraction types
├── parser/
│   ├── abl.ts              # tree-sitter-abl wrapper
│   └── df.ts               # .df schema file parser
├── project/
│   ├── protopath.ts        # PROPATH resolution
│   └── config.ts           # abl.toml config reader
├── symbol/
│   ├── functions.ts
│   ├── tables.ts
│   └── includes.ts
└── index.ts
```

## Development

```sh
git clone https://github.com/breakit/abl-mcp-core.git
cd abl-mcp-core
yarn install
yarn build
```

### Local Multi-Repo Development

This repo is designed to work as a sibling of:

- `../abl-mcp-server`
- `../abl-mcp-generators`
- `../abl-mcp-contracts`
- `../abl-mcp-doc`

Documentation helpers such as ABLDoc parsing and comment generation live in `../abl-mcp-doc`, not in this package.

When you update `abl-mcp-core`, rebuild it before testing dependent repos:

```sh
yarn build
```

Then, from `../abl-mcp-server`, refresh the local links:

```sh
yarn build:local-deps
yarn link:local-deps
```

## Acknowledgments

- Lint rules inspired by [Prolint](https://github.com/jcaillon/prolint) by Jurjen Dijkstra and contributors
- ABL parsing powered by [tree-sitter-abl](https://github.com/usagi-coffee/tree-sitter-abl)

## License

MIT
