/**
 * CI guard: fail if tracked template/env files contain values that look like real API keys.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const TRACKED_FILES = ['.env.example']

const PLACEHOLDER = /your-[-a-z]*-here|example|placeholder|changeme|xxx|<.*>/i

const SUSPECT: Array<{ name: string; pattern: RegExp }> = [
  { name: 'CARTO key', pattern: /^NEXT_PUBLIC_CARTO_API_KEY=cb1_[A-Za-z0-9_]+/m },
  { name: 'Census key', pattern: /^CENSUS_API_KEY=[a-f0-9]{20,}/im },
  { name: 'FBI / data.gov key', pattern: /^(FBI_API_KEY|DATA_GOV_API_KEY)=[A-Za-z0-9]{16,}/m },
]

function isPlaceholder(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return true
  return PLACEHOLDER.test(trimmed)
}

function checkEnvExample(path: string) {
  const text = readFileSync(path, 'utf8')
  const errors: string[] = []

  for (const { name, pattern } of SUSPECT) {
    if (pattern.test(text)) {
      errors.push(`${path}: looks like a real ${name} — use a placeholder instead`)
    }
  }

  for (const line of text.split('\n')) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
    if (!match) continue
    const [, key, rawValue] = match
    if (key === 'NEXT_PUBLIC_SITE_URL') continue
    if (!isPlaceholder(rawValue)) {
      errors.push(`${path}: ${key} should use an obvious placeholder, not "${rawValue}"`)
    }
  }

  return errors
}

function main() {
  const errors: string[] = []

  for (const rel of TRACKED_FILES) {
    const path = join(ROOT, rel)
    try {
      errors.push(...checkEnvExample(path))
    } catch {
      errors.push(`Missing required file: ${rel}`)
    }
  }

  if (errors.length) {
    console.error('check-tracked-secrets failed:')
    for (const error of errors) console.error(`  - ${error}`)
    process.exit(1)
  }

  console.log('check-tracked-secrets OK')
}

main()
