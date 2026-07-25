import type { Metadata, Viewport } from 'next'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'
import { siteUrl } from '@/lib/catalog'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'MapsToIt — U.S. City Data Explorer',
    template: '%s | MapsToIt',
  },
  description:
    'Research U.S. cities before you move — cost of living, income, housing, safety, climate, and commute data with an interactive map.',
  openGraph: {
    siteName: 'MapsToIt',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0f6b5c',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  )
}
