/**
 * Merges raw seed / enrichment outputs into the published catalog used by the site.
 * Today: copies curated seed cities and builds state rollups + index.
 * Later: merge enrich-census / enrich-bls / enrich-crime / enrich-climate patches.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CatalogIndex, CityRecord, StateRecord } from '../lib/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const RAW = join(ROOT, 'data', 'raw', 'cities-seed.json')
const OUT_DIR = join(ROOT, 'data', 'catalog')

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

function main() {
  const cities = JSON.parse(readFileSync(RAW, 'utf8')) as CityRecord[]
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

  console.log(`Catalog built: ${cities.length} cities, ${states.length} states → ${OUT_DIR}`)
}

main()
