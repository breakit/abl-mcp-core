import { parseDf, type DfTable, formatDfSummary } from '../parser/df.js'

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

export function loadTablesFromDf(text: string, sourceFile: string): TableSymbol[] {
  const tables = parseDf(text)
  return tables.map(t => ({
    name: t.name,
    sourceFile,
    fields: t.fields.map(f => ({
      name: f.name,
      dataType: f.dataType,
      mandatory: f.mandatory,
      initial: f.initial,
    })),
    indexes: t.indexes.map(ix => ({
      name: ix.name,
      fields: ix.fields.map(f => f.fieldName),
      unique: ix.unique,
      primary: ix.primary,
    })),
  }))
}

export { formatDfSummary }
export type { DfTable }
