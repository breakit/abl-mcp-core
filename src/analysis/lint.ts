export interface LintWarning {
  file: string
  line: number
  rule: string
  message: string
  severity: 'warning' | 'error'
}

export interface LintReport {
  warnings: LintWarning[]
  summary: Record<string, number>
}

const RULES: Record<string, { pattern: RegExp; message: string; severity: 'warning' | 'error' }> = {
  'no-undo': {
    pattern: /^DEFINE\s+(VARIABLE|VAR)\s+\w+\s+(?:AS\s+\w+\s+)?(?!.*NO-UNDO)/gim,
    message: 'DEFINE VARIABLE should include NO-UNDO',
    severity: 'error',
  },
  'no-undo-param': {
    pattern: /^DEFINE\s+INPUT(?:-OUTPUT)?\s+PARAMETER\s+\w+\s+(?:AS\s+\w+\s+)?(?!.*NO-UNDO)/gim,
    message: 'DEFINE PARAMETER should include NO-UNDO',
    severity: 'error',
  },
  'exit-insert': {
    pattern: /EXIT\s+INSERT/gim,
    message: 'EXIT INSERT is obsolete — use END instead',
    severity: 'warning',
  },
  'pause': {
    pattern: /PAUSE\b/gim,
    message: 'PAUSE is deprecated — use MESSAGE VIEW-AS ALERT-BOX instead',
    severity: 'warning',
  },
  'function-no-return': {
    pattern: /^FUNCTION\s+\w+\s+/gim,
    message: 'FUNCTION should include RETURN VALUE clause',
    severity: 'warning',
  },
  'global-define': {
    pattern: /&GLOBAL-DEFINE/gim,
    message: 'Consider using &SCOPED-DEFINE instead of &GLOBAL-DEFINE',
    severity: 'warning',
  },
  'temp-table-no-noundo': {
    pattern: /^DEFINE\s+TEMP-TABLE\s+\w+\s+(?:.*\n)*?(?!.*NO-UNDO)/gim,
    message: 'TEMP-TABLE should include NO-UNDO',
    severity: 'error',
  },
  'shell-call': {
    pattern: /OS-COMMAND\b|UNIX\s+SILENT\b|DOS\s+SILENT\b/gim,
    message: 'Shell calls should be avoided in PAS for OpenEdge contexts',
    severity: 'warning',
  },
}

/**
 * Lint an ABL source file against coding conventions.
 */
export function lintAbl(source: string, filePath: string): LintWarning[] {
  const warnings: LintWarning[] = []
  const lines = source.split('\n')

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum]

    for (const [ruleName, rule] of Object.entries(RULES)) {
      rule.pattern.lastIndex = 0
      if (rule.pattern.test(line)) {
        warnings.push({
          file: filePath,
          line: lineNum + 1,
          rule: ruleName,
          message: rule.message,
          severity: rule.severity,
        })
      }
    }
  }

  return warnings
}

/**
 * Lint all ABL files in a project directory.
 */
export function lintProject(rootDir: string): LintReport {
  const { readFileSync, readdirSync, statSync } = require('fs')
  const { join } = require('path')
  const warnings: LintWarning[] = []
  const summary: Record<string, number> = {}

  function walk(dir: string) {
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') walk(full)
        } else if (entry.isFile() && /\.(p|w|cls|i)$/i.test(entry.name)) {
          try {
            const source = readFileSync(full, 'utf-8')
            const fileWarnings = lintAbl(source, full)
            warnings.push(...fileWarnings)
          } catch { /* skip */ }
        }
      }
    } catch { /* skip */ }
  }

  walk(rootDir)

  for (const w of warnings) {
    summary[w.rule] = (summary[w.rule] || 0) + 1
  }

  return { warnings, summary }
}

export function formatLintReport(report: LintReport): string {
  const lines: string[] = []
  const errors = report.warnings.filter(w => w.severity === 'error')
  const warns = report.warnings.filter(w => w.severity === 'warning')

  if (errors.length) {
    lines.push(`Errors (${errors.length}):`)
    errors.forEach(e => lines.push(`  ❌ ${e.file}:${e.line} — ${e.message} [${e.rule}]`))
    lines.push('')
  }
  if (warns.length) {
    lines.push(`Warnings (${warns.length}):`)
    warns.forEach(w => lines.push(`  ⚠ ${w.file}:${w.line} — ${w.message} [${w.rule}]`))
    lines.push('')
  }

  lines.push('Summary:')
  for (const [rule, count] of Object.entries(report.summary)) {
    lines.push(`  ${rule}: ${count}`)
  }

  return lines.join('\n')
}
