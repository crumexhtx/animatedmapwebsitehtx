import { parseVintageYear } from '@/lib/source-freshness'

export type CrimeSourceKind = 'unavailable' | 'curated' | 'cius' | 'cde'

export function crimeSourceKind(source?: string | null): CrimeSourceKind {
  if (!source || source === 'data unavailable') return 'unavailable'
  if (source.includes('curated')) return 'curated'
  if (/CIUS|Table 8/i.test(source)) return 'cius'
  return 'cde'
}

export function isFbiVerifiedCrime(source?: string | null) {
  const kind = crimeSourceKind(source)
  return kind === 'cius' || kind === 'cde'
}

/** Public-facing source label — no pipeline diagnostics. */
export function publicCrimeSource(source: string): string {
  if (source === 'data unavailable') return source
  if (source.includes('curated')) return source

  const year = parseVintageYear(source)
  if (/CIUS|Table 8/i.test(source)) {
    return `FBI CIUS Table 8 (${year ?? 2019}), city offenses per 100k`
  }

  const cleaned = source
    .replace(/\s*;\s*CDE API unavailable at enrich time\.?/i, '')
    .replace(/\s*—\s*CDE API unavailable at enrich time\.?/i, '')
    .trim()
  return cleaned
}

export function crimeRateNote(source?: string | null) {
  const kind = crimeSourceKind(source)
  if (kind === 'unavailable') return 'FBI data gap'
  if (kind === 'curated') return 'launch estimate, not FBI-verified yet'
  if (kind === 'cius') return 'per 100k · citywide'
  return 'annualized per 100k · citywide'
}

export function crimeAgencyPhrase(source?: string | null) {
  const kind = crimeSourceKind(source)
  if (kind === 'cius') return 'FBI CIUS Table 8'
  if (kind === 'cde') return 'FBI Crime Data Explorer'
  return 'FBI'
}
