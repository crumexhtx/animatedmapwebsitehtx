/**
 * Merge seed cities with enrichment patches into the published catalog.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CatalogIndex, CityRecord, StateRecord } from '../lib/types'
import type { BlsEnrichment } from './enrich-bls'
import type { CensusEnrichment } from './enrich-census'
import type { ClimateEnrichment } from './enrich-climate'
import type { CrimeEnrichment } from './enrich-crime'
import { buildUniqueDescription } from './lib/descriptions'
import { ENRICH_DIR, SEED_PATH } from './lib/io'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT_DIR = join(ROOT, 'data', 'catalog')

function readJson<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T
  } catch {
    return null
  }
}

function buildStates(cities: CityRecord[]): StateRecord[] {
  const byState = new Map<string, CityRecord[]>()
  for (const city of cities) {
    const list = byState.get(city.stateSlug) ?? []
    list.push(city)
    byState.set(city.stateSlug, list)
  }

  return [...byState.entries()]
    .map(([slug, list]) => {
      const sorted = [...list].sort((a, b) => b.population - a.population)
      const population = sorted.reduce((sum, city) => sum + city.population, 0)
      const medianHouseholdIncome = Math.round(
        sorted.reduce((sum, city) => sum + city.medianHouseholdIncome, 0) / sorted.length,
      )
      const costOfLivingIndex = Math.round(
        sorted.reduce((sum, city) => sum + city.costOfLivingIndex, 0) / sorted.length,
      )
      const top = sorted.slice(0, 3).map((city) => city.name)
      const name = sorted[0].state
      const code = sorted[0].stateCode

      return {
        slug,
        name,
        code,
        cityCount: sorted.length,
        population,
        medianHouseholdIncome,
        costOfLivingIndex,
        description:
          `${name} currently includes ${sorted.length} MapsToIt city profiles covering roughly ` +
          `${population.toLocaleString('en-US')} residents across the published set. Average median household income ` +
          `across those cities is about $${medianHouseholdIncome.toLocaleString('en-US')}, with a blended cost-of-living ` +
          `index near ${costOfLivingIndex} (100 = U.S. average). Larger places in this release include ${top.join(', ')}. ` +
          `Use the city list below to compare housing costs, commute times, climate, and safety before relocating.`,
        citySlugs: sorted.map((city) => city.slug),
      } satisfies StateRecord
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

function mergeCity(
  seed: CityRecord,
  census: CensusEnrichment | null,
  bls: BlsEnrichment | null,
  crime: CrimeEnrichment | null,
  climate: ClimateEnrichment | null,
): CityRecord {
  const censusRow = census?.cities[seed.slug]
  const blsRow = bls?.cities[seed.slug]
  const crimeRow = crime?.cities[seed.slug]
  const climateRow = climate?.cities[seed.slug]

  const merged: CityRecord = {
    ...seed,
    population: censusRow?.population ?? seed.population,
    medianHouseholdIncome: censusRow?.medianHouseholdIncome ?? seed.medianHouseholdIncome,
    medianHomePrice: censusRow?.medianHomePrice ?? seed.medianHomePrice,
    medianRent: censusRow?.medianRent ?? seed.medianRent,
    costOfLivingIndex: censusRow?.costOfLivingIndex ?? seed.costOfLivingIndex,
    unemploymentRate: blsRow?.unemploymentRate ?? seed.unemploymentRate,
    crimeIndex: crimeRow
      ? {
          violent: crimeRow.violent,
          property: crimeRow.property,
          source: crimeRow.source,
        }
      : seed.crimeIndex,
    climate: climateRow
      ? {
          avgHighSummer: climateRow.avgHighSummer,
          avgLowWinter: climateRow.avgLowWinter,
          annualRainfall: climateRow.annualRainfall,
          sunnyDays: climateRow.sunnyDays,
        }
      : seed.climate,
    sources: {
      census: censusRow?.source ?? seed.sources.census,
      bls: blsRow?.source ?? seed.sources.bls,
      fbi: crimeRow?.source ?? seed.sources.fbi,
      noaa: climateRow?.source ?? seed.sources.noaa,
    },
    lastUpdated: new Date().toISOString().slice(0, 10),
  }

  merged.description = buildUniqueDescription(merged)
  return merged
}

function main() {
  const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8')) as CityRecord[]
  const census = readJson<CensusEnrichment>(join(ENRICH_DIR, 'census.json'))
  const bls = readJson<BlsEnrichment>(join(ENRICH_DIR, 'bls.json'))
  const crime = readJson<CrimeEnrichment>(join(ENRICH_DIR, 'crime.json'))
  const climate = readJson<ClimateEnrichment>(join(ENRICH_DIR, 'climate.json'))

  const cities = seed.map((city) => mergeCity(city, census, bls, crime, climate))
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(join(OUT_DIR, 'cities.json'), JSON.stringify(cities, null, 2))

  const states = buildStates(cities)
  writeFileSync(join(OUT_DIR, 'states.json'), JSON.stringify(states, null, 2))

  const index: CatalogIndex = {
    generatedAt: new Date().toISOString().slice(0, 10),
    cityCount: cities.length,
    stateCount: states.length,
    featuredSlugs: cities.filter((city) => city.featured).map((city) => city.slug),
  }
  writeFileSync(join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2))

  console.log(
    `Catalog built: ${cities.length} cities, ${states.length} states` +
      ` (census=${census ? Object.keys(census.cities).length : 0}` +
      `, bls=${bls ? Object.keys(bls.cities).length : 0}` +
      `, crime=${crime ? Object.keys(crime.cities).length : 0}` +
      `, climate=${climate ? Object.keys(climate.cities).length : 0}) → ${OUT_DIR}`,
  )
}

main()
