import { describe, it, expect } from 'vitest'
import { findAnnotations, formatAnnotations, type Annotation } from './annotations.js'

describe('findAnnotations', () => {
  it('detects TODO comments in /* */ style', () => {
    const results = findAnnotations('/* TODO: add error handling */\n', 'test.p')
    expect(results).toHaveLength(1)
    expect(results[0].type).toBe('TODO')
    expect(results[0].line).toBe(1)
    expect(results[0].text).toContain('add error handling')
  })

  it('detects TODO comments in // style', () => {
    const results = findAnnotations('// TODO: implement caching\n', 'test.p')
    expect(results).toHaveLength(1)
    expect(results[0].type).toBe('TODO')
  })

  it('detects FIXME', () => {
    const results = findAnnotations('/* FIXME: memory leak here */', 'test.p')
    expect(results).toHaveLength(1)
    expect(results[0].type).toBe('FIXME')
    expect(results[0].text).toContain('memory leak')
  })

  it('detects HACK', () => {
    const results = findAnnotations('// HACK: workaround for bug', 'test.p')
    expect(results).toHaveLength(1)
    expect(results[0].type).toBe('HACK')
  })

  it('detects XXX', () => {
    const results = findAnnotations('/* XXX: ugly hack */', 'test.p')
    expect(results).toHaveLength(1)
    expect(results[0].type).toBe('XXX')
  })

  it('detects NOTE', () => {
    const results = findAnnotations('// NOTE: this is important', 'test.p')
    expect(results).toHaveLength(1)
    expect(results[0].type).toBe('NOTE')
  })

  it('detects BUG', () => {
    const results = findAnnotations('/* BUG: index out of bounds */', 'test.p')
    expect(results).toHaveLength(1)
    expect(results[0].type).toBe('BUG')
  })

  it('detects OPTIMIZE', () => {
    const results = findAnnotations('// OPTIMIZE: cache this query', 'test.p')
    expect(results).toHaveLength(1)
    expect(results[0].type).toBe('OPTIMIZE')
  })

  it('detects multiple annotations on different lines', () => {
    const src = '/* TODO: first */\n// FIXME: second\n/* HACK: third */\n'
    const results = findAnnotations(src, 'test.p')
    expect(results).toHaveLength(3)
  })

  it('ignores non-annotation comments', () => {
    const src = '/* regular comment */\n// another comment\n/* no marker */\n'
    const results = findAnnotations(src, 'test.p')
    expect(results).toHaveLength(0)
  })

  it('does not match annotation keywords outside comments', () => {
    const results = findAnnotations('DEFINE VARIABLE TODO AS CHARACTER NO-UNDO.', 'test.p')
    expect(results).toHaveLength(0)
  })

  it('includes file path in results', () => {
    const results = findAnnotations('/* TODO: test */', '/path/to/file.cls')
    expect(results[0].file).toBe('/path/to/file.cls')
  })

  it('handles empty source', () => {
    expect(findAnnotations('', 'test.p')).toHaveLength(0)
  })

  it('handles REVIEW tag', () => {
    const results = findAnnotations('// REVIEW: check with team', 'test.p')
    expect(results).toHaveLength(1)
    expect(results[0].type).toBe('REVIEW')
  })

  it('handles TEMP tag', () => {
    const results = findAnnotations('// TEMP: remove after release', 'test.p')
    expect(results).toHaveLength(1)
    expect(results[0].type).toBe('TEMP')
  })

  it('handles UNDONE tag', () => {
    const results = findAnnotations('/* UNDONE: incomplete */', 'test.p')
    expect(results).toHaveLength(1)
    expect(results[0].type).toBe('UNDONE')
  })
})

describe('formatAnnotations', () => {
  it('returns no annotations for empty list', () => {
    expect(formatAnnotations([])).toBe('No annotations found.')
  })

  it('groups by type', () => {
    const annotations: Annotation[] = [
      { file: 'a.p', line: 1, type: 'TODO', text: 'todo1' },
      { file: 'a.p', line: 2, type: 'TODO', text: 'todo2' },
      { file: 'b.p', line: 1, type: 'FIXME', text: 'fix1' },
    ]
    const result = formatAnnotations(annotations)
    expect(result).toContain('TODO (2)')
    expect(result).toContain('FIXME (1)')
    expect(result).toContain('Total: 3 annotations in 2 files')
  })
})
