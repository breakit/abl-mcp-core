# abl-mcp-core

Pure ABL analysis library — no MCP dependency. Can be reused by the language server, CLIs, or other tools.

## Features

### Parsing & Analysis
- **ABL parser** — Parse `.p`/`.w`/`.cls`/`.i` files via tree-sitter-abl, extract functions, includes, preprocessor defines/references
- **DF parser** — Parse `.df` schema files into structured tables, fields, indexes, and sequences
- **DF diff** — Compare two `.df` files and produce a structured diff of added/removed/modified tables, fields, indexes
- **Dependency graph** — Build a full project dependency graph — includes, function calls, cycles, orphans
- **Dead code detection** — Find unused functions, includes, and preprocessor defines

### Linting
- **ABL lint** — 33 Prolint-inspired rules covering NO-UNDO, deprecated keywords, lock safety, performance (WHERE clauses, lock types), style (naming conventions, block labels), bug prevention (backslash-in-strings, dot-comments, RETURN ERROR), cross-platform issues (path separators), and i18n

### REST / OpenAPI
- **OpenAPI generator** — Parse `@openapi.openedge.export` annotations and generate OpenAPI 3.0 JSON specs

### Project Management
- **PROPATH resolver** — Load `abl.toml`, resolve `{include}` paths against PROPATH
- **Project config** — Read `abl.toml` for schema dirs, databases, and PROPATH
- **Symbol extraction** — Extract function signatures, table/field definitions, include dependencies

### Documentation
- **ABLDoc parser** — Parse `/** */` doc comments and extract structured entries
- **Doc comment generator** — Auto-generate properly formatted ABLDoc comment blocks

### Data Contracts
- **Temp-table include** — Generate `.i` files from table/field definitions
- **ProDataSet include** — Generate `.i` files wrapping temp-tables in datasets
- **JSON Schema** — Generate JSON Schema from ABL table definitions
- **TypeScript interfaces** — Generate TypeScript types from ABL field definitions

## Usage

```typescript
import { initAblParser, parseAblFile, loadPropath, parseDf } from '@breakit/abl-mcp-core'
import { buildDependencyGraph, diffDfFiles, lintProject, findDeadCode } from '@breakit/abl-mcp-core'
import { generateOpenApiSpec } from '@breakit/abl-mcp-core'
import { generateDocComment, parseAblDoc } from '@breakit/abl-mcp-core'
import { generateTempTableInclude, generateJsonSchema, generateTypeScript } from '@breakit/abl-mcp-core'

// Dependency analysis
const graph = buildDependencyGraph('./project-root')

// Schema comparison
const diff = diffDfFiles(oldDfText, newDfText)

// Lint
const report = lintProject('./project-root')

// OpenAPI from ABL REST annotations
const spec = generateOpenApiSpec('./project-root')

// Data contracts
const tt = generateTempTableInclude({ name: 'Customer', fields: [{ name: 'CustNum', dataType: 'INTEGER' }] })
const ts = generateTypeScript({ name: 'Customer', fields: [{ name: 'CustNum', dataType: 'INTEGER' }] })
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
├── utils/
│   ├── data-contracts.ts   # .i / JSON Schema / TypeScript generators
│   ├── doc-comment.ts      # ABLDoc comment generator
│   └── doc-parser.ts       # ABLDoc comment parser
└── index.ts
```

## License

MIT
