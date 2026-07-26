/**
 * Flag high description similarity across cities (Jaccard on word shingles).
 * Usage: npx tsx scripts/detect-duplicate-content.ts [--threshold 0.5]
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CityRecord } from '../lib/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CITIES = join(__dirname, '..', 'data', 'catalog', 'cities.json')

function shingles(text: string, size = 5) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const set = new Set<string>()
  for (let i = 0; i <= words.length - size; i += 1) {
    set.add(words.slice(i, i + size).join(' '))
  }
  return set
}

function jaccard(a: Set<string>, b: Set<string>) {
  let inter = 0
  for (const value of a) if (b.has(value)) inter += 1
  const union = a.size + b.size - inter
  return union === 0 ? 0 : inter / union
}

function main() {
  const thresholdArg = process.argv.find((arg) => arg.startsWith('--threshold'))
  const threshold = thresholdArg
    ? Number(thresholdArg.includes('=') ? thresholdArg.split('=')[1] : process.argv[process.argv.indexOf(thresholdArg) + 1])
    : 0.5

  const cities = JSON.parse(readFileSync(CITIES, 'utf8')) as CityRecord[]
  const profiles = cities.map((city) => ({
    slug: city.slug,
    set: shingles(city.description),
  }))

  const pairs: Array<{ a: string; b: string; score: number }> = []
  for (let i = 0; i < profiles.length; i += 1) {
    for (let j = i + 1; j < profiles.length; j += 1) {
      const score = jaccard(profiles[i].set, profiles[j].set)
      if (score >= threshold) {
        pairs.push({ a: profiles[i].slug, b: profiles[j].slug, score })
      }
    }
  }

  pairs.sort((left, right) => right.score - left.score)
  console.log(`Compared ${cities.length} descriptions @ threshold ${threshold}`)
  console.log(`Pairs ≥ threshold: ${pairs.length}`)
  for (const pair of pairs.slice(0, 25)) {
    console.log(`  ${(pair.score * 100).toFixed(1)}%  ${pair.a} ↔ ${pair.b}`)
  }

  // Soft launch gate: allow some related-city similarity, but fail if too many.
  const maxAllowed = Math.max(8, Math.round(cities.length * 0.02))
  if (pairs.length > maxAllowed) {
    console.error(`Too many high-similarity pairs (${pairs.length} > ${maxAllowed}).`)
    process.exit(1)
  }
  console.log('duplicate-content check OK')
}

main()
