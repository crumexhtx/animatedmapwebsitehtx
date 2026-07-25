import Link from 'next/link'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label="MapsToIt home">
      <span className="brand-mark" aria-hidden />
      <span className="brand-word">
        Maps<span>ToIt</span>
      </span>
      {!compact && <span className="brand-tag">City Data</span>}
    </Link>
  )
}
