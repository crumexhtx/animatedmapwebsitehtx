/**
 * Pull violent/property offense rates from FBI Crime Data Explorer when the
 * api.usa.gov gateway is healthy. Falls back to FBI CIUS Table 8 (city offenses
 * known to law enforcement) so we never silently keep seed placeholders.
 *
 * Cities without a usable match are flagged source: "data unavailable".
 *
 * Output: data/raw/enrichments/crime.json
 */

import { createWriteStream, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { fetchJson, loadSeedCities, sleep, writeEnrichment, ROOT } from './lib/io'

type Agency = {
  ori: string
  agency_name: string
  agency_type_name?: string
  agency_type?: string
  latitude?: number | null
  longitude?: number | null
}

type AgencyByState = Record<string, Agency[]>

type OffensePayload = {
  offenses?: {
    rates?: Record<string, Record<string, number>>
  }
}

type Table8Row = {
  state: string
  stateCode: string
  city: string
  population: number
  violent: number
  property: number
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
const CACHE_DIR = join(ROOT, 'data', 'raw', 'cache', 'fbi')
const TABLE8_URL =
  'https://ucr.fbi.gov/crime-in-the-u.s/2019/crime-in-the-u.s.-2019/tables/table-8/table-8.xls'
const TABLE8_PATH = join(CACHE_DIR, 'cius-table8-2019.xls')
const AGENCIES_URL =
  'https://raw.githubusercontent.com/rfordatascience/tidytuesday/main/data/2025/2025-02-18/agencies.csv'
const AGENCIES_PATH = join(CACHE_DIR, 'agencies-tidytuesday.csv')

const STATE_NAME_TO_CODE: Record<string, string> = {
  ALABAMA: 'AL',
  ALASKA: 'AK',
  ARIZONA: 'AZ',
  ARKANSAS: 'AR',
  CALIFORNIA: 'CA',
  COLORADO: 'CO',
  CONNECTICUT: 'CT',
  DELAWARE: 'DE',
  'DISTRICT OF COLUMBIA': 'DC',
  FLORIDA: 'FL',
  GEORGIA: 'GA',
  HAWAII: 'HI',
  IDAHO: 'ID',
  ILLINOIS: 'IL',
  INDIANA: 'IN',
  IOWA: 'IA',
  KANSAS: 'KS',
  KENTUCKY: 'KY',
  LOUISIANA: 'LA',
  MAINE: 'ME',
  MARYLAND: 'MD',
  MASSACHUSETTS: 'MA',
  MICHIGAN: 'MI',
  MINNESOTA: 'MN',
  MISSISSIPPI: 'MS',
  MISSOURI: 'MO',
  MONTANA: 'MT',
  NEBRASKA: 'NE',
  NEVADA: 'NV',
  'NEW HAMPSHIRE': 'NH',
  'NEW JERSEY': 'NJ',
  'NEW MEXICO': 'NM',
  'NEW YORK': 'NY',
  'NORTH CAROLINA': 'NC',
  'NORTH DAKOTA': 'ND',
  OHIO: 'OH',
  OKLAHOMA: 'OK',
  OREGON: 'OR',
  PENNSYLVANIA: 'PA',
  'RHODE ISLAND': 'RI',
  'SOUTH CAROLINA': 'SC',
  'SOUTH DAKOTA': 'SD',
  TENNESSEE: 'TN',
  TEXAS: 'TX',
  UTAH: 'UT',
  VERMONT: 'VT',
  VIRGINIA: 'VA',
  WASHINGTON: 'WA',
  'WEST VIRGINIA': 'WV',
  WISCONSIN: 'WI',
  WYOMING: 'WY',
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(city|town|village|borough|police department|pd|department|metro government|balance)\b/g, '')
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
  const cityAgencies = agencies.filter((agency) => {
    const type = agency.agency_type_name ?? agency.agency_type ?? ''
    return /city/i.test(type)
  })
  const scored = cityAgencies
    .map((agency) => {
      const name = normalizeName(agency.agency_name)
      let score = 0
      if (name === target) score = 100
      else if (name.startsWith(`${target} `)) score = 80
      else if (name.includes(target) && target.length >= 5) score = 10
      return { agency, name, score }
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)

  const best = scored[0]
  if (!best || best.score < 80) return null
  return best.agency
}

function pickAgencySeries(rates: Record<string, Record<string, number>>, agencyName: string) {
  const target = normalizeName(agencyName)
  const entries = Object.entries(rates).filter(([key]) => !/clearance/i.test(key))
  const exact = entries.find(([key]) => normalizeName(key).startsWith(target))
  return exact?.[1] ?? null
}

async function downloadFile(url: string, dest: string) {
  if (existsSync(dest)) {
    console.log(`cache hit ${dest}`)
    return
  }
  mkdirSync(CACHE_DIR, { recursive: true })
  console.log(`downloading ${url}`)
  const response = await fetch(url, {
    headers: { 'User-Agent': 'MapsToItCatalogBot/1.0 (research; contact hello@mapstoit.com)' },
  })
  if (!response.ok || !response.body) throw new Error(`download failed ${response.status} ${url}`)
  await pipeline(Readable.fromWeb(response.body as never), createWriteStream(dest))
}

function loadTable8(path: string): Table8Row[] {
  const py = `
import json, xlrd, re, sys
book = xlrd.open_workbook(${JSON.stringify(path)})
sh = book.sheet_by_index(0)
state = ''
rows = []
STATE_MAP = ${JSON.stringify(STATE_NAME_TO_CODE)}

def clean_city(name: str) -> str:
    # Strip footnote markers like Boston5,6 / Albuquerque4
    name = re.sub(r'\\d+(,\\d+)*$', '', name).strip()
    name = re.sub(r',+$', '', name).strip()
    return name

for r in range(4, sh.nrows):
    raw_state = str(sh.cell_value(r, 0)).strip()
    city = clean_city(str(sh.cell_value(r, 1)).strip())
    if not city:
        continue
    if raw_state:
        state = re.sub(r'\\d+$', '', raw_state).strip().upper()
    pop = sh.cell_value(r, 2)
    violent = sh.cell_value(r, 3)
    prop = sh.cell_value(r, 8)
    try:
        pop = float(pop); violent = float(violent); prop = float(prop)
    except Exception:
        continue
    if pop <= 0:
        continue
    code = STATE_MAP.get(state)
    if not code:
        continue
    rows.append({
        'state': state.title(),
        'stateCode': code,
        'city': city,
        'population': pop,
        'violent': violent,
        'property': prop,
    })
print(json.dumps(rows))
`
  const result = spawnSync('python3', ['-c', py], { encoding: 'utf8', maxBuffer: 50_000_000 })
  if (result.status !== 0) {
    throw new Error(`Table 8 parse failed: ${result.stderr || result.stdout}`)
  }
  return JSON.parse(result.stdout) as Table8Row[]
}

const TABLE8_ALIASES: Record<string, string[]> = {
  'nashville-tn': ['metropolitan nashville police department', 'nashville'],
  'st-louis-mo': ['st louis', 'saint louis'],
  'saint-paul-mn': ['st paul', 'saint paul'],
  'st-petersburg-fl': ['st petersburg', 'saint petersburg'],
  'winston-salem-nc': ['winston salem'],
}

function matchTable8(cityName: string, stateCode: string, slug: string, rows: Table8Row[]) {
  const aliases = TABLE8_ALIASES[slug] ?? [normalizeName(cityName)]
  const targets = new Set([normalizeName(cityName), ...aliases.map(normalizeName)])
  const candidates = rows.filter((row) => row.stateCode === stateCode)
  const exact = candidates.find((row) => targets.has(normalizeName(row.city)))
  if (exact) return exact
  return (
    candidates.find((row) => {
      const name = normalizeName(row.city)
      return [...targets].some((target) => name === target || name.startsWith(`${target} `))
    }) ?? null
  )
}

function ratePer100k(count: number, population: number) {
  return Number(((count / population) * 100000).toFixed(1))
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

async function fetchOffenseRate(ori: string, agencyName: string, offense: 'violent-crime' | 'property-crime') {
  const url =
    `https://api.usa.gov/crime/fbi/cde/summarized/agency/${ori}/${offense}` +
    `?from=${FROM}&to=${TO}&api_key=${API_KEY}`
  const data = await fetchJson<OffensePayload>(url)
  const rates = data.offenses?.rates ?? {}
  return annualizeRate(pickAgencySeries(rates, agencyName) ?? undefined)
}

function loadAgenciesCsv(path: string): Map<string, Agency[]> {
  const text = require('node:fs').readFileSync(path, 'utf8') as string
  const lines = text.trim().split(/\r?\n/)
  const header = parseCsvLine(lines[0])
  const idx = (name: string) => header.indexOf(name)
  const byState = new Map<string, Agency[]>()
  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line)
    const state = cols[idx('state_abbr')]
    if (!state) continue
    const agency: Agency = {
      ori: cols[idx('ori')],
      agency_name: cols[idx('agency_name')],
      agency_type: cols[idx('agency_type')],
      latitude: Number(cols[idx('latitude')]) || null,
      longitude: Number(cols[idx('longitude')]) || null,
    }
    const list = byState.get(state) ?? []
    list.push(agency)
    byState.set(state, list)
  }
  return byState
}

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i += 1
        } else {
          quoted = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === ',') {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}

async function tryLiveApi(seed: ReturnType<typeof loadSeedCities>) {
  const byState = new Map<string, Agency[]>()
  const stateCodes = [...new Set(seed.map((city) => city.stateCode))]
  let healthy = 0
  for (const stateCode of stateCodes.slice(0, 3)) {
    try {
      const url = `https://api.usa.gov/crime/fbi/cde/agency/byStateAbbr/${stateCode}?api_key=${API_KEY}`
      const payload = await fetchJson<AgencyByState>(url)
      byState.set(stateCode, Object.values(payload).flat())
      healthy += 1
    } catch (error) {
      console.warn(`crime API probe FAIL ${stateCode}:`, error)
    }
  }
  if (healthy === 0) return null

  for (const stateCode of stateCodes) {
    if (byState.has(stateCode)) continue
    try {
      const url = `https://api.usa.gov/crime/fbi/cde/agency/byStateAbbr/${stateCode}?api_key=${API_KEY}`
      const payload = await fetchJson<AgencyByState>(url)
      byState.set(stateCode, Object.values(payload).flat())
      console.log(`crime agencies ${stateCode}: ${byState.get(stateCode)?.length}`)
    } catch (error) {
      console.warn(`crime agencies FAIL ${stateCode}:`, error)
      byState.set(stateCode, [])
    }
    await sleep(300)
  }
  return byState
}

async function main() {
  mkdirSync(CACHE_DIR, { recursive: true })
  const seed = loadSeedCities()
  const cities: CrimeEnrichment['cities'] = {}
  let ok = 0
  let unavailableCount = 0
  let mode: 'cde-api' | 'cius-table8' = 'cius-table8'

  const live = await tryLiveApi(seed)
  if (live) {
    mode = 'cde-api'
    console.log('Using live FBI CDE API')
    for (const city of seed) {
      try {
        const agency = pickAgency(city.name, live.get(city.stateCode) ?? [])
        if (!agency) {
          cities[city.slug] = unavailable()
          unavailableCount += 1
          continue
        }
        await sleep(300)
        const violent = await fetchOffenseRate(agency.ori, agency.agency_name, 'violent-crime')
        await sleep(300)
        const property = await fetchOffenseRate(agency.ori, agency.agency_name, 'property-crime')
        if (violent == null || property == null) {
          cities[city.slug] = unavailable({ ori: agency.ori, agencyName: agency.agency_name })
          unavailableCount += 1
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
      }
    }
  } else {
    console.warn('FBI CDE API gateway unavailable — falling back to CIUS Table 8 (2019)')
    await downloadFile(TABLE8_URL, TABLE8_PATH)
    await downloadFile(AGENCIES_URL, AGENCIES_PATH)
    const table8 = loadTable8(TABLE8_PATH)
    const agencies = loadAgenciesCsv(AGENCIES_PATH)
    console.log(`Loaded Table 8 rows=${table8.length}, agency states=${agencies.size}`)

    for (const city of seed) {
      const row = matchTable8(city.name, city.stateCode, city.slug, table8)
      if (!row || row.violent < 0 || row.property < 0) {
        cities[city.slug] = unavailable()
        unavailableCount += 1
        console.warn(`crime UNAVAILABLE ${city.slug}: no Table 8 match`)
        continue
      }
      const agency = pickAgency(city.name, agencies.get(city.stateCode) ?? [])
      const violent = ratePer100k(row.violent, row.population)
      const property = ratePer100k(row.property, row.population)
      cities[city.slug] = {
        available: true,
        ori: agency?.ori,
        agencyName: agency?.agency_name ?? `${city.name} (CIUS Table 8)`,
        violent,
        property,
        source:
          `FBI CIUS Table 8 (2019) city offenses known to law enforcement` +
          ` — rates per 100k; CDE API unavailable at enrich time`,
      }
      ok += 1
      console.log(`crime OK ${city.slug} (table8) v=${violent} p=${property}`)
    }
  }

  const payload: CrimeEnrichment = {
    generatedAt: new Date().toISOString(),
    from: mode === 'cde-api' ? FROM : '2019',
    to: mode === 'cde-api' ? TO : '2019',
    cities,
  }
  const path = writeEnrichment('crime', payload)
  console.log(`Wrote crime enrichments mode=${mode} OK=${ok} unavailable=${unavailableCount} → ${path}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
