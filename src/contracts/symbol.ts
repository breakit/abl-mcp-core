export interface FunctionSymbol {
  name: string
  filePath: string
  line: number
  signature: string
}

export interface TableSymbol {
  name: string
  sourceFile: string
  fields: FieldInfo[]
  indexes: IndexInfo[]
}

export interface FieldInfo {
  name: string
  dataType: string
  mandatory: boolean
  initial: string | null
}

export interface IndexInfo {
  name: string
  fields: string[]
  unique: boolean
  primary: boolean
}

export interface IncludeSymbol {
  rawPath: string
  resolvedPath: string | null
  line: number
}

export interface ResolvedIncludes {
  source: string
  filePath: string
  includes: IncludeSymbol[]
}
