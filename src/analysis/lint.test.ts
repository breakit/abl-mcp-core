import { describe, it, expect } from 'vitest'
import { lintAbl, formatLintReport } from './lint.js'

const rules = {
  'no-undo': {
    pattern: '^define (?:variable|var) +(?:output +parameter +)?\\w+ (?:as \\w+ )?(?!.*no-undo)',
    message: 'variable should include no-undo',
    severity: 'error' as const,
  },
  'pause': {
    pattern: 'pause\\b',
    message: 'pause is deprecated',
    severity: 'warning' as const,
  },
  'recid': {
    pattern: '\\brecid\\b',
    message: 'recid is obsolete',
    severity: 'error' as const,
  },
  'dot-comment': {
    pattern: '\\.\\s*/\\*',
    message: 'period followed by comment',
    severity: 'error' as const,
  },
  'nolonglines': {
    message: 'line exceeds 80 chars',
    severity: 'warning' as const,
  },
  'naming-tt': {
    pattern: '\\bdefine\\s+temp-table\\s+(?![glucio]+-\\w+(?:-\\w+)*-tt\\b)\\w+',
    message: 'temp-table naming convention violation',
    severity: 'warning' as const,
  },
}

describe('lintAbl', () => {
  it('detects no-undo violations', () => {
    const src = 'define variable x as integer.\ndefine variable y as integer no-undo.\n'
    const warnings = lintAbl(src, 'test.p', rules)
    expect(warnings).toHaveLength(1)
    expect(warnings[0].rule).toBe('no-undo')
    expect(warnings[0].severity).toBe('error')
    expect(warnings[0].line).toBe(1)
  })

  it('detects pause', () => {
    const warnings = lintAbl('pause.\npause 0 before-hide.\n', 'test.p', rules)
    expect(warnings).toHaveLength(2)
    expect(warnings[0].rule).toBe('pause')
  })

  it('detects recid', () => {
    const warnings = lintAbl('x = recid(customer).', 'test.p', rules)
    expect(warnings).toHaveLength(1)
    expect(warnings[0].rule).toBe('recid')
  })

  it('detects dot-comment', () => {
    const warnings = lintAbl('return true. /* done */', 'test.p', rules)
    expect(warnings).toHaveLength(1)
    expect(warnings[0].rule).toBe('dot-comment')
  })

  it('handles case-insensitive matching', () => {
    const src = 'DEFINE VARIABLE x AS INTEGER.\nPAUSE.\n'
    const warnings = lintAbl(src, 'test.p', rules)
    expect(warnings).toHaveLength(2)
  })

  it('returns empty for clean code', () => {
    const src = 'define variable l-buffer-h as handle no-undo.\nreturn.\n'
    const warnings = lintAbl(src, 'test.p', rules)
    expect(warnings).toHaveLength(0)
  })

  it('detects naming convention violations', () => {
    const warnings = lintAbl('define temp-table ttCustomer like customer.', 'test.p', rules)
    expect(warnings).toHaveLength(1)
    expect(warnings[0].rule).toBe('naming-tt')
  })

  it('accepts correct naming convention', () => {
    const warnings = lintAbl('define temp-table l-customer-tt like customer.', 'test.p', rules)
    expect(warnings).toHaveLength(0)
  })

  it('detects long lines with nolonglines rule', () => {
    const longLine = 'a'.repeat(81)
    const warnings = lintAbl(longLine, 'test.p', rules)
    expect(warnings).toHaveLength(1)
    expect(warnings[0].rule).toBe('nolonglines')
    expect(warnings[0].message).toContain('81')
  })

  it('skips lines at exactly 80 chars', () => {
    const line = 'a'.repeat(80)
    const warnings = lintAbl(line, 'test.p', rules)
    expect(warnings).toHaveLength(0)
  })
})

describe('formatLintReport', () => {
  it('returns no issues found for empty report', () => {
    const result = formatLintReport({ warnings: [], summary: {} })
    expect(result).toBe('No issues found.')
  })

  it('groups errors and warnings', () => {
    const report = {
      warnings: [
        { file: 'a.p', line: 1, rule: 'no-undo', message: 'msg', severity: 'error' as const },
        { file: 'a.p', line: 2, rule: 'pause', message: 'msg2', severity: 'warning' as const },
      ],
      summary: { 'no-undo': 1, 'pause': 1 },
    }
    const result = formatLintReport(report)
    expect(result).toContain('Errors (1)')
    expect(result).toContain('Warnings (1)')
    expect(result).toContain('Summary')
    expect(result).toContain('no-undo: 1')
  })
})
