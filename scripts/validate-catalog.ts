/**
 * Fails the build if any published city is missing required fields or is thin.
 * Pattern mirrors MotoMediaX validate-catalog gating.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CityRecord } from '../lib/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CITIES = join(__dirname, '..', 'data', 'catalog', 'cities.json')

const REQUIRED_STRINGS: (keyof CityRecord)[] = [
  'slug',
  'name',
  'state',
  'stateSlug',
  'stateCode',
  'description',
  'lastUpdated',
]

function fail(message: string): never {
  console.error(`validate-catalog: ${message}`)
  process.exit(1)
}

function main() {
  let cities: CityRecord[]
  try {
    cities = JSON.parse(readFileSync(CITIES, 'utf8')) as CityRecord[]
  } catch {
    fail(`Could not read ${CITIES}. Run npm run generate-catalog && npm run build-catalog first.`)
  }

  if (!Array.isArray(cities) || cities.length < 100) {
    fail(`Expected at least 100 cities for launch; found ${cities?.length ?? 0}.`)
  }

  const slugs = new Set<string>()
  const errors: string[] = []

  for (const city of cities) {
    for (const key of REQUIRED_STRINGS) {
      const value = city[key]
      if (typeof value !== 'string' || !value.trim()) {
        errors.push(`${city.slug ?? '?'}: missing ${String(key)}`)
      }
    }

    if (slugs.has(city.slug)) errors.push(`${city.slug}: duplicate slug`)
    slugs.add(city.slug)

    if (city.description.trim().split(/\s+/).length < 120) {
      errors.push(`${city.slug}: description too short (need ~150–300 words / 120+ tokens)`)
    }

    const numbers: Array<[string, number]> = [
      ['population', city.population],
      ['medianHouseholdIncome', city.medianHouseholdIncome],
      ['costOfLivingIndex', city.costOfLivingIndex],
      ['medianHomePrice', city.medianHomePrice],
      ['medianRent', city.medianRent],
      ['unemploymentRate', city.unemploymentRate],
      ['crimeIndex.violent', city.crimeIndex?.violent],
      ['crimeIndex.property', city.crimeIndex?.property],
      ['climate.avgHighSummer', city.climate?.avgHighSummer],
      ['climate.avgLowWinter', city.climate?.avgLowWinter],
      ['climate.annualRainfall', city.climate?.annualRainfall],
      ['climate.sunnyDays', city.climate?.sunnyDays],
      ['commute.avgMinutes', city.commute?.avgMinutes],
    ]

    for (const [label, value] of numbers) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        // winter lows and unemployment can be low but should still be finite; unemployment can be 0 theoretically
        if (label === 'climate.avgLowWinter' && typeof value === 'number' && Number.isFinite(value)) continue
        if (label === 'unemploymentRate' && typeof value === 'number' && value >= 0) continue
        errors.push(`${city.slug}: invalid ${label}`)
      }
    }

    if (!city.crimeIndex?.source) errors.push(`${city.slug}: missing crimeIndex.source`)
    if (!city.sources || Object.keys(city.sources).length === 0) {
      errors.push(`${city.slug}: missing sources`)
    }
    if (!Array.isArray(city.nearbyCities) || city.nearbyCities.length < 3) {
      errors.push(`${city.slug}: need at least 3 nearbyCities`)
    }
    if (!Array.isArray(city.coordinates) || city.coordinates.length !== 2) {
      errors.push(`${city.slug}: missing coordinates`)
    }

    for (const near of city.nearbyCities ?? []) {
      if (near === city.slug) errors.push(`${city.slug}: nearbyCities includes self`)
    }
  }

  // nearby must resolve inside catalog
  for (const city of cities) {
    for (const near of city.nearbyCities) {
      if (!slugs.has(near)) errors.push(`${city.slug}: nearby ${near} not in catalog`)
    }
  }

  if (errors.length) {
    console.error(`validate-catalog failed with ${errors.length} issue(s):`)
    for (const error of errors.slice(0, 40)) console.error(`  - ${error}`)
    if (errors.length > 40) console.error(`  …and ${errors.length - 40} more`)
    process.exit(1)
  }

  console.log(`validate-catalog OK: ${cities.length} complete city records`)
}

main()
