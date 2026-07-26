import { parseAblFile, type FunctionNode } from '../parser/abl.js'

export interface FunctionSymbol {
  name: string
  filePath: string
  line: number
  signature: string
}

export function extractFunctions(source: string, filePath: string): FunctionSymbol[] {
  const result = parseAblFile(source)
  return result.functions.map(fn => {
    const params = fn.parameters.map(p =>
      `${p.direction === 'input' ? '' : p.direction + ' '}${p.name}${p.dataType ? ' AS ' + p.dataType : ''}`
    ).join(', ')
    return {
      name: fn.name,
      filePath,
      line: fn.startLine,
      signature: `FUNCTION ${fn.name}(${params})`,
    }
  })
}
