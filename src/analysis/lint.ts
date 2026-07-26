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

// ---------------------------------------------------------------------------
// Built-in rules — Prolint-inspired
// Format: pattern (regex string), message, severity, optional filePattern
// ---------------------------------------------------------------------------

const BUILT_IN_RULES: Record<string, LintRuleSpec> = {

  // ---- No-undo / Lock safety ----

  'no-undo': {
    pattern: '^DEFINE (?:VARIABLE|VAR) +(?:OUTPUT +PARAMETER +)?\\w+ (?:AS \\w+ )?(?!.*NO-UNDO)',
    message: 'DEFINE VARIABLE should include NO-UNDO',
    severity: 'error',
  },
  'no-undo-param': {
    pattern: '^DEFINE INPUT(?:\-OUTPUT)? PARAMETER +\\w+ (?:AS \\w+ )?(?!.*NO-UNDO)',
    message: 'DEFINE PARAMETER should include NO-UNDO',
    severity: 'error',
  },

  // ---- Deprecations / Obsolete ----

  'pause': {
    pattern: 'PAUSE\\b',
    message: 'PAUSE is deprecated — use MESSAGE VIEW-AS ALERT-BOX instead',
    severity: 'warning',
  },
  'global-define': {
    pattern: '&GLOBAL-DEFINE',
    message: 'Use &SCOPED-DEFINE instead of &GLOBAL-DEFINE',
    severity: 'warning',
  },
  'recid': {
    pattern: '\\bRECID\\b',
    message: 'RECID is obsolete since OE10 — use ROWID instead',
    severity: 'error',
  },
  'shared': {
    pattern: '\\bSHARED\\b',
    message: 'SHARED variables are discouraged — pass parameters or use temp-tables',
    severity: 'warning',
  },

  // ---- Shell / security ----

  'shell-call': {
    pattern: '\\b(OS-COMMAND|UNIX SILENT|DOS SILENT|INPUT THROUGH|OUTPUT THROUGH|INPUT-OUTPUT THROUGH)\\b',
    message: 'Shell calls should be avoided in PAS for OpenEdge contexts',
    severity: 'warning',
  },
  'hardcoded-email': {
    pattern: '"[^"]*\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b[^"]*"',
    message: 'Hardcoded email addresses should be stored in configuration',
    severity: 'warning',
  },

  // ---- Find / Lock / Performance ----

  'no-lock-type': {
    pattern: '\\bFIND +(?:FIRST|LAST|NEXT|PREV|UNIQUE|CURRENT) +\\w+\\b(?!.*\\b(NO-LOCK|EXCLUSIVE-LOCK|SHARE-LOCK)\\b)',
    message: 'FIND without explicit lock type — add NO-LOCK or EXCLUSIVE-LOCK',
    severity: 'warning',
  },
  'find-no-error': {
    pattern: '\\b(?:FIND|FOR +(?:EACH|FIRST|LAST))\\b(?!.*\\bNO-ERROR\\b)',
    message: 'FIND/FOR-EACH without NO-ERROR — statement may fail silently',
    severity: 'warning',
  },
  'for-each-no-where': {
    pattern: '\\bFOR +EACH +\\w+\\b(?!.*\\bWHERE\\b)',
    message: 'FOR EACH without WHERE clause — full table scan',
    severity: 'warning',
  },
  'exclusive-no-wait': {
    pattern: '\\bEXCLUSIVE-LOCK\\b(?!.*\\b(NO-WAIT|WAIT)\\b)',
    message: 'EXCLUSIVE-LOCK without NO-WAIT may cause deadlocks',
    severity: 'error',
  },
  'no-index': {
    pattern: '\\b(?:FOR +EACH +\\w+ +NO-LOCK +USE-INDEX)\\b',
    message: 'USE-INDEX overrides the compiler optimizer — remove unless justified',
    severity: 'warning',
  },

  // ---- Style / Conventions ----

  'end-type': {
    pattern: '^\\s*END\\.(?!\\s)',
    message: 'END without type qualification — prefer END PROCEDURE / END FUNCTION / END DO',
    severity: 'warning',
  },
  'block-label': {
    pattern: '^\\s*(?:LEAVE|NEXT)\\s*\\.?\\s*$',
    message: 'LEAVE/NEXT without block label — specify which block to leave',
    severity: 'warning',
  },
  'lex-colon': {
    pattern: '^\\s*(?:DO|FOR +EACH +\\w+[^:]*|WHILE +[^:]+|REPEAT)\\s*$',
    message: 'Block header should end with colon (e.g. DO: instead of DO)',
    severity: 'warning',
  },
  'method-name-case': {
    pattern: '^\\s*METHOD +(?:PUBLIC|PROTECTED|PRIVATE|STATIC )*(?:HANDLE|LOGICAL|CHARACTER|VOID|INTEGER|DECIMAL|LONGCHAR|DATE|DATETIME )*[a-z]\\w*\\s*\\(',
    message: 'Method names should start with uppercase',
    severity: 'warning',
    filePattern: '*.cls',
  },
  'class-name-case': {
    pattern: '^\\s*CLASS +\\S*?\\b[a-z]\\w+\\b',
    message: 'Class names should start with uppercase',
    severity: 'warning',
    filePattern: '*.cls',
  },
  'function-name-case': {
    pattern: '^\\s*FUNCTION +[A-Z]\\w+\\s+',
    message: 'Function names should start with lowercase',
    severity: 'warning',
  },

  // ---- Strings / i18n ----

  'backslash-in-string': {
    pattern: '"[^~"\\n]*\\\\',
    message: 'Backslash in string without ~ prefix — use ~\\ for escaped backslash',
    severity: 'error',
  },
  'colon-t': {
    pattern: ':\\s*T\\b',
    message: ':T attribute returns trimmed string — verify this is intentional',
    severity: 'warning',
  },
  'string-concat': {
    pattern: '"[^"\\n]{10,}"\\s*\\+',
    message: 'String concatenation — consider using SUBSTITUTE() for readability',
    severity: 'warning',
  },

  // ---- Potential bugs ----

  'dot-comment': {
    pattern: '\\.\\s*/\\*',
    message: 'Period followed by comment — may unintentionally terminate a statement',
    severity: 'error',
  },
  'return-error': {
    pattern: '\\bRETURN +ERROR\\s*\\.',
    message: 'RETURN ERROR without string argument — add a descriptive error message',
    severity: 'error',
  },
  'weak-char': {
    pattern: '[^:]=\\s*""',
    message: 'Empty string comparison — use ? or a specific value for clarity',
    severity: 'warning',
  },
  'release-statement': {
    pattern: '\\bRELEASE +\\w+\\b',
    message: 'RELEASE of buffer is rarely needed and may indicate confusion with delete',
    severity: 'warning',
  },
  'public-var': {
    pattern: '\\bDEFINE +(?:PUBLIC )?VARIABLE\\b',
    message: 'Public variable in class — use properties instead',
    severity: 'warning',
    filePattern: '*.cls',
  },
  'nolonglines': {
    message: 'Line exceeds 80 characters',
    severity: 'warning',
  },

  // ---- Cross-platform ----

  'run-backslash': {
    pattern: '\\bRUN +\\S*\\\\',
    message: 'RUN path uses backslash — use forward-slash for Unix compatibility',
    severity: 'warning',
  },
  'include-case': {
    pattern: '\\{[^}]*(?=[A-Z])[^}]*\}',
    message: 'Include reference uses mixed case — lower-case for cross-platform compatibility',
    severity: 'warning',
  },
  'include-backslash': {
    pattern: '\\{[^}]*\\\\[^}]*\}',
    message: 'Include path uses backslash — use forward-slash for Unix compatibility',
    severity: 'warning',
  },

  // ---- Misc ----

  'table-name': {
    pattern: '\\bLIKE +[a-z]\\w*\\b',
    message: 'LIKE table name should be uppercase (by convention)',
    severity: 'warning',
  },
  'when-misuse': {
    pattern: '\\bASSIGN\\s+\\S+\\s*=\\s*\\S+\\s+WHEN\\s',
    message: 'ASSIGN...WHEN usage may be confusing — use IF/THEN instead',
    severity: 'warning',
  },
}

// ---------------------------------------------------------------------------
// Compile & apply
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function lintAbl(
  source: string,
  filePath: string,
  extraRules?: Record<string, LintRuleSpec>,
): LintWarning[] {
  const merged = { ...BUILT_IN_RULES, ...extraRules }
  const rules = compileRules(merged)
  const warnings: LintWarning[] = []
  const lines = source.split('\n')

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum]

    for (const [ruleName, rule] of Object.entries(rules)) {
      if (!shouldApply(rule, filePath)) continue

      // Special: nolonglines — length check
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
  extraRules?: Record<string, LintRuleSpec>,
): LintReport {
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
            const fileWarnings = lintAbl(source, full, extraRules)
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

export function getBuiltInRules(): Record<string, LintRuleSpec> {
  return { ...BUILT_IN_RULES }
}
