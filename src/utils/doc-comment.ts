export interface DocCommentOptions {
  type: 'class' | 'method' | 'function' | 'procedure'
  name: string
  description?: string
  params?: { name: string; dataType: string; description?: string }[]
  returnType?: string
  returnDesc?: string
  author?: string
  notes?: string[]
}

/**
 * Generate a properly formatted ABLDoc comment block.
 */
export function generateDocComment(opts: DocCommentOptions): string {
  const lines: string[] = ['/**']

  lines.push(` * Purpose: ${opts.description || opts.name}`)
  lines.push(' *')

  if (opts.params?.length) {
    for (const p of opts.params) {
      lines.push(` * @param ${p.name} - ${p.description || p.dataType}`)
    }
    lines.push(' *')
  }

  if (opts.returnType || opts.returnDesc) {
    lines.push(` * @return ${opts.returnDesc || opts.returnType || 'value'}`)
    lines.push(' *')
  }

  if (opts.notes?.length) {
    for (const note of opts.notes) {
      lines.push(` * @note ${note}`)
    }
    lines.push(' *')
  }

  if (opts.author) {
    lines.push(` * @author ${opts.author}`)
    lines.push(' *')
  }

  lines.push(' */')
  return lines.join('\n')
}

/**
 * Generate a doc comment for a class.
 */
export function generateClassDoc(name: string, description?: string): string {
  return generateDocComment({
    type: 'class',
    name,
    description: description || `${name} — Business Entity class`,
  })
}

/**
 * Generate a doc comment for a method with parameters.
 */
export function generateMethodDoc(
  methodName: string,
  description?: string,
  params?: { name: string; dataType: string; description?: string }[],
  returnType?: string,
): string {
  return generateDocComment({
    type: 'method',
    name: methodName,
    description: description || `${methodName} method`,
    params,
    returnType,
  })
}
