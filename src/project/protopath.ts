import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { dirname, join, resolve } from 'path'
import type { PropPathConfig } from '../contracts/project.js'

export type { PropPathConfig }

export function loadPropath(rootDir: string): PropPathConfig {
  const directories: string[] = [rootDir]

  // Try to read propath from abl.toml
  const tomlPath = join(rootDir, 'abl.toml')
  if (existsSync(tomlPath)) {
    try {
      const content = readFileSync(tomlPath, 'utf-8')
      const propathMatch = content.match(/propath\s*=\s*\[([^\]]+)\]/i)
      if (propathMatch) {
        const paths = propathMatch[1].split(',').map((p: string) => p.trim().replace(/["']/g, '').trim())
        for (const p of paths) {
          const resolved = resolve(rootDir, p)
          if (existsSync(resolved)) directories.push(resolved)
        }
      }
    } catch {
      // ignore
    }
  }

  return { directories, projectRoot: rootDir }
}

export function resolveIncludePath(
  includePath: string,
  config: PropPathConfig,
  currentFile?: string,
): string | null {
  const normalized = includePath.replace(/\\/g, '/')

  // Try relative to current file first
  if (currentFile) {
    const currentDir = dirname(currentFile)
    const candidate = resolve(currentDir, normalized)
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate

    // Try with .i extension
    if (!normalized.endsWith('.i')) {
      const withExt = resolve(currentDir, normalized + '.i')
      if (existsSync(withExt) && statSync(withExt).isFile()) return withExt
    }
  }

  // Try each PROPATH directory
  for (const dir of config.directories) {
    const candidate = resolve(dir, normalized)
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate

    if (!normalized.endsWith('.i')) {
      const withExt = resolve(dir, normalized + '.i')
      if (existsSync(withExt) && statSync(withExt).isFile()) return withExt
    }
  }

  return null
}

export function findProjectFiles(
  rootDir: string,
  extensions: string[] = ['.p', '.w', '.cls', '.i'],
): string[] {
  const files: string[] = []
  const walk = (dir: string) => {
    try {
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') walk(full)
        } else if (entry.isFile() && extensions.some(e => entry.name.endsWith(e))) {
          files.push(full)
        }
      }
    } catch {
      // permission denied, skip
    }
  }
  walk(rootDir)
  return files
}
