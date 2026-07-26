import Parser from 'web-tree-sitter'
import type { QueryCapture, SyntaxNode } from 'web-tree-sitter'

let parser: Parser | null = null
let language: Parser.Language | null = null

export async function initAblParser(): Promise<Parser> {
  if (parser) return parser
  await Parser.init()
  const Lang = await Parser.Language.load(
    // tree-sitter-abl WASM will be loaded from node_modules
    new URL('@usagi-coffee/tree-sitter-abl/tree-sitter-abl.wasm', import.meta.url).href,
  )
  language = Lang
  parser = new Parser()
  parser.setLanguage(Lang)
  return parser
}

export function getAblLanguage(): Parser.Language {
  if (!language) throw new Error('ABL parser not initialized. Call initAblParser() first.')
  return language
}

export function getParser(): Parser {
  if (!parser) throw new Error('ABL parser not initialized.')
  return parser
}

export interface AblFileResult {
  tree: Parser.Tree
  text: string
  functions: FunctionNode[]
  includes: IncludeNode[]
  preprocessorDefines: PreprocessorDefineNode[]
  preprocessorRefs: PreprocessorRefNode[]
}

export interface FunctionNode {
  name: string
  startLine: number
  endLine: number
  startByte: number
  endByte: number
  parameters: ParameterNode[]
}

export interface ParameterNode {
  name: string
  direction: 'input' | 'output' | 'input-output'
  dataType: string | null
}

export interface IncludeNode {
  path: string
  startByte: number
  endByte: number
  line: number
}

export interface PreprocessorDefineNode {
  name: string
  value: string | null
  startByte: number
  endByte: number
}

export interface PreprocessorRefNode {
  name: string
  startByte: number
  endByte: number
}

export function parseAblFile(text: string): AblFileResult {
  const p = getParser()
  const tree = p.parse(text)
  const root = tree.rootNode

  const functions: FunctionNode[] = []
  const includes: IncludeNode[] = []
  const preprocessorDefines: PreprocessorDefineNode[] = []
  const preprocessorRefs: PreprocessorRefNode[] = []

  collectNodes(root, text, functions, includes, preprocessorDefines, preprocessorRefs)

  return { tree, text, functions, includes, preprocessorDefines, preprocessorRefs }
}

function collectNodes(
  node: SyntaxNode,
  text: string,
  functions: FunctionNode[],
  includes: IncludeNode[],
  preprocessorDefines: PreprocessorDefineNode[],
  preprocessorRefs: PreprocessorRefNode[],
): void {
  if (node.type === 'function_definition') {
    const nameNode = node.childForFieldName('name')
    if (nameNode) {
      const params: ParameterNode[] = []
      const paramList = node.childForFieldName('parameters')
      if (paramList) {
        for (const p of paramList.namedChildren) {
          if (p.type === 'parameter') {
            const pName = p.childForFieldName('name')?.text ?? ''
            const dir = p.childForFieldName('direction')?.text ?? 'input'
            const dt = p.childForFieldName('data_type')?.text ?? null
            params.push({
              name: pName,
              direction: dir as ParameterNode['direction'],
              dataType: dt,
            })
          }
        }
      }
      functions.push({
        name: nameNode.text,
        startLine: node.startPosition.row,
        endLine: node.endPosition.row,
        startByte: node.startIndex,
        endByte: node.endIndex,
        parameters: params,
      })
    }
  }

  if (node.type === 'include_statement') {
    const pathNode = node.childForFieldName('path')
    if (pathNode) {
      includes.push({
        path: pathNode.text.replace(/["{}]/g, ''),
        startByte: node.startIndex,
        endByte: node.endIndex,
        line: node.startPosition.row,
      })
    }
  }

  if (node.type === 'preprocessor_define') {
    const nameNode = node.childForFieldName('name')
    if (nameNode) {
      const valNode = node.childForFieldName('value')
      preprocessorDefines.push({
        name: nameNode.text,
        value: valNode?.text ?? null,
        startByte: node.startIndex,
        endByte: node.endIndex,
      })
    }
  }

  if (node.type === 'preprocessor_reference') {
    const nameNode = node.childForFieldName('name')
    if (nameNode) {
      preprocessorRefs.push({
        name: nameNode.text,
        startByte: node.startIndex,
        endByte: node.endIndex,
      })
    }
  }

  for (const child of node.namedChildren) {
    collectNodes(child, text, functions, includes, preprocessorDefines, preprocessorRefs)
  }
}

export function queryAbl(source: string, queryPattern: string): QueryCapture[] {
  const lang = getAblLanguage()
  const query = lang.query(queryPattern)
  const tree = getParser().parse(source)
  return query.captures(tree.rootNode)
}
