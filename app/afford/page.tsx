import type { Metadata } from 'next'
import Link from 'next/link'
import { AffordWorkspace } from '@/components/AffordWorkspace'
import { allCities } from '@/lib/catalog'
import { parseAffordFilters } from '@/lib/afford'

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function hasBudgetParam(params: Record<string, string | string[] | undefined>) {
  const raw = params.budget
  const value = Array.isArray(raw) ? raw[0] : raw
  return Boolean(value && value.length > 0)
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams
  const queried = hasBudgetParam(params)
  return {
    title: 'What Can I Afford? — Find U.S. Cities by Budget | MapsToIt',
    description:
      'Enter your rent or home-buying budget and filter 205 U.S. cities by crime, walk score, commute, climate, and income. Live results with shareable search links.',
    alternates: { canonical: '/afford' },
    ...(queried ? { robots: { index: false, follow: true } } : {}),
  }
}

export default async function AffordPage({ searchParams }: Props) {
  const params = await searchParams
  const initialFilters = parseAffordFilters(params)

  return (
    <article className="section">
      <div className="page-hero">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/cities">Cities</Link>
          <span>/</span>
          <span>Find a city</span>
        </nav>
        <h1>What can I afford?</h1>
        <p className="lead">
          Enter your housing budget and optional lifestyle filters — MapsToIt searches all {allCities.length} mapped
          cities instantly and ranks matches by how close they fit your budget, safety preferences, walkability, and
          commute.
        </p>
      </div>

      <section className="answer-section" aria-labelledby="afford-tool">
        <h2 id="afford-tool">Affordability finder</h2>
        <p className="answer-lead">
          Results update live as you move sliders. Median rent and home values come from Census ACS city limits — use
          them as planning benchmarks, not personalized quotes.
        </p>
        <AffordWorkspace cities={allCities} initialFilters={initialFilters} />
      </section>
    </article>
  )
}
