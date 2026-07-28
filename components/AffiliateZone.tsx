type AffiliatePartner = {
  href: string
  label: string
}

type AffiliateZoneProps = {
  category: 'moving' | 'renters-insurance' | 'real-estate'
  cityName: string
}

const copy: Record<AffiliateZoneProps['category'], { title: string }> = {
  moving: { title: 'Moving companies' },
  'renters-insurance': { title: 'Renters insurance' },
  'real-estate': { title: 'Homes & rentals' },
}

/** Populated when live affiliate offers are ready. Empty categories render nothing. */
const partnersByCategory: Record<AffiliateZoneProps['category'], AffiliatePartner[]> = {
  moving: [],
  'renters-insurance': [],
  'real-estate': [],
}

/** Clearly marked affiliate placement — only shown when partner links are live. */
export function AffiliateZone({ category, cityName }: AffiliateZoneProps) {
  const partners = partnersByCategory[category]
  if (!partners.length) return null

  const item = copy[category]
  return (
    <section className="affiliate-zone" data-affiliate-category={category}>
      <p className="affiliate-kicker">Partner links · {cityName}</p>
      <h2>{item.title}</h2>
      <ul className="affiliate-list">
        {partners.map((partner) => (
          <li key={partner.href}>
            <a href={partner.href} rel="sponsored noopener noreferrer" target="_blank">
              {partner.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
