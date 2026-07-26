import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

export interface Annotation {
  file: string
  line: number
  type: 'TODO' | 'FIXME' | 'HACK' | 'XXX' | 'NOTE' | 'UNDONE' | 'BUG' | 'OPTIMIZE' | 'REVIEW' | 'TEMP'
  text: string
}

const ANNOTATION_RE = /(?:\/\*|\/\/)\s*(TODO|FIXME|HACK|XXX|NOTE|UNDONE|BUG|OPTIMIZE|REVIEW|TEMP)\b[:/\s]*(.*?)\s*(?:\*\/|$)/gi

export function findAnnotations(source: string, filePath: string): Annotation[] {
  const results: Annotation[] = []
  const lines = source.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    ANNOTATION_RE.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = ANNOTATION_RE.exec(line)) !== null) {
      const raw = match[2] ? match[2].trim() : ''
      results.push({
        file: filePath,
        line: i + 1,
        type: match[1].toUpperCase() as Annotation['type'],
        text: raw ? `${match[1].toUpperCase()}: ${raw}` : match[1].toUpperCase(),
      })
    }
  }

  return results
}

export function findAnnotationsInProject(rootDir: string): Annotation[] {
  const results: Annotation[] = []

  function walk(dir: string) {
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') walk(full)
        } else if (entry.isFile() && /\.(p|w|cls|i)$/i.test(entry.name)) {
          try {
            const source = readFileSync(full, 'utf-8')
            results.push(...findAnnotations(source, full))
          } catch { /* skip */ }
        }
      }
    } catch { /* skip */ }
  }

  walk(rootDir)
  return results
}

export function formatAnnotations(annotations: Annotation[]): string {
  if (!annotations.length) return 'No annotations found.'

  const byType: Record<string, Annotation[]> = {}
  for (const a of annotations) {
    ;(byType[a.type] ||= []).push(a)
  }

  const lines: string[] = []
  for (const type of ['TODO', 'FIXME', 'BUG', 'HACK', 'XXX', 'OPTIMIZE', 'REVIEW', 'NOTE', 'UNDONE', 'TEMP']) {
    const items = byType[type]
    if (!items?.length) continue
    lines.push(`${type} (${items.length}):`)
    for (const a of items.slice(0, 50)) {
      lines.push(`  ${a.file}:${a.line} — ${a.text}`)
    }
    if (items.length > 50) lines.push(`  ... and ${items.length - 50} more`)
    lines.push('')
  }

  lines.push(`Total: ${annotations.length} annotations in ${new Set(annotations.map(a => a.file)).size} files`)
  return lines.join('\n')
}
