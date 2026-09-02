import Link from 'next/link'

const links = [
  { href: '/cities', label: 'Cities' },
  { href: '/cities/rankings', label: 'Rankings' },
  { href: '/afford', label: 'Find a city' },
  { href: '/cities/cost-vs-safety', label: 'Cost vs safety' },
  { href: '/cities/state-costs', label: 'State costs' },
  { href: '/cities/population-over-time', label: 'Population over time' },
  { href: '/compare', label: 'Compare' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

export function SiteNav() {
  return (
    <details className="site-nav-menu">
      <summary className="nav-toggle">
        <span className="nav-toggle-bars" aria-hidden />
        Menu
      </summary>
      <nav id="primary-nav" className="site-nav" aria-label="Primary">
        {links.map((link) => (
          <Link key={link.href} href={link.href} prefetch={false}>
            {link.label}
          </Link>
        ))}
      </nav>
    </details>
  )
}
