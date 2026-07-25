type AffiliateZoneProps = {
  category: 'moving' | 'renters-insurance' | 'real-estate'
  cityName: string
}

const copy: Record<AffiliateZoneProps['category'], { title: string; body: string }> = {
  moving: {
    title: 'Moving companies',
    body: 'Compare movers when you are ready to relocate — affiliate partners will appear here.',
  },
  'renters-insurance': {
    title: 'Renters insurance',
    body: 'Coverage options for new leases will be listed in this zone.',
  },
  'real-estate': {
    title: 'Homes & rentals',
    body: 'Real-estate and rental listings partners will plug into this placement.',
  },
}

/** Clearly marked affiliate placement — wire offers later. */
export function AffiliateZone({ category, cityName }: AffiliateZoneProps) {
  const item = copy[category]
  return (
    <section className="affiliate-zone" data-affiliate-category={category}>
      <p className="affiliate-kicker">Partner links · {cityName}</p>
      <h2>{item.title}</h2>
      <p>{item.body}</p>
    </section>
  )
}
