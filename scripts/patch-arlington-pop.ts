/**
 * Patch Arlington VA population history from county PEP (CDP is coterminous
 * with Arlington County; city/town PEP files omit it as SUMLEV 162).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

function parseCsvLine(line: string) {
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (ch === ',' && !inQuotes) {
      cells.push(current)
      current = ''
      continue
    }
    current += ch
  }
  cells.push(current)
  return cells
}

function loadCounty(
  path: string,
  state: string,
  county: string,
  yearCols: Array<[number, string]>,
) {
  const text = readFileSync(path, 'utf8')
  const lines = text.split(/\r?\n/).filter(Boolean)
  const header = parseCsvLine(lines[0])
  const col = Object.fromEntries(header.map((h, i) => [h, i]))
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line)
    if (cells[col.STATE] !== state || cells[col.COUNTY] !== county) continue
    if (cells[col.SUMLEV] && cells[col.SUMLEV] !== '050') continue
    const points: Array<{ year: number; population: number }> = []
    for (const [year, key] of yearCols) {
      const value = Number(cells[col[key]])
      if (Number.isFinite(value) && value > 0) points.push({ year, population: Math.round(value) })
    }
    return points
  }
  return []
}

const fbi = join('data', 'raw', 'cache', 'fbi')
const legacy = loadCounty(
  join(fbi, 'co-est2019-alldata.csv'),
  '51',
  '013',
  [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019].map((y) => [y, `POPESTIMATE${y}`]),
)
const current = loadCounty(
  join(fbi, 'co-est2024-alldata.csv'),
  '51',
  '013',
  [2020, 2021, 2022, 2023, 2024].map((y) => [y, `POPESTIMATE${y}`]),
)
const points = [...legacy.filter((p) => p.year < 2020), ...current].sort((a, b) => a.year - b.year)
if (points.length < 2) {
  console.error('Failed to load Arlington County PEP points')
  process.exit(1)
}

const histPath = join('data', 'raw', 'enrichments', 'population-history.json')
const hist = JSON.parse(readFileSync(histPath, 'utf8')) as {
  generatedAt: string
  cities: Record<string, { points: Array<{ year: number; population: number }>; source: string }>
}
hist.cities['arlington-va'] = {
  points,
  source: `U.S. Census Bureau PEP county estimates for Arlington County, VA (CDP coterminous; ${points[0].year}–${points.at(-1)!.year})`,
}
hist.generatedAt = new Date().toISOString()
writeFileSync(histPath, JSON.stringify(hist, null, 2))
console.log(
  `Patched arlington-va (${points.length} points, ${points[0].population}→${points.at(-1)!.population}). Cities: ${Object.keys(hist.cities).length}`,
)
