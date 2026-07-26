import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

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

export interface LintRuleSpec {
  pattern?: string
  message: string
  severity: 'warning' | 'error'
  filePattern?: string
}

interface CompiledRule {
  pattern: RegExp | null
  message: string
  severity: 'warning' | 'error'
  extMatch: RegExp | null
}

function globToRegex(glob: string): RegExp {
  const ext = glob.replace(/^\*/, '')
  return new RegExp(ext.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')
}

function compileRules(specs: Record<string, LintRuleSpec>): Record<string, CompiledRule> {
  const result: Record<string, CompiledRule> = {}
  for (const [name, spec] of Object.entries(specs)) {
    result[name] = {
      pattern: spec.pattern ? new RegExp(spec.pattern, 'gim') : null,
      message: spec.message,
      severity: spec.severity,
      extMatch: spec.filePattern ? globToRegex(spec.filePattern) : null,
    }
  }
  return result
}

function shouldApply(rule: CompiledRule, filePath: string): boolean {
  if (!rule.extMatch) return true
  const dot = filePath.lastIndexOf('.')
  return dot >= 0 && rule.extMatch.test(filePath.slice(dot))
}

export function lintAbl(
  source: string,
  filePath: string,
  ruleSpecs: Record<string, LintRuleSpec>,
): LintWarning[] {
  const rules = compileRules(ruleSpecs)
  const warnings: LintWarning[] = []
  const lines = source.split('\n')

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum]

    for (const [ruleName, rule] of Object.entries(rules)) {
      if (!shouldApply(rule, filePath)) continue

      if (ruleName === 'nolonglines' && line.length <= 80) continue

      if (rule.pattern && ruleName !== 'nolonglines') {
        rule.pattern.lastIndex = 0
        if (!rule.pattern.test(line)) continue
      }

      warnings.push({
        file: filePath,
        line: lineNum + 1,
        rule: ruleName,
        message: ruleName === 'nolonglines'
          ? `${rule.message} (${line.length} chars)`
          : rule.message,
        severity: rule.severity,
      })
    }
  }

  return warnings
}

export function lintProject(
  rootDir: string,
  ruleSpecs: Record<string, LintRuleSpec>,
): LintReport {
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
            const fileWarnings = lintAbl(source, full, ruleSpecs)
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

  return lines.length > 2 ? lines.join('\n') : 'No issues found.'
}
