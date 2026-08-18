export type MapCity = {
  slug: string
  name: string
  stateSlug: string
  stateCode: string
  population: number
  coordinates: [number, number]
}

export function toMapCity(city: MapCity): MapCity {
  return {
    slug: city.slug,
    name: city.name,
    stateSlug: city.stateSlug,
    stateCode: city.stateCode,
    population: city.population,
    coordinates: city.coordinates,
  }
}

export function toMapCities(cities: MapCity[]): MapCity[] {
  return cities.map(toMapCity)
}
