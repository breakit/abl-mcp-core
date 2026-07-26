import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { join, sep } from 'path'

export interface DependencyNode {
  path: string
  includes: string[]
  calls: string[]
  defines: string[]
  referencedBy: string[]
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>
  cycles: string[][]
  orphans: string[]
}

/**
 * Build a full dependency graph of all ABL files under rootDir.
 * Tracks {include} references and function/procedure calls between files.
 */
export function buildDependencyGraph(rootDir: string): DependencyGraph {
  const nodes = new Map<string, DependencyNode>()
  const extensions = ['.p', '.w', '.cls', '.i']
  const files = findAblFiles(rootDir, extensions)

  for (const file of files) {
    const node: DependencyNode = {
      path: file,
      includes: [],
      calls: [],
      defines: [],
      referencedBy: [],
    }

    try {
      const text = readFileSync(file, 'utf-8')

      // Extract {include} paths
      for (const m of text.matchAll(/\{([^}]+\.i)\}/gi)) {
        node.includes.push(m[1].toLowerCase())
      }

      // Extract RUN statements (procedure/function calls)
      for (const m of text.matchAll(/RUN\s+(\w+)\s*(?:\(|\.|$)/gi)) {
        if (!m[1].startsWith('REPOSITORY') && !m[1].startsWith('IP_')) {
          node.calls.push(m[1].toLowerCase())
        }
      }

      // Extract FIXED function calls
      for (const m of text.matchAll(/(\w+\/\w+)\.(\w+)\s*\(/g)) {
        node.calls.push(`${m[1]}.${m[2]}`.toLowerCase())
      }

      // Extract preprocessor defines
      for (const m of text.matchAll(/&SCOPED-DEFINE\s+(\w+)/gi)) {
        node.defines.push(m[1].toLowerCase())
      }
      for (const m of text.matchAll(/&GLOBAL-DEFINE\s+(\w+)/gi)) {
        node.defines.push(m[1].toLowerCase())
      }
    } catch {
      // Skip unreadable files
    }

    nodes.set(file, node)
  }

  // Build reverse references (referencedBy)
  for (const [file, node] of nodes) {
    for (const inc of node.includes) {
      for (const [otherFile, otherNode] of nodes) {
        if (otherFile !== file && otherFile.toLowerCase().endsWith(sep + inc)) {
          otherNode.referencedBy.push(file)
        }
      }
    }
  }

  // Detect orphans (files with no incoming includes)
  const orphans: string[] = []
  for (const [file, node] of nodes) {
    if (node.referencedBy.length === 0) {
      const basename = file.split(sep).pop()?.toLowerCase() || ''
      // Only files in incl/ or with .i extension that aren't referenced
      if (file.includes(`${sep}incl${sep}`) || file.endsWith('.i')) {
        orphans.push(file)
      }
    }
  }

  // Detect cycles (simple DFS)
  const cycles: string[][] = []
  for (const [file, node] of nodes) {
    for (const inc of node.includes) {
      for (const [otherFile, otherNode] of nodes) {
        if (otherFile !== file && otherFile.toLowerCase().endsWith(sep + inc)) {
          if (otherNode.includes.some(oi =>
            file.toLowerCase().endsWith(sep + oi),
          )) {
            cycles.push([file, otherFile])
          }
        }
      }
    }
  }

  return { nodes, cycles, orphans }
}

function findAblFiles(dir: string, extensions: string[]): string[] {
  const results: string[] = []
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          results.push(...findAblFiles(full, extensions))
        }
      } else if (entry.isFile() && extensions.some(e => entry.name.endsWith(e))) {
        results.push(full)
      }
    }
  } catch { /* permission denied */ }
  return results
}

export function formatDependencyGraph(graph: DependencyGraph): string {
  const lines: string[] = [
    `Total files: ${graph.nodes.size}`,
    '',
    ...Array.from(graph.nodes.entries()).map(([file, node]) =>
      `📄 ${file}\n  Includes: ${node.includes.join(', ') || 'none'}\n  Calls: ${node.calls.join(', ') || 'none'}\n  Referenced by: ${node.referencedBy.map(r => r.split(sep).pop()).join(', ') || 'none'}`,
    ),
    '',
    `Orphans (never included): ${graph.orphans.length}`,
    ...graph.orphans.map(f => `  ⚠ ${f}`),
    '',
    `Cycles detected: ${graph.cycles.length}`,
    ...graph.cycles.map(c => `  🔄 ${c[0].split(sep).pop()} ↔ ${c[1].split(sep).pop()}`),
  ]
  return lines.join('\n')
}
