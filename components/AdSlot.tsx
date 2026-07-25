type AdSlotProps = {
  slotId: string
  label?: string
  size?: 'sidebar' | 'in-content'
}

/** AdSense-ready placeholder — do not load ads until wired. */
export function AdSlot({ slotId, label = 'Advertisement', size = 'sidebar' }: AdSlotProps) {
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
