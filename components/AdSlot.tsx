type AdSlotProps = {
  slotId: string
  label?: string
  size?: 'sidebar' | 'in-content'
}

/** Flip to true to bring ad slots back — every call site stays as-is either way. */
const ADS_ENABLED = false

/** AdSense-ready placeholder — do not load ads until wired. */
export function AdSlot({ slotId, label = 'Advertisement', size = 'sidebar' }: AdSlotProps) {
  if (!ADS_ENABLED) return null

  return (
    <aside
      className={`ad-slot ad-slot-${size}`}
      data-ad-slot={slotId}
      aria-label={label}
    >
      <span className="ad-slot-label">{label}</span>
      <div className="ad-slot-frame" />
    </aside>
  )
}
