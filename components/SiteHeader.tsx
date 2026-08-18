import { Brand } from '@/components/Brand'
import { SiteNav } from '@/components/SiteNav'
import { catalogIndex } from '@/lib/catalog-index'

export function SiteHeader() {
  return (
    <header className="site-header">
      <Brand />
      <p className="header-stat">
        <strong>{catalogIndex.cityCount}</strong>
        <span>U.S. cities mapped</span>
      </p>
      <SiteNav />
    </header>
  )
}
