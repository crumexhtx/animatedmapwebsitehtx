'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Brand } from '@/components/Brand'
import { catalogIndex } from '@/lib/catalog'

const links = [
  { href: '/cities', label: 'Cities' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    document.body.classList.toggle('nav-open', open)
    return () => document.body.classList.remove('nav-open')
  }, [open])

  return (
    <header className="site-header">
      <Brand />
      <p className="header-stat">
        <strong>{catalogIndex.cityCount}</strong>
        <span>U.S. cities mapped</span>
      </p>
      <button
        type="button"
        className="nav-toggle"
        aria-expanded={open}
        aria-controls="primary-nav"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="nav-toggle-bars" aria-hidden />
        {open ? 'Close' : 'Menu'}
      </button>
      <nav
        id="primary-nav"
        className={`site-nav ${open ? 'is-open' : ''}`}
        aria-label="Primary"
      >
        {links.map((link) => (
          <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
