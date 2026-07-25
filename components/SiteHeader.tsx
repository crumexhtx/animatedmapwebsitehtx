import Link from 'next/link'
import { Brand } from '@/components/Brand'
import { catalogIndex } from '@/lib/catalog'

const links = [
  { href: '/cities', label: 'Cities' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

export function SiteHeader() {
  return (
    <header className="site-header">
      <Brand />
      <p className="header-stat">
        <strong>{catalogIndex.cityCount}</strong>
        <span>U.S. cities mapped</span>
      </p>
      <nav className="site-nav" aria-label="Primary">
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
