import { parseDf, formatDfSummary } from '../parser/df.js'
import type { DfTable } from '../contracts/df.js'
import type { TableSymbol, FieldInfo, IndexInfo } from '../contracts/symbol.js'

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
export type { DfTable, TableSymbol, FieldInfo, IndexInfo }
