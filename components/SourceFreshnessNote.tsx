const STALE_TOOLTIP =
  'This source is older than other metrics on this page and may not reflect the same reporting period.'

type Props = {
  label: string
  stale?: boolean
  className?: string
}

/** Inline “as of” date with an info icon when the source vintage is meaningfully stale. */
export function SourceFreshnessNote({ label, stale = false, className = 'source-freshness' }: Props) {
  return (
    <span className={stale ? `${className} source-freshness-stale` : className}>
      {label}
      {stale ? <StaleInfoIcon tip={STALE_TOOLTIP} /> : null}
    </span>
  )
}

export function StaleInfoIcon({ tip }: { tip: string }) {
  return (
    <span
      className="source-freshness-info"
      role="img"
      tabIndex={0}
      aria-label={tip}
      title={tip}
    >
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden focusable="false">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path
          fill="currentColor"
          d="M7.25 7h1.5V11h-1.5V7zm0-3h1.5v1.5H7.25V4z"
        />
      </svg>
    </span>
  )
}

export { STALE_TOOLTIP }
