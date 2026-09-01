import type { CityImage, CityRecord } from '@/lib/types'

export type CityHeroImage = {
  url: string
  alt: string
  credit?: string
  creditUrl?: string
}

/** US state / DC flag (PNG) via FlagCDN — no API key required. */
export function stateFlagUrl(stateCode: string) {
  return `https://flagcdn.com/w80/us-${stateCode.toLowerCase()}.png`
}

/** Wikimedia Commons paths for city flags (many cities lack one — caller should hide on error). */
export function cityFlagCandidates(city: Pick<CityRecord, 'name' | 'state' | 'slug'>): string[] {
  const name = city.name.replace(/ /g, '_')
  const state = city.state.replace(/ /g, '_')

  const slugOverrides: Record<string, string[]> = {
    'new-york-ny': ['Flag_of_New_York_City.svg'],
    'los-angeles-ca': ['Flag_of_Los_Angeles,_California.svg'],
    'chicago-il': ['Flag_of_Chicago,_Illinois.svg'],
    'washington-dc': ['Flag_of_Washington,_D.C..svg'],
  }

  const fileNames = slugOverrides[city.slug] ?? [
    `Flag_of_${name},_${state}.svg`,
    `Flag_of_${name}.svg`,
    `Flag_of_${name}_City.svg`,
    `Flag_of_the_City_of_${name}.svg`,
  ]

  return fileNames.map(
    (file) =>
      `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=80`,
  )
}

function wikipediaTitleCandidates(city: Pick<CityRecord, 'name' | 'state' | 'slug'>) {
  const titles = [`${city.name}, ${city.state}`, city.name]
  if (city.slug === 'new-york-ny') titles.unshift('New York City')
  if (city.slug === 'washington-dc') titles.unshift('Washington, D.C.')
  return [...new Set(titles)]
}

type WikiSummary = {
  title?: string
  thumbnail?: { source?: string }
  originalimage?: { source?: string }
}

/** Lead image from Wikipedia when catalog photos are missing (cached at build). */
export async function fetchWikipediaHero(
  city: Pick<CityRecord, 'name' | 'state' | 'slug'>,
): Promise<CityHeroImage | null> {
  for (const title of wikipediaTitleCandidates(city)) {
    try {
      const response = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        {
          headers: { 'User-Agent': 'MapsToIt/1.0 (https://mapstoit.com; city profile images)' },
          next: { revalidate: 60 * 60 * 24 * 7 },
        },
      )
      if (!response.ok) continue
      const data = (await response.json()) as WikiSummary
      const url = data.originalimage?.source ?? data.thumbnail?.source
      if (!url) continue
      return {
        url,
        alt: `Downtown and city center of ${city.name}, ${city.state}`,
        credit: 'Wikipedia',
        creditUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(data.title ?? title)}`,
      }
    } catch {
      continue
    }
  }
  return null
}

export function heroFromCatalog(images: CityImage[] | undefined, cityName: string): CityHeroImage | null {
  const image = images?.[0]
  if (!image) return null
  return {
    url: image.url,
    alt: image.alt || `City center of ${cityName}`,
    credit: image.credit,
    creditUrl: image.creditUrl,
  }
}

export async function resolveCityHero(city: CityRecord): Promise<CityHeroImage | null> {
  return heroFromCatalog(city.images, city.name) ?? (await fetchWikipediaHero(city))
}
