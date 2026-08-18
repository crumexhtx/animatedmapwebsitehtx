import Link from 'next/link'
import { Brand } from '@/components/Brand'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <Brand compact />
        <p>U.S. city data for movers, job relocators, and place comparisons.</p>
      </div>
      <div className="footer-links">
        <Link href="/cities" prefetch={false}>All cities</Link>
        <Link href="/cities/rankings" prefetch={false}>Rankings</Link>
        <Link href="/cities/cost-vs-safety" prefetch={false}>Cost vs safety</Link>
        <Link href="/cities/state-costs" prefetch={false}>State costs</Link>
        <Link href="/cities/population-over-time" prefetch={false}>Population over time</Link>
        <Link href="/compare" prefetch={false}>Compare cities</Link>
        <Link href="/methodology" prefetch={false}>Data sources</Link>
        <Link href="/about" prefetch={false}>About</Link>
        <Link href="/contact" prefetch={false}>Contact</Link>
      </div>
      <p className="footer-note">
        Figures compile Census ACS, BLS LAUS, FBI CDE, and NOAA normals for research — see methodology for citations and
        coverage gaps. Curated comparisons:{' '}
        <Link href="/compare/austin-tx-vs-denver-co" prefetch={false}>Austin vs Denver</Link>
        {', '}
        <Link href="/compare/new-york-ny-vs-chicago-il" prefetch={false}>NYC vs Chicago</Link>
        {', '}
        <Link href="/compare" prefetch={false}>more pairs</Link>.
      </p>
    </footer>
  )
}
