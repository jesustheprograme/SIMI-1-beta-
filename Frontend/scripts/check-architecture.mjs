import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const sourceRoot = join(process.cwd(), 'src')
const obsoleteDirectories = [
  'legacy-workspace',
  'features/groups',
  'features/plans',
  'features/plc',
  'features/processes',
  'features/sensors',
]
const failures = []

for (const directory of obsoleteDirectories) {
  if (existsSync(join(sourceRoot, directory))) failures.push(`obsolete directory: ${directory}`)
}

walk(sourceRoot)

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      walk(path)
      continue
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue
    inspect(path)
  }
}

function inspect(path) {
  const projectPath = relative(sourceRoot, path).replaceAll('\\', '/')
  const source = readFileSync(path, 'utf8')

  if (source.includes('legacy-workspace')) {
    failures.push(`${projectPath}: imports legacy-workspace`)
  }
  if (/from\s+['"]\.\/index['"]/.test(source)) {
    failures.push(`${projectPath}: imports its own public barrel`)
  }
  if (projectPath.startsWith('pages/') && source.split(/\r?\n/).length > 40) {
    failures.push(`${projectPath}: route file exceeds 40 lines`)
  }
}

if (failures.length) {
  console.error('Architecture check failed:')
  for (const failure of failures) console.error(`  ${failure}`)
  process.exit(1)
}

console.log('Architecture check passed: canonical features, thin pages, and no legacy adapters.')
