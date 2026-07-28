import { Language, Parser, Query, type Node as SyntaxNode, type QueryCapture } from 'web-tree-sitter'
import type {
  AblFileResult, FunctionNode, MethodNode, ConstructorNode, ClassNode,
  ParameterNode, IncludeNode, UsingNode, PreprocessorDefineNode, PreprocessorRefNode,
} from '../contracts/abl.js'
import { fileURLToPath } from 'url'

let parser: Parser | null = null
let language: Language | null = null

export async function initAblParser(): Promise<Parser> {
  if (parser) return parser
  await Parser.init()
  const Lang = await Language.load(
    fileURLToPath(new URL('@usagi-coffee/tree-sitter-abl/tree-sitter-abl.wasm', import.meta.url)),
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

function extractParameters(paramNode: SyntaxNode): ParameterNode[] {
  const params: ParameterNode[] = []
  for (const p of paramNode.namedChildren) {
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
  return params
}

export function parseAblFile(text: string): AblFileResult {
  const p = getParser()
  const tree = p.parse(text)
  if (!tree) throw new Error('ABL parser has no language assigned.')
  const root = tree.rootNode

  const functions: FunctionNode[] = []
  const methods: MethodNode[] = []
  const constructors: ConstructorNode[] = []
  const includes: IncludeNode[] = []
  const preprocessorDefines: PreprocessorDefineNode[] = []
  const preprocessorRefs: PreprocessorRefNode[] = []
  const usingStatements: UsingNode[] = []
  let classInfo: ClassNode | null = null

  collectNodes(root, text, functions, methods, constructors, includes, preprocessorDefines, preprocessorRefs, usingStatements, classInfo)
  classInfo = extractClassInfo(root, text)

  return {
    tree, text, functions, methods, constructors, classInfo,
    includes, preprocessorDefines, preprocessorRefs, usingStatements,
  }
}

function collectNodes(
  node: SyntaxNode,
  text: string,
  functions: FunctionNode[],
  methods: MethodNode[],
  constructors: ConstructorNode[],
  includes: IncludeNode[],
  preprocessorDefines: PreprocessorDefineNode[],
  preprocessorRefs: PreprocessorRefNode[],
  usingStatements: UsingNode[],
  _classInfo: ClassNode | null,
): void {
  if (node.type === 'function_definition') {
    const nameNode = node.childForFieldName('name')
    if (nameNode) {
      const paramList = node.childForFieldName('parameters')
      const params = paramList ? extractParameters(paramList) : []
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

  if (node.type === 'method_definition') {
    const named = node.namedChildren
    if (named.length >= 3) {
      const visibility = named[0].type === 'access_modifier' ? named[0].text.toLowerCase() : 'public'
      const returnType = named[1].type === 'identifier' ? named[1].text : ''
      const methodName = named[2].type === 'identifier' ? named[2].text : ''
      const paramList = named.find(c => c.type === 'parameters')
      const params = paramList ? extractParameters(paramList) : []
      methods.push({
        name: methodName,
        visibility: visibility as MethodNode['visibility'],
        returnType,
        parameters: params,
        startLine: node.startPosition.row,
        endLine: node.endPosition.row,
        startByte: node.startIndex,
        endByte: node.endIndex,
      })
    }
  }

  if (node.type === 'constructor_definition') {
    const named = node.namedChildren
    if (named.length >= 2) {
      const visibility = named[0].type === 'access_modifier' ? named[0].text.toLowerCase() : 'public'
      const ctorName = named[1].type === 'identifier' ? named[1].text : ''
      const paramList = named.find(c => c.type === 'parameters')
      const params = paramList ? extractParameters(paramList) : []
      constructors.push({
        name: ctorName,
        visibility,
        parameters: params,
        startLine: node.startPosition.row,
        endLine: node.endPosition.row,
        startByte: node.startIndex,
        endByte: node.endIndex,
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

  if (node.type === 'using_statement') {
    usingStatements.push({
      path: node.text.replace(/^using\s+/i, '').replace(/\.$/, '').trim(),
      startByte: node.startIndex,
      endByte: node.endIndex,
      line: node.startPosition.row,
    })
  }

  for (const child of node.namedChildren) {
    collectNodes(child, text, functions, methods, constructors, includes, preprocessorDefines, preprocessorRefs, usingStatements, _classInfo)
  }
}

function extractClassInfo(root: SyntaxNode, _text: string): ClassNode | null {
  const classDef = root.namedChildren.find(c => c.type === 'class_definition')
  if (!classDef) return null

  const named = classDef.namedChildren
  const qnNode = named.find(c => c.type === 'qualified_name')
  if (!qnNode) return null

  const parts = qnNode.namedChildren.filter(c => c.type === 'identifier').map(c => c.text)
  const fullName = parts.join('.')
  const pkg = parts.length > 1 ? parts.slice(0, -1).join('.') : ''
  const name = parts.length > 0 ? parts[parts.length - 1] : ''

  let inherits: string | null = null
  const implements_: string[] = []

  for (let i = 0; i < named.length; i++) {
    const child = named[i]
    if (child.type === 'identifier' && child.text.toUpperCase() === 'INHERITS' && i + 1 < named.length) {
      inherits = named[i + 1].text
    }
    if (child.type === 'identifier' && child.text.toUpperCase() === 'IMPLEMENTS') {
      for (let j = i + 1; j < named.length; j++) {
        if (named[j].type === 'identifier' && named[j].text.toUpperCase() === 'INHERITS') break
        if (named[j].type === 'qualified_name' || named[j].type === 'identifier') {
          implements_.push(named[j].text)
        }
      }
    }
  }

  return {
    name,
    package: pkg,
    fullName,
    inherits,
    implements: implements_,
    startLine: classDef.startPosition.row,
    endLine: classDef.endPosition.row,
  }
}

export function queryAbl(source: string, queryPattern: string): QueryCapture[] {
  const lang = getAblLanguage()
  const query = new Query(lang, queryPattern)
  const tree = getParser().parse(source)
  if (!tree) throw new Error('ABL parser has no language assigned.')
  return query.captures(tree.rootNode)
}
