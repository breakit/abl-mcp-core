export interface AblFileResult {
  tree: import('web-tree-sitter').Tree
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
