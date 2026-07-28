/**
 * Pull two licensed photos per city from Unsplash (api.unsplash.com).
 * Requires a free Unsplash developer app — register one at
 * https://unsplash.com/developers and set UNSPLASH_ACCESS_KEY.
 *
 * Photos are used under the Unsplash License (free for commercial use,
 * attribution appreciated but not required) — this script still stores
 * photographer name + profile link and the app credits them on every city
 * page. Unsplash's API Guidelines also ask that a "download" event be
 * pinged when a photo is actually served to a reader; this script stores
 * each result's `downloadLocation` in the cache but does not ping it —
 * wiring that in (client-side, on the city page) is a follow-up, not yet
 * implemented here.
 *
 * Output: data/raw/enrichments/photos.json
 */

import { loadSeedCities, sleep, writeEnrichment } from './lib/io'

const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY
const PHOTOS_PER_CITY = 2

type UnsplashPhoto = {
  urls: { regular: string }
  alt_description: string | null
  description: string | null
  user: { name: string; links: { html: string } }
  links: { download_location: string }
}

type UnsplashSearchResponse = {
  results: UnsplashPhoto[]
}

export type PhotosEnrichment = {
  generatedAt: string
  cities: Record<
    string,
    {
      images: Array<{
        url: string
        alt: string
        credit: string
        creditUrl: string
        downloadLocation: string
      }>
    }
  >
}

async function searchCityPhotos(query: string) {
  const url =
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}` +
    `&per_page=${PHOTOS_PER_CITY}&orientation=landscape&content_filter=high`
  const response = await fetch(url, {
    headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
  })
  if (!response.ok) throw new Error(`Unsplash HTTP ${response.status} for "${query}"`)
  const data = (await response.json()) as UnsplashSearchResponse
  return data.results
}

async function main() {
  if (!ACCESS_KEY) {
    console.error(
      'enrich-photos: set UNSPLASH_ACCESS_KEY (free at https://unsplash.com/developers) before running this script.',
    )
    process.exit(1)
  }

  const seed = loadSeedCities()
  const cities: PhotosEnrichment['cities'] = {}
  let ok = 0

  for (let i = 0; i < seed.length; i += 1) {
    const city = seed[i]
    process.stdout.write(`\r[${i + 1}/${seed.length}] ${city.slug}          `)
    try {
      const results = await searchCityPhotos(`${city.name} ${city.state} skyline cityscape`)
      if (results.length < 2) {
        console.warn(`\nenrich-photos: fewer than 2 usable results for ${city.slug} (${results.length})`)
      }
      const images = results.slice(0, PHOTOS_PER_CITY).map((photo) => ({
        url: photo.urls.regular,
        alt: photo.alt_description ?? photo.description ?? `${city.name}, ${city.state}`,
        credit: photo.user.name,
        creditUrl: photo.user.links.html,
        downloadLocation: photo.links.download_location,
      }))
      if (images.length) {
        cities[city.slug] = { images }
        ok += 1
      }
    } catch (error) {
      console.warn(`\nenrich-photos: failed for ${city.slug}:`, error)
    }
    // Unsplash's unauthenticated-app rate limit is 50 req/hour — stay well under it.
    await sleep(400)
  }
  console.log('')

  const payload: PhotosEnrichment = {
    generatedAt: new Date().toISOString(),
    cities,
  }
  const out = writeEnrichment('photos', payload)
  console.log(`Wrote ${ok}/${seed.length} photo enrichments → ${out}`)
  if (ok === 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
