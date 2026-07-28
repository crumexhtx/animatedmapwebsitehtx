import type { Metadata } from 'next'
import Link from 'next/link'
import { CompareCities } from '@/components/CompareCities'
import { allCities, nationalBaselines } from '@/lib/catalog'
import { parseCompareSlugs } from '@/lib/compare'

export const metadata: Metadata = {
  title: 'Compare cities',
  description:
    'Compare MapsToIt city profiles side by side — income, housing, crime, climate, and commute versus U.S. baselines.',
  alternates: { canonical: '/compare' },
}

type Props = {
  searchParams: Promise<{ cities?: string | string[]; a?: string; b?: string; c?: string }>
}

export default async function ComparePage({ searchParams }: Props) {
  const params = await searchParams
  const fromQuery =
    parseCompareSlugs(params.cities).length > 0
      ? parseCompareSlugs(params.cities)
      : parseCompareSlugs([params.a, params.b, params.c].filter(Boolean).join(','))

  return (
    <article className="section">
      <div className="page-hero">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/cities">Cities</Link>
          <span>/</span>
          <span>Compare</span>
        </nav>
        <h1>Compare cities</h1>
        <p className="lead">
          Relocators rarely weigh one place in isolation. Pick two or three MapsToIt cities and review income,
          housing, safety, and climate side by side against U.S. baselines.
        </p>
      </div>

      <CompareCities cities={allCities} national={nationalBaselines} initialSlugs={fromQuery} />
    </article>
  )
}
