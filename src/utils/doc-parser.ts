export interface AblDocEntry {
  name: string
  type: 'class' | 'method' | 'function' | 'procedure'
  description: string
  params: { name: string; description: string; dataType?: string }[]
  returnDesc?: string
  returnType?: string
  file: string
  line: number
  modifier?: string
}

/**
 * Parse ABLDoc comments (/** ... * /) from ABL source and extract structured entries.
 */
export function parseAblDoc(source: string, filePath: string): AblDocEntry[] {
  const entries: AblDocEntry[] = []
  const lines = source.split('\n')

  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()

    // Start of an ABLDoc comment
    if (line.startsWith('/**')) {
      const docLines: string[] = []

      // Collect all lines until closing */
      while (i < lines.length && !lines[i].trim().endsWith('*/')) {
        const stripped = lines[i].trim().replace(/^\*\s*/, '').replace(/\s*\*\/$/, '')
        if (stripped && !stripped.startsWith('/**') && stripped !== '*/') {
          docLines.push(stripped)
        }
        i++
      }

      // Look ahead for the next declaration (class, method, function, procedure)
      let declLine = i + 1
      while (declLine < lines.length && !lines[declLine].trim()) declLine++
      if (declLine < lines.length) {
        const decl = lines[declLine].trim()

        const parsed = parseAbldocEntry(docLines, decl, filePath, declLine + 1)
        if (parsed) entries.push(parsed)
      }
    }

    i++
  }

  return entries
}

function parseAbldocEntry(
  docLines: string[],
  declaration: string,
  file: string,
  line: number,
): AblDocEntry | null {
  const description = docLines.filter(l =>
    !l.startsWith('@param') && !l.startsWith('@return') && !l.startsWith('@throws'),
  ).join(' ').trim()

  const params: { name: string; description: string; dataType?: string }[] = []
  let returnDesc: string | undefined

  for (const dl of docLines) {
    const paramMatch = dl.match(/^@param\s+(\w+)\s*(-\s*)?(\S.*)$/)
    if (paramMatch) {
      params.push({ name: paramMatch[1], description: paramMatch[3] })
    }
    const returnMatch = dl.match(/^@return\s+(\S.*)$/)
    if (returnMatch) {
      returnDesc = returnMatch[1]
    }
  }

  // Determine type from declaration
  let type: AblDocEntry['type'] = 'procedure'
  let name = ''
  let modifier: string | undefined

  if (/^\s*class\s+/i.test(declaration)) {
    type = 'class'
    const m = declaration.match(/^\s*class\s+(?:[\w.]*\.)?(\w+)/i)
    if (m) name = m[1]
  } else if (/^\s*method\s+/i.test(declaration)) {
    type = 'method'
    const modMatch = declaration.match(/(public|protected|private|static)/i)
    if (modMatch) modifier = modMatch[1].toLowerCase()
    const m = declaration.match(/method\s+(?:public|protected|private)?\s*(?:static\s*)?(?:handle|logical|character|void|integer|decimal)?\s*(\w+)/i)
    if (m) name = m[1]
  } else if (/^\s*function\s+/i.test(declaration)) {
    type = 'function'
    const m = declaration.match(/function\s+(\w+)/i)
    if (m) name = m[1]
  } else if (/^\s*procedure\s+/i.test(declaration)) {
    type = 'procedure'
    const m = declaration.match(/procedure\s+(\w+)/i)
    if (m) name = m[1]
  }

  if (!name) return null

  return { name, type, description, params, returnDesc, file, line, modifier }
}
