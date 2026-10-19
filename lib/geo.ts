/** Coordinates are [longitude, latitude] to match GeoJSON / the catalog. */

export function haversineMiles(a: [number, number], b: [number, number]) {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180
  const radius = 3958.8
  const dLat = toRad(b[1] - a[1])
  const dLon = toRad(b[0] - a[0])
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * radius * Math.asin(Math.sqrt(h))
}

export function nearestCitySlugs<T extends { slug: string; coordinates: [number, number] }>(
  city: T,
  catalog: T[],
  limit = 6,
): string[] {
  return catalog
    .filter((other) => other.slug !== city.slug)
    .map((other) => ({
      slug: other.slug,
      miles: haversineMiles(city.coordinates, other.coordinates),
    }))
    .sort((a, b) => a.miles - b.miles || a.slug.localeCompare(b.slug))
    .slice(0, limit)
    .map((item) => item.slug)
}
