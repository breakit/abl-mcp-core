import { parseAblFile, type IncludeNode } from '../parser/abl.js'
import { resolveIncludePath } from '../project/protopath.js'

export interface IncludeSymbol {
  rawPath: string
  resolvedPath: string | null
  line: number
}

export interface ResolvedIncludes {
  source: string
  filePath: string
  includes: IncludeSymbol[]
}

export function resolveIncludes(
  source: string,
  filePath: string,
  propathConfig: { directories: string[]; projectRoot: string },
): ResolvedIncludes {
  const result = parseAblFile(source)
  const includes: IncludeSymbol[] = result.includes.map(inc => ({
    rawPath: inc.path,
    resolvedPath: resolveIncludePath(inc.path, propathConfig, filePath),
    line: inc.line,
  }))

  return { source, filePath, includes }
}
