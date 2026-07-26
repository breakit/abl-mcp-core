import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export interface AblMcpConfig {
  /** Project root directory */
  projectRoot: string
  /** Directories containing .df schema files */
  schemaDirs: string[]
  /** PROPATH directories */
  propath: string[]
  /** Database connections (logical name -> physical path) */
  databases: Record<string, string>
  /** CCS-specific config */
  ccs?: {
    /** Base package for generated classes */
    basePackage?: string
    /** Output directory for generated code */
    outputDir?: string
  }
}

export function loadConfig(rootDir: string): AblMcpConfig {
  const config: AblMcpConfig = {
    projectRoot: rootDir,
    schemaDirs: [rootDir],
    propath: [rootDir],
    databases: {},
  }

  const tomlPath = join(rootDir, 'abl.toml')
  if (existsSync(tomlPath)) {
    try {
      const content = readFileSync(tomlPath, 'utf-8')

      const propathMatch = content.match(/propath\s*=\s*\[([^\]]+)\]/i)
      if (propathMatch) {
        config.propath = propathMatch[1].split(',').map(p =>
          p.trim().replace(/["']/g, '').trim(),
        ).filter(Boolean)
      }

      const schemaMatch = content.match(/schema_dirs\s*=\s*\[([^\]]+)\]/i)
      if (schemaMatch) {
        config.schemaDirs = schemaMatch[1].split(',').map(p =>
          p.trim().replace(/["']/g, '').trim(),
        ).filter(Boolean)
      }

      const dbMatch = content.match(/databases\s*=\s*\[([^\]]+)\]/i)
      if (dbMatch) {
        const entries = dbMatch[1].split(',').reduce((acc: string[], p: string) => {
          const t = p.trim().replace(/["']/g, '').trim()
          if (t) acc.push(t)
          return acc
        }, [])
        for (const entry of entries) {
          const [name, ...pathParts] = entry.split(/\s*=\s*/)
          if (name) config.databases[name.trim()] = pathParts.join('=').trim()
        }
      }

    } catch {
      // ignore
    }
  }

  return config
}
