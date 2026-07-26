export interface DfTable {
  name: string
  description: string
  fields: DfField[]
  indexes: DfIndex[]
  sequences: DfSequence[]
}

export interface DfField {
  name: string
  dataType: string
  extent: number | null
  mandatory: boolean
  initial: string | null
  description: string
  format: string | null
  label: string | null
  order: number
}

export interface DfIndex {
  name: string
  unique: boolean
  primary: boolean
  fields: DfIndexField[]
  description: string
}

export interface DfIndexField {
  fieldName: string
  ascending: boolean
}

export interface DfSequence {
  name: string
  initial: number | null
  increment: number | null
  description: string
}

export function parseDf(text: string): DfTable[] {
  const tables: DfTable[] = []
  const lines = text.split('\n')

  let currentTable: Partial<DfTable> | null = null
  let currentField: Partial<DfField> | null = null
  let currentIndex: Partial<DfIndex> | null = null
  let inIndex = false
  let fieldOrder = 0

  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('/*') || line.startsWith('~')) continue

    // ADD TABLE
    const addTable = line.match(/^ADD\s+TABLE\s+["']?(\w+)["']?\s*$/i)
    if (addTable) {
      if (currentTable) tables.push(currentTable as DfTable)
      currentTable = { name: addTable[1], description: '', fields: [], indexes: [], sequences: [] }
      inIndex = false
      fieldOrder = 0
      continue
    }

    // AREA
    const area = line.match(/^AREA\s+["']?(.+?)["']?\s*$/i)
    if (area) {
      inIndex = false
      continue
    }

    // TABLE description
    const desc = line.match(/^DESCRIPTION\s+["']?(.+?)["']?\s*$/i)
    if (desc && currentTable && !inIndex) {
      currentTable.description = desc[1]
      continue
    }

    // ADD FIELD
    const addField = line.match(/^ADD\s+FIELD\s+["']?(\w+)["']?\s+OF\s+["']?(\w+)["']?\s+AS\s+(\w+)/i)
    if (addField && currentTable) {
      inIndex = false
      if (currentField && currentTable) currentTable.fields.push(currentField as DfField)
      currentField = {
        name: addField[1],
        dataType: addField[3],
        extent: null,
        mandatory: false,
        initial: null,
        description: '',
        format: null,
        label: null,
        order: fieldOrder++,
      }
      continue
    }

    if (!currentField && !currentIndex) continue

    // Field properties
    if (!inIndex && currentField) {
      const fmt = line.match(/^FORMAT\s+["']?(.+?)["']?\s*$/i)
      if (fmt) { currentField.format = fmt[1]; continue }

      const init = line.match(/^INITIAL\s+["']?(.+?)["']?\s*$/i)
      if (init) { currentField.initial = init[1]; continue }

      const mand = line.match(/^MANDATORY\s*$/i)
      if (mand) { currentField.mandatory = true; continue }

      const flabel = line.match(/^LABEL\s+["']?(.+?)["']?\s*$/i)
      if (flabel) { currentField.label = flabel[1]; continue }

      const fdesc = line.match(/^DESCRIPTION\s+["']?(.+?)["']?\s*$/i)
      if (fdesc) { currentField.description = fdesc[1]; continue }

      const extent = line.match(/^EXTENT\s+(\d+)/i)
      if (extent) { currentField.extent = parseInt(extent[1]); continue }
    }

    // INDEX
    const addIndex = line.match(/^ADD\s+INDEX\s+["']?(\w+)["']?\s+ON\s+["']?(\w+)["']?/i)
    if (addIndex && currentTable) {
      inIndex = true
      if (currentField && currentTable) currentTable.fields.push(currentField as DfField)
      currentField = null
      currentIndex = {
        name: addIndex[1],
        unique: false,
        primary: false,
        fields: [],
        description: '',
      }
      continue
    }

    // Index properties
    if (inIndex && currentIndex) {
      const unq = line.match(/^UNIQUE\s*$/i)
      if (unq) { currentIndex.unique = true; continue }

      const pri = line.match(/^PRIMARY\s*$/i)
      if (pri) { currentIndex.primary = true; continue }

      const idxField = line.match(/^INDEX\s+FIELD\s+["']?(\w+)["']?\s+(ASCENDING|DESCENDING)?\s*$/i)
      if (idxField) {
        currentIndex.fields.push({
          fieldName: idxField[1],
          ascending: (idxField[2] || 'ASCENDING').toUpperCase() !== 'DESCENDING',
        })
        continue
      }

      const idxDesc = line.match(/^DESCRIPTION\s+["']?(.+?)["']?\s*$/i)
      if (idxDesc) { currentIndex.description = idxDesc[1]; continue }
    }
  }

  if (currentField && currentTable) currentTable.fields.push(currentField as DfField)
  if (currentTable) {
    if (currentIndex) currentTable.indexes.push(currentIndex as DfIndex)
    tables.push(currentTable as DfTable)
  }

  return tables
}

export function formatDfSummary(tables: DfTable[]): string {
  const parts: string[] = []
  for (const t of tables) {
    parts.push(`TABLE ${t.name}${t.description ? ` — ${t.description}` : ''}`)
    parts.push(`  Fields (${t.fields.length}):`)
    for (const f of t.fields) {
      const req = f.mandatory ? ' REQUIRED' : ''
      const ini = f.initial ? ` = ${f.initial}` : ''
      parts.push(`    ${f.name}: ${f.dataType}${ini}${req}`)
    }
    if (t.indexes.length) {
      parts.push(`  Indexes (${t.indexes.length}):`)
      for (const ix of t.indexes) {
        const flags = [ix.primary ? 'PRIMARY' : '', ix.unique ? 'UNIQUE' : ''].filter(Boolean).join(' ')
        const idxFields = ix.fields.map(f => `${f.fieldName}${f.ascending ? ' ASC' : ' DESC'}`).join(', ')
        parts.push(`    ${ix.name} (${idxFields}) ${flags}`)
      }
    }
    if (t.sequences.length) {
      parts.push(`  Sequences (${t.sequences.length}):`)
      for (const s of t.sequences) {
        parts.push(`    ${s.name}${s.initial != null ? ` start ${s.initial}` : ''}${s.increment != null ? ` inc ${s.increment}` : ''}`)
      }
    }
    parts.push('')
  }
  return parts.join('\n')
}
