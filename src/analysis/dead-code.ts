import type { DependencyGraph } from './dependencies.js'

export interface DeadCodeReport {
  unusedFunctions: DeadSymbol[]
  unusedIncludes: DeadSymbol[]
  unusedDefines: DeadSymbol[]
}

export interface DeadSymbol {
  name: string
  file: string
  line?: number
}

/**
 * Find functions, includes, and preprocessor defines that are never referenced.
 */
export function findDeadCode(graph: DependencyGraph): DeadCodeReport {
  const report: DeadCodeReport = {
    unusedFunctions: [],
    unusedIncludes: [],
    unusedDefines: [],
  }

  for (const [, value] of graph.nodes) {
    for (const call of value.calls) {
      let found = false
      for (const [, other] of graph.nodes) {
        // Check if another file's functions/procedures match this call
        if (other.defines.some(d => d === call)) found = true
      }
      // Also check within same file
      if (value.defines.some(d => d === call)) found = true
      if (value.calls.some(c => c === call)) found = true
      if (!found) {
        report.unusedFunctions.push({ name: call, file: value.path })
      }
    }

    for (const inc of value.includes) {
      if (value.referencedBy.length === 0) {
        report.unusedIncludes.push({ name: inc, file: value.path })
      }
    }

    for (const def of value.defines) {
      let used = false
      for (const [, other] of graph.nodes) {
        if (other.includes.some(i => i.includes(def))) used = true
      }
      if (!used) {
        report.unusedDefines.push({ name: def, file: value.path })
      }
    }
  }

  return report
}

export function formatDeadCodeReport(report: DeadCodeReport): string {
  const lines: string[] = []
  if (report.unusedFunctions.length) {
    lines.push(`Unused function/procedure calls (${report.unusedFunctions.length}):`)
    report.unusedFunctions.forEach(f => lines.push(`  ⚠ ${f.name} in ${f.file}`))
    lines.push('')
  }
  if (report.unusedIncludes.length) {
    lines.push(`Unused includes (${report.unusedIncludes.length}):`)
    report.unusedIncludes.forEach(i => lines.push(`  ⚠ ${i.name} in ${i.file}`))
    lines.push('')
  }
  if (report.unusedDefines.length) {
    lines.push(`Unused preprocessor defines (${report.unusedDefines.length}):`)
    report.unusedDefines.forEach(d => lines.push(`  ⚠ &${d.name} in ${d.file}`))
    lines.push('')
  }
  if (lines.length === 0) lines.push('No dead code found.')
  return lines.join('\n')
}
