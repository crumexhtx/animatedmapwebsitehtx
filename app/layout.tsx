import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'
import { siteUrl } from '@/lib/catalog'
import './globals.css'

const GA_MEASUREMENT_ID = 'G-MXMYV30T6F'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: '🗺️ Explore U.S. Cities — Cost of Living, Housing & Safety Data',
    template: '%s | MapsToIt',
  },
  description:
    'Compare cost of living, housing prices, income, safety, climate, and commute across U.S. cities before you move — browse an interactive map, then dig into full relocation profiles.',
  openGraph: {
    title: '🗺️ Explore U.S. Cities — Cost of Living, Housing & Safety Data',
    description:
      'Compare cost of living, housing prices, income, safety, climate, and commute across U.S. cities before you move.',
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
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </head>
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
