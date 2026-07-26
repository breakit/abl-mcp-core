import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import type { AblFileResult } from '../contracts/abl.js'
import { parseAblFile } from '../parser/abl.js'

export interface OpenApiParameter {
  name: string
  in: 'query' | 'path' | 'header'
  required: boolean
  schema: { type: string }
  description?: string
}

export interface OpenApiEndpoint {
  path: string
  method: 'get' | 'post' | 'put' | 'delete'
  summary?: string
  parameters: OpenApiParameter[]
  responses: Record<string, { description: string }>
}

/**
 * Extract REST annotations and build an OpenAPI 3.0 specification.
 */
export function generateOpenApiSpec(rootDir: string): string {
  const endpoints: OpenApiEndpoint[] = []
  const files = findAblFiles(rootDir)

  for (const file of files) {
    try {
      const text = readFileSync(file, 'utf-8')

      // Parse file-level annotation for service path
      const fileAnno = text.match(/@openapi\.openedge\.export\s+FILE\s*\([\s\S]*?\)\./)
      if (!fileAnno) continue

      // Extract method-level annotations and their method signatures
      const methods = extractEndpoints(text, file, fileAnno[0])
      endpoints.push(...methods)
    } catch { /* skip */ }
  }

  return buildOpenApiSpec(endpoints)
}

interface ExtractedEndpoint {
  name: string
  sourcePath: string
  params: { name: string; dataType: string; direction: string }[]
  returnType?: string
}

function extractEndpoints(text: string, filePath: string, fileAnno: string): OpenApiEndpoint[] {
  const endpoints: OpenApiEndpoint[] = []
  const relativePath = filePath.replace(/\\/g, '/').replace(/^\/+/, '')

  // Find all internal REST annotations followed by method definitions
  const methodMatches = [...text.matchAll(
    /@openapi\.openedge\.export\s*\([\s\S]*?\)\.\s*(?:METHOD|PROCEDURE|FUNCTION)\s+(?:PUBLIC|PROTECTED|PRIVATE)?\s*(HANDLE|LOGICAL|CHARACTER|VOID|INTEGER|DECIMAL)?\s*(\w+)\s*\(?([\s\S]*?)(?:\)|:)\s*$/gim,
  )]

  for (const match of methodMatches) {
    const returnType = match[1] || 'void'
    const methodName = match[2]
    const paramBlock = match[3]

    // Determine HTTP verb from method name pattern
    let method: OpenApiEndpoint['method'] = 'get'
    if (methodName.toLowerCase().includes('create')) method = 'post'
    else if (methodName.toLowerCase().includes('update') || methodName.toLowerCase().includes('save')) method = 'put'
    else if (methodName.toLowerCase().includes('delete')) method = 'delete'
    else if (methodName.toLowerCase().includes('handle')) method = 'get'

    const params = extractParams(paramBlock)

    const path = `/${relativePath.replace(/\.\w+$/, '')}/${methodName}`

    endpoints.push({
      path,
      method,
      summary: methodName,
      parameters: params.map(p => ({
        name: p.name,
        in: p.dataType === 'DATASET' ? 'query' : 'query',
        required: p.direction?.toLowerCase()?.includes('input') ?? false,
        schema: { type: mapAblToJsonType(p.dataType) },
      })),
      responses: {
        '200': { description: returnType === 'VOID' ? 'Success' : 'Returns data' },
        '400': { description: 'Bad Request' },
        '500': { description: 'Server Error' },
      },
    })
  }

  return endpoints
}

function extractParams(paramBlock: string): { name: string; dataType: string; direction: string }[] {
  const params: { name: string; dataType: string; direction: string }[] = []

  const matches = [...paramBlock.matchAll(
    /(?:INPUT|OUTPUT|INPUT-OUTPUT)\s+(?:PARAMETER\s+)?(?:DATASET|TABLE|TABLE-HANDLE)?\s*(?:FOR\s+)?(\w+)?\s*(?:AS\s+(\w+))?/gim,
  )]

  for (const m of matches) {
    const name = m[1] || ''
    const dataType = m[2] || (m[0].includes('DATASET') ? 'DATASET' : 'CHARACTER')
    const direction = m[0].startsWith('INPUT-O') ? 'INPUT-OUTPUT' : m[0].startsWith('INPUT') ? 'INPUT' : 'OUTPUT'
    if (name) params.push({ name, dataType, direction })
  }

  return params
}

function mapAblToJsonType(ablType: string): string {
  switch (ablType?.toUpperCase()) {
    case 'DATASET':
    case 'TABLE':
    case 'TABLE-HANDLE':
    case 'HANDLE': return 'object'
    case 'INTEGER':
    case 'INT64': return 'integer'
    case 'DECIMAL': return 'number'
    case 'LOGICAL': return 'boolean'
    case 'DATE':
    case 'DATETIME':
    case 'DATETIME-TZ': return 'string'
    default: return 'string'
  }
}

function buildOpenApiSpec(endpoints: OpenApiEndpoint[]): string {
  const paths: Record<string, Record<string, unknown>> = {}

  for (const ep of endpoints) {
    const p = ep.path.replace(/(\w)/g, (_, c: string) => c.toLowerCase())
    if (!paths[p]) paths[p] = {}
    paths[p][ep.method] = {
      summary: ep.summary,
      parameters: ep.parameters,
      responses: ep.responses,
    }
  }

  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'ABL REST API',
      version: '1.0.0',
      description: 'Auto-generated from @openapi.openedge.export annotations',
    },
    paths,
  }

  return JSON.stringify(spec, null, 2)
}

function findAblFiles(dir: string): string[] {
  const results: string[] = []
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') results.push(...findAblFiles(full))
      } else if (entry.isFile() && /\.(p|w|cls)$/i.test(entry.name)) {
        results.push(full)
      }
    }
  } catch { /* permission denied */ }
  return results
}
