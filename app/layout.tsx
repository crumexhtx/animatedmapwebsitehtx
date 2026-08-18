import type { Metadata, Viewport } from 'next'
import { Fraunces, Outfit } from 'next/font/google'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'
import { siteUrl } from '@/lib/paths'
import './globals.css'

const GA_MEASUREMENT_ID = 'G-MXMYV30T6F'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['500', '700'],
  display: 'swap',
  variable: '--font-fraunces',
})

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '600'],
  display: 'swap',
  variable: '--font-outfit',
})

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
    <html lang="en" className={`${fraunces.variable} ${outfit.variable}`}>
      <body>
        <div className="shell">
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var id = '${GA_MEASUREMENT_ID}';
                var loaded = false;
                function load() {
                  if (loaded) return;
                  loaded = true;
                  window.dataLayer = window.dataLayer || [];
                  window.gtag = function gtag(){ window.dataLayer.push(arguments); };
                  window.gtag('js', new Date());
                  window.gtag('config', id);
                  var s = document.createElement('script');
                  s.async = true;
                  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
                  document.head.appendChild(s);
                }
                ['pointerdown', 'keydown', 'scroll'].forEach(function (event) {
                  window.addEventListener(event, load, { once: true, passive: true });
                });
              })();
            `,
          }}
        />
      </body>
    </html>
  )
}
