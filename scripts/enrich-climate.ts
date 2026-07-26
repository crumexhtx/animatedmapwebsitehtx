/**
 * Pull NOAA 1991–2020 monthly Climate Normals for the nearest station with
 * published normals CSV (prefer USW first-order stations).
 *
 * Output: data/raw/enrichments/climate.json
 */

import { fetchText, haversineMiles, loadSeedCities, sleep, writeEnrichment } from './lib/io'

type Station = {
  id: string
  lat: number
  lon: number
  name: string
}

export type ClimateEnrichment = {
  generatedAt: string
  cities: Record<
    string,
    {
      stationId: string
      stationName: string
      distanceMiles: number
      avgHighSummer: number
      avgLowWinter: number
      annualRainfall: number
      sunnyDays: number
      source: string
    }
  >
}

const INVENTORY_URL =
  'https://www.ncei.noaa.gov/data/normals-monthly/1991-2020/doc/inventory_30yr.txt'
const STATION_CSV = (id: string) =>
  `https://www.ncei.noaa.gov/data/normals-monthly/1991-2020/access/${id}.csv`

function parseInventory(text: string): Station[] {
  const stations: Station[] = []
  for (const line of text.split('\n')) {
    if (!line.startsWith('US')) continue
    const id = line.slice(0, 11).trim()
    const lat = Number(line.slice(12, 20))
    const lon = Number(line.slice(21, 30))
    const name = line.slice(41, 71).trim()
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    stations.push({ id, lat, lon, name })
  }
  return stations
}

function parseNumber(raw: string) {
  const value = Number(raw.trim())
  return Number.isFinite(value) ? value : null
}

function parseNormalsCsv(csv: string) {
  const lines = csv.trim().split(/\r?\n/)
  const header = lines[0].split(',').map((part) => part.replaceAll('"', ''))
  const idx = (name: string) => header.indexOf(name)
  const monthIdx = idx('month')
  const tmaxIdx = idx('MLY-TMAX-NORMAL')
  const tminIdx = idx('MLY-TMIN-NORMAL')
  const prcpIdx = idx('MLY-PRCP-NORMAL')
  const wetDaysIdx = idx('MLY-PRCP-AVGNDS-GE001HI')

  const byMonth = new Map<number, { tmax: number | null; tmin: number | null; prcp: number | null; wet: number | null }>()
  for (const line of lines.slice(1)) {
    const cols = line.split(',')
    const month = Number(cols[monthIdx]?.replaceAll('"', ''))
    if (!Number.isFinite(month)) continue
    byMonth.set(month, {
      tmax: parseNumber((cols[tmaxIdx] ?? '').replaceAll('"', '')),
      tmin: parseNumber((cols[tminIdx] ?? '').replaceAll('"', '')),
      prcp: parseNumber((cols[prcpIdx] ?? '').replaceAll('"', '')),
      wet: parseNumber((cols[wetDaysIdx] ?? '').replaceAll('"', '')),
    })
  }

  const summerMonths = [6, 7, 8]
  const winterMonths = [12, 1, 2]
  const avg = (months: number[], key: 'tmax' | 'tmin') => {
    const values = months
      .map((month) => byMonth.get(month)?.[key])
      .filter((value): value is number => typeof value === 'number')
    if (!values.length) return null
    return values.reduce((sum, value) => sum + value, 0) / values.length
  }

  let rainfall = 0
  let wetDays = 0
  let monthCount = 0
  for (const row of byMonth.values()) {
    if (typeof row.prcp === 'number') {
      rainfall += row.prcp
      monthCount += 1
    }
    if (typeof row.wet === 'number') wetDays += row.wet
  }

  const avgHighSummer = avg(summerMonths, 'tmax')
  const avgLowWinter = avg(winterMonths, 'tmin')
  if (avgHighSummer == null || avgLowWinter == null || monthCount < 12) return null

  const sunnyDays = Math.max(0, Math.min(365, Math.round(365 - wetDays)))
  return {
    avgHighSummer: Math.round(avgHighSummer),
    avgLowWinter: Math.round(avgLowWinter),
    annualRainfall: Number(rainfall.toFixed(1)),
    sunnyDays,
  }
}

function nearestCandidates(stations: Station[], lon: number, lat: number) {
  return [...stations]
    .map((station) => ({
      station,
      miles: haversineMiles([lon, lat], [station.lon, station.lat]),
      rank: station.id.startsWith('USW') ? 0 : station.id.startsWith('USC') ? 1 : 2,
    }))
    .sort((a, b) => a.rank - b.rank || a.miles - b.miles)
    .slice(0, 8)
}

async function main() {
  const inventory = parseInventory(await fetchText(INVENTORY_URL))
  console.log(`Loaded ${inventory.length} NOAA normals stations`)
  const seed = loadSeedCities()
  const cities: ClimateEnrichment['cities'] = {}
  let ok = 0
  let failed = 0

  for (const city of seed) {
    const [lon, lat] = city.coordinates
    const candidates = nearestCandidates(inventory, lon, lat)
    let placed = false
    for (const candidate of candidates) {
      try {
        const csv = await fetchText(STATION_CSV(candidate.station.id))
        const normals = parseNormalsCsv(csv)
        if (!normals) continue
        cities[city.slug] = {
          stationId: candidate.station.id,
          stationName: candidate.station.name,
          distanceMiles: Number(candidate.miles.toFixed(1)),
          ...normals,
          source: `NOAA 1991–2020 Monthly Normals (${candidate.station.id} ${candidate.station.name})`,
        }
        ok += 1
        placed = true
        console.log(`climate OK ${city.slug} ← ${candidate.station.id}`)
        break
      } catch {
        // try next station
      }
      await sleep(80)
    }
    if (!placed) {
      failed += 1
      console.warn(`climate FAIL ${city.slug}: no station normals`)
    }
    await sleep(60)
  }

  const payload: ClimateEnrichment = {
    generatedAt: new Date().toISOString(),
    cities,
  }
  const path = writeEnrichment('climate', payload)
  console.log(`Wrote ${ok} cities (${failed} failed) → ${path}`)
  if (ok < seed.length * 0.8) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
