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
