/**
 * Pull unemployment rates from BLS Local Area Unemployment Statistics (LAUS).
 * Resolves county FIPS via FCC census block API, then batches LAUS series
 * requests (up to 25 series / call — within the unregistered daily quota).
 *
 * Output: data/raw/enrichments/bls.json
 */

import { fetchJson, loadSeedCities, sleep, writeEnrichment } from './lib/io'

type FccResponse = {
  County?: { FIPS: string; name: string }
  State?: { FIPS: string; code: string; name: string }
}

type BlsSeriesPoint = {
  year: string
  period: string
  periodName: string
  value: string
}

type BlsResponse = {
  status: string
  message?: string[]
  Results: {
    series: Array<{
      seriesID: string
      data: BlsSeriesPoint[]
    }>
  }
}

export type BlsEnrichment = {
  generatedAt: string
  cities: Record<
    string,
    {
      seriesId: string
      countyFips: string
      countyName: string
      unemploymentRate: number
      period: string
      source: string
    }
  >
}

const BATCH_SIZE = 25

async function countyForCity(lat: number, lon: number) {
  const url = `https://geo.fcc.gov/api/census/block/find?latitude=${lat}&longitude=${lon}&format=json`
  return fetchJson<FccResponse>(url)
}

function latestRate(data: BlsSeriesPoint[]) {
  const point = data.find(
    (row) => row.period.startsWith('M') && row.value !== '-' && Number.isFinite(Number(row.value)),
  )
  if (!point) return null
  return {
    unemploymentRate: Number(point.value),
    period: `${point.periodName} ${point.year}`,
  }
}

async function fetchBatch(seriesIds: string[]) {
  const response = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seriesid: seriesIds,
      startyear: String(new Date().getFullYear() - 2),
      endyear: String(new Date().getFullYear()),
    }),
  })
  if (!response.ok) throw new Error(`BLS HTTP ${response.status}`)
  const data = (await response.json()) as BlsResponse
  if (data.status !== 'REQUEST_SUCCEEDED') {
    throw new Error(`BLS ${data.status}: ${(data.message ?? []).join('; ')}`)
  }
  return data.Results.series
}

async function main() {
  const seed = loadSeedCities()
  const meta: Array<{
    slug: string
    seriesId: string
    countyFips: string
    countyName: string
  }> = []

  for (let i = 0; i < seed.length; i++) {
    const city = seed[i]
    process.stdout.write(`\rfcc [${i + 1}/${seed.length}] ${city.slug}          `)
    try {
      const [lon, lat] = city.coordinates
      const fcc = await countyForCity(lat, lon)
      const countyFips = fcc.County?.FIPS
      const countyName = fcc.County?.name
      if (!countyFips || countyFips.length !== 5) throw new Error('missing county FIPS')
      meta.push({
        slug: city.slug,
        seriesId: `LAUCN${countyFips}0000000003`,
        countyFips,
        countyName: countyName ?? countyFips,
      })
    } catch (error) {
      console.warn(`\nfcc FAIL ${city.slug}:`, error)
    }
    await sleep(100)
  }
  console.log(`\nResolved ${meta.length}/${seed.length} counties`)

  const cities: BlsEnrichment['cities'] = {}
  let ok = 0
  for (let i = 0; i < meta.length; i += BATCH_SIZE) {
    const batch = meta.slice(i, i + BATCH_SIZE)
    console.log(`bls batch ${i / BATCH_SIZE + 1}: ${batch.length} series`)
    try {
      const series = await fetchBatch(batch.map((row) => row.seriesId))
      const byId = new Map(series.map((row) => [row.seriesID, row]))
      for (const row of batch) {
        const latest = latestRate(byId.get(row.seriesId)?.data ?? [])
        if (!latest) {
          console.warn(`bls empty ${row.slug} ${row.seriesId}`)
          continue
        }
        cities[row.slug] = {
          seriesId: row.seriesId,
          countyFips: row.countyFips,
          countyName: row.countyName,
          unemploymentRate: latest.unemploymentRate,
          period: latest.period,
          // Keep seriesId on the enrichment object for pipeline use only —
          // never interpolate the LAUCN… code into the public source string
          // (Google indexes those as orphan “queries” on city pages).
          source: `BLS LAUS · ${row.countyName}, ${latest.period}`,
        }
        ok += 1
      }
    } catch (error) {
      console.warn(`bls batch FAIL:`, error)
    }
    await sleep(1000)
  }

  const payload: BlsEnrichment = {
    generatedAt: new Date().toISOString(),
    cities,
  }
  const path = writeEnrichment('bls', payload)
  console.log(`Wrote ${ok} cities → ${path}`)
  if (ok < seed.length * 0.8) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
