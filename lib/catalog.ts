import citiesData from '@/data/catalog/cities.json'
import statesData from '@/data/catalog/states.json'
import indexData from '@/data/catalog/index.json'
import nationalData from '@/data/catalog/national.json'
import type { CatalogIndex, CityRecord, NationalBaselines, StateRecord } from '@/lib/types'

export { cityPath, statePath, siteUrl } from '@/lib/paths'

export const catalogIndex = indexData as CatalogIndex
export const nationalBaselines = nationalData as NationalBaselines
export const allCities = citiesData as CityRecord[]
export const allStates = statesData as StateRecord[]

const cityBySlug = new Map(allCities.map((city) => [city.slug, city]))
const stateBySlug = new Map(allStates.map((state) => [state.slug, state]))

export function getCity(slug: string) {
  return cityBySlug.get(slug)
}

export function getState(slug: string) {
  return stateBySlug.get(slug)
}

export function getCitiesByState(stateSlug: string) {
  return allCities
    .filter((city) => city.stateSlug === stateSlug)
    .sort((a, b) => b.population - a.population)
}

export function getFeaturedCities() {
  const featured = catalogIndex.featuredSlugs
    .map((slug) => cityBySlug.get(slug))
    .filter((city): city is CityRecord => Boolean(city))
  if (featured.length) return featured
  return [...allCities].sort((a, b) => b.population - a.population).slice(0, 12)
}

export function getNearbyCities(city: CityRecord) {
  return city.nearbyCities
    .map((slug) => cityBySlug.get(slug))
    .filter((item): item is CityRecord => Boolean(item))
}
