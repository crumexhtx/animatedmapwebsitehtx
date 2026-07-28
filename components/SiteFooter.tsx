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
        <Link href="/compare">Compare cities</Link>
        <Link href="/methodology">Data sources</Link>
        <Link href="/about">About</Link>
        <Link href="/contact">Contact</Link>
      </div>
      <p className="footer-note">
        Figures compile Census ACS, BLS LAUS, FBI CDE, and NOAA normals for research — see methodology for citations and
        coverage gaps.
      </p>
    </footer>
  )
}
