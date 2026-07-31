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
        <Link href="/cities">All cities</Link>
        <Link href="/cities/rankings">Rankings</Link>
        <Link href="/cities/cost-vs-safety">Cost vs safety</Link>
        <Link href="/cities/state-costs">State costs</Link>
        <Link href="/compare">Compare cities</Link>
        <Link href="/methodology">Data sources</Link>
        <Link href="/about">About</Link>
        <Link href="/contact">Contact</Link>
      </div>
      <p className="footer-note">
        Figures compile Census ACS, BLS LAUS, FBI CDE, and NOAA normals for research — see methodology for citations and
        coverage gaps. Curated comparisons:{' '}
        <Link href="/compare/austin-tx-vs-denver-co">Austin vs Denver</Link>
        {', '}
        <Link href="/compare/new-york-ny-vs-chicago-il">NYC vs Chicago</Link>
        {', '}
        <Link href="/compare">more pairs</Link>.
      </p>
    </footer>
  )
}
