export interface AblFileResult {
  tree: import('web-tree-sitter').Tree
  text: string
  functions: FunctionNode[]
  methods: MethodNode[]
  constructors: ConstructorNode[]
  classInfo: ClassNode | null
  includes: IncludeNode[]
  preprocessorDefines: PreprocessorDefineNode[]
  preprocessorRefs: PreprocessorRefNode[]
  usingStatements: UsingNode[]
}

export interface FunctionNode {
  name: string
  startLine: number
  endLine: number
  startByte: number
  endByte: number
  parameters: ParameterNode[]
}

export interface MethodNode {
  name: string
  visibility: 'public' | 'private' | 'protected'
  returnType: string
  parameters: ParameterNode[]
  startLine: number
  endLine: number
  startByte: number
  endByte: number
}

export interface ConstructorNode {
  name: string
  visibility: string
  parameters: ParameterNode[]
  startLine: number
  endLine: number
  startByte: number
  endByte: number
}

export interface ClassNode {
  name: string
  package: string
  fullName: string
  inherits: string | null
  implements: string[]
  startLine: number
  endLine: number
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

export interface UsingNode {
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
