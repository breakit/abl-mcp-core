import { parseAblFile } from '../parser/abl.js'
import { resolveIncludePath } from '../project/protopath.js'
import type { IncludeSymbol, ResolvedIncludes } from '../contracts/symbol.js'

export type { IncludeSymbol, ResolvedIncludes }

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
