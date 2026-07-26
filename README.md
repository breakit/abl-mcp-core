# abl-mcp-core

Pure ABL analysis library — no MCP dependency. Can be reused by the language server, CLIs, or other tools.

## Features

- **ABL parser** — Parse `.p`/`.w`/`.cls`/`.i` files via tree-sitter-abl, extract functions, includes, preprocessor defines/references
- **DF parser** — Parse `.df` schema files into structured tables, fields, indexes, and sequences
- **PROPATH resolver** — Load `abl.toml`, resolve `{include}` paths against PROPATH
- **Project config** — Read `abl.toml` for schema dirs, databases, and PROPATH
- **Symbol extraction** — Extract function signatures, table/field definitions, include dependencies

## Usage

```typescript
import { initAblParser, parseAblFile } from '@breakit/abl-mcp-core'
import { parseDf, formatDfSummary } from '@breakit/abl-mcp-core'
import { loadPropath, resolveIncludePath } from '@breakit/abl-mcp-core'

// Parse an ABL file
await initAblParser()
const result = parseAblFile(sourceText)
console.log(result.functions)  // FunctionNode[]

// Parse a .df file
const tables = parseDf(dfText)
console.log(formatDfSummary(tables))

// Resolve includes
const propath = loadPropath(projectRoot)
const resolved = resolveIncludePath('{include.i}', propath, currentFilePath)
```

## Structure

```
src/
├── parser/
│   ├── abl.ts      # tree-sitter-abl wrapper
│   └── df.ts       # .df schema file parser
├── project/
│   ├── protopath.ts # PROPATH resolution
│   └── config.ts    # abl.toml config reader
├── symbol/
│   ├── functions.ts
│   ├── tables.ts
│   └── includes.ts
└── index.ts
```

## License

MIT
