import { parseDf, type DfTable } from '../parser/df.js'

export interface DfDiff {
  addedTables: string[]
  removedTables: string[]
  modifiedTables: TableDiff[]
}

export interface TableDiff {
  name: string
  addedFields: string[]
  removedFields: string[]
  modifiedFields: FieldDiff[]
  addedIndexes: string[]
  removedIndexes: string[]
}

export interface FieldDiff {
  name: string
  changes: string[]
}

/**
 * Compare two .df schemas and produce a structured diff.
 */
export function diffDfFiles(oldDfText: string, newDfText: string): DfDiff {
  const oldTables = parseDf(oldDfText)
  const newTables = parseDf(newDfText)
  return diffDfTables(oldTables, newTables)
}

export function diffDfTables(oldTables: DfTable[], newTables: DfTable[]): DfDiff {
  const oldMap = new Map(oldTables.map(t => [t.name.toLowerCase(), t]))
  const newMap = new Map(newTables.map(t => [t.name.toLowerCase(), t]))

  const addedTables: string[] = []
  const removedTables: string[] = []
  const modifiedTables: TableDiff[] = []

  for (const [name, newTable] of newMap) {
    const oldTable = oldMap.get(name)
    if (!oldTable) {
      addedTables.push(newTable.name)
    } else {
      const diff = diffTable(oldTable, newTable)
      if (diff.changes.length > 0) {
        modifiedTables.push(diff)
      }
    }
  }

  for (const [name, oldTable] of oldMap) {
    if (!newMap.has(name)) {
      removedTables.push(oldTable.name)
    }
  }

  return { addedTables, removedTables, modifiedTables }
}

function diffTable(oldTable: DfTable, newTable: DfTable): TableDiff {
  const oldFields = new Map(oldTable.fields.map(f => [f.name.toLowerCase(), f]))
  const newFields = new Map(newTable.fields.map(f => [f.name.toLowerCase(), f]))
  const oldIndexes = new Map(oldTable.indexes.map(i => [i.name.toLowerCase(), i]))
  const newIndexes = new Map(newTable.indexes.map(i => [i.name.toLowerCase(), i]))

  const addedFields: string[] = []
  const removedFields: string[] = []
  const modifiedFields: FieldDiff[] = []

  for (const [name, nf] of newFields) {
    const of = oldFields.get(name)
    if (!of) {
      addedFields.push(nf.name)
    } else {
      const changes: string[] = []
      if (of.dataType !== nf.dataType) changes.push(`type: ${of.dataType} → ${nf.dataType}`)
      if (of.mandatory !== nf.mandatory) changes.push(`mandatory: ${of.mandatory} → ${nf.mandatory}`)
      if (of.initial !== nf.initial) changes.push(`initial: ${of.initial ?? 'none'} → ${nf.initial ?? 'none'}`)
      if (of.extent !== nf.extent) changes.push(`extent: ${of.extent ?? 'none'} → ${nf.extent ?? 'none'}`)
      if (of.format !== nf.format) changes.push(`format: ${of.format ?? 'none'} → ${nf.format ?? 'none'}`)
      if (changes.length > 0) modifiedFields.push({ name: of.name, changes })
    }
  }

  for (const [name] of oldFields) {
    if (!newFields.has(name)) removedFields.push(name)
  }

  const addedIndexes: string[] = []
  const removedIndexes: string[] = []

  for (const [name] of newIndexes) {
    if (!oldIndexes.has(name)) addedIndexes.push(name)
  }
  for (const [name] of oldIndexes) {
    if (!newIndexes.has(name)) removedIndexes.push(name)
  }

  const changes = [
    ...addedFields.map(() => ''),
    ...removedFields.map(() => ''),
    ...modifiedFields.map(() => ''),
    ...addedIndexes.map(() => ''),
    ...removedIndexes.map(() => ''),
  ]

  return {
    name: newTable.name,
    addedFields,
    removedFields,
    modifiedFields,
    addedIndexes,
    removedIndexes,
    changes,
  }
}

export function formatDfDiff(diff: DfDiff): string {
  const lines: string[] = []
  if (diff.addedTables.length) {
    lines.push(`+ Added tables (${diff.addedTables.length}):`)
    diff.addedTables.forEach(t => lines.push(`  + ${t}`))
    lines.push('')
  }
  if (diff.removedTables.length) {
    lines.push(`- Removed tables (${diff.removedTables.length}):`)
    diff.removedTables.forEach(t => lines.push(`  - ${t}`))
    lines.push('')
  }
  for (const t of diff.modifiedTables) {
    lines.push(`~ ${t.name}:`)
    t.addedFields.forEach(f => lines.push(`  + field ${f}`))
    t.removedFields.forEach(f => lines.push(`  - field ${f}`))
    t.modifiedFields.forEach(f => lines.push(`  ~ field ${f.name}: ${f.changes.join(', ')}`))
    t.addedIndexes.forEach(i => lines.push(`  + index ${i}`))
    t.removedIndexes.forEach(i => lines.push(`  - index ${i}`))
    lines.push('')
  }
  return lines.join('\n')
}
