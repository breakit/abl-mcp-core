import { Language, Parser, Query, type Node as SyntaxNode, type QueryCapture } from 'web-tree-sitter'
import type { AblFileResult, FunctionNode, ParameterNode, IncludeNode, PreprocessorDefineNode, PreprocessorRefNode } from '../contracts/abl.js'

let parser: Parser | null = null
let language: Language | null = null

export async function initAblParser(): Promise<Parser> {
  if (parser) return parser
  await Parser.init()
  const Lang = await Language.load(
    new URL('@usagi-coffee/tree-sitter-abl/tree-sitter-abl.wasm', import.meta.url).href,
  )
  language = Lang
  parser = new Parser()
  parser.setLanguage(Lang)
  return parser
}

export function getAblLanguage(): Language {
  if (!language) throw new Error('ABL parser not initialized. Call initAblParser() first.')
  return language
}

export function getParser(): Parser {
  if (!parser) throw new Error('ABL parser not initialized.')
  return parser
}

export function parseAblFile(text: string): AblFileResult {
  const p = getParser()
  const tree = p.parse(text)
  if (!tree) throw new Error('ABL parser has no language assigned.')
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
  const query = new Query(lang, queryPattern)
  const tree = getParser().parse(source)
  if (!tree) throw new Error('ABL parser has no language assigned.')
  return query.captures(tree.rootNode)
}
