/**
 * Pull violent/property offense rates from FBI Crime Data Explorer (api.usa.gov).
 * Uses DEMO_KEY by default (rate-limited). Set FBI_API_KEY for production runs.
 * Cities without agency matches are flagged source: "data unavailable".
 *
 * Output: data/raw/enrichments/crime.json
 */

import { fetchJson, loadSeedCities, sleep, writeEnrichment } from './lib/io'

type Agency = {
  ori: string
  agency_name: string
  agency_type_name: string
  latitude?: number | null
  longitude?: number | null
}

type AgencyByState = Record<string, Agency[]>

type OffensePayload = {
  offenses?: {
    rates?: Record<string, Record<string, number>>
  }
}

export type CrimeEnrichment = {
  generatedAt: string
  from: string
  to: string
  cities: Record<
    string,
    {
      available: boolean
      ori?: string
      agencyName?: string
      violent: number
      property: number
      source: string
    }
  >
}

const API_KEY = process.env.FBI_API_KEY || process.env.DATA_GOV_API_KEY || 'DEMO_KEY'
const FROM = '01-2023'
const TO = '12-2023'

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(city|town|village|borough|police department|pd|department)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function annualizeRate(monthly: Record<string, number> | undefined) {
  if (!monthly) return null
  const values = Object.values(monthly).filter((value) => Number.isFinite(value) && value >= 0)
  if (!values.length) return null
  const meanMonthly = values.reduce((sum, value) => sum + value, 0) / values.length
  return Number((meanMonthly * 12).toFixed(1))
}

function pickAgency(cityName: string, agencies: Agency[]) {
  const target = normalizeName(cityName)
  const cityAgencies = agencies.filter((agency) => agency.agency_type_name === 'City')
  const scored = cityAgencies
    .map((agency) => {
      const name = normalizeName(agency.agency_name)
      let score = 0
      if (name === target) score = 100
      else if (name.startsWith(`${target} `) || name === `${target}`) score = 80
      else if (name.endsWith(` ${target}`) || name.includes(` ${target} `)) score = 20
      else if (name.includes(target) && target.length >= 5) score = 10
      return { agency, name, score }
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)

  // Prefer exact / prefix matches; avoid "South Houston" winning for "Houston".
  const best = scored[0]
  if (!best) return null
  if (best.score < 80) {
    // Only accept weak includes when no stronger candidate exists and names are close.
    if (best.name !== target && !best.name.startsWith(target)) return null
  }
  return best.agency
}

function pickAgencySeries(rates: Record<string, Record<string, number>>, agencyName: string) {
  const target = normalizeName(agencyName)
  const entries = Object.entries(rates).filter(([key]) => !/clearance/i.test(key))
  const exact = entries.find(([key]) => normalizeName(key).startsWith(target))
  if (exact) return exact[1]
  // Never fall back to state/national series — that silently misattributes rates.
  return null
}

async function fetchOffenseRate(ori: string, agencyName: string, offense: 'violent-crime' | 'property-crime') {
  const url =
    `https://api.usa.gov/crime/fbi/cde/summarized/agency/${ori}/${offense}` +
    `?from=${FROM}&to=${TO}&api_key=${API_KEY}`
  const data = await fetchJson<OffensePayload>(url)
  const rates = data.offenses?.rates ?? {}
  return annualizeRate(pickAgencySeries(rates, agencyName) ?? undefined)
}

function unavailable(
  partial?: Partial<CrimeEnrichment['cities'][string]>,
): CrimeEnrichment['cities'][string] {
  return {
    available: false,
    violent: 0,
    property: 0,
    source: 'data unavailable',
    ...partial,
  }
}

async function main() {
  const seed = loadSeedCities()
  const byState = new Map<string, Agency[]>()
  const cities: CrimeEnrichment['cities'] = {}
  let ok = 0
  let unavailableCount = 0

  const stateCodes = [...new Set(seed.map((city) => city.stateCode))]
  for (const stateCode of stateCodes) {
    let attempts = 0
    while (attempts < 4) {
      attempts += 1
      try {
        const url = `https://api.usa.gov/crime/fbi/cde/agency/byStateAbbr/${stateCode}?api_key=${API_KEY}`
        const payload = await fetchJson<AgencyByState>(url)
        const agencies = Object.values(payload).flat()
        byState.set(stateCode, agencies)
        console.log(`crime agencies ${stateCode}: ${agencies.length}`)
        break
      } catch (error) {
        console.warn(`crime agencies FAIL ${stateCode} (try ${attempts}):`, error)
        byState.set(stateCode, [])
        await sleep(1000 * attempts)
      }
    }
    await sleep(400)
  }

  for (const city of seed) {
    try {
      const agency = pickAgency(city.name, byState.get(city.stateCode) ?? [])
      if (!agency) {
        cities[city.slug] = unavailable()
        unavailableCount += 1
        console.warn(`crime UNAVAILABLE ${city.slug}: no agency match`)
        continue
      }
      await sleep(350)
      const violent = await fetchOffenseRate(agency.ori, agency.agency_name, 'violent-crime')
      await sleep(350)
      const property = await fetchOffenseRate(agency.ori, agency.agency_name, 'property-crime')
      if (violent == null || property == null) {
        cities[city.slug] = unavailable({
          ori: agency.ori,
          agencyName: agency.agency_name,
        })
        unavailableCount += 1
        console.warn(`crime UNAVAILABLE ${city.slug}: empty agency rates`)
        continue
      }
      cities[city.slug] = {
        available: true,
        ori: agency.ori,
        agencyName: agency.agency_name,
        violent,
        property,
        source: `FBI CDE ${agency.agency_name} (${agency.ori}), annualized monthly rates per 100k, 2023`,
      }
      ok += 1
      console.log(`crime OK ${city.slug} v=${violent} p=${property}`)
    } catch (error) {
      cities[city.slug] = unavailable()
      unavailableCount += 1
      console.warn(`crime FAIL ${city.slug}:`, error)
      await sleep(1000)
    }
  }

  const payload: CrimeEnrichment = {
    generatedAt: new Date().toISOString(),
    from: FROM,
    to: TO,
    cities,
  }
  const path = writeEnrichment('crime', payload)
  console.log(`Wrote crime enrichments OK=${ok} unavailable=${unavailableCount} → ${path}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
