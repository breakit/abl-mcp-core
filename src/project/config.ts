import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { AblMcpConfig } from '../contracts/project.js'

export type { AblMcpConfig }

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
        config.propath = propathMatch[1].split(',').map((p: string) =>
          p.trim().replace(/["']/g, '').trim(),
        ).filter(Boolean)
      }

      const schemaMatch = content.match(/schema_dirs\s*=\s*\[([^\]]+)\]/i)
      if (schemaMatch) {
        config.schemaDirs = schemaMatch[1].split(',').map((p: string) =>
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
