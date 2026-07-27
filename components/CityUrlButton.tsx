'use client'

import { useState } from 'react'

/** Link / URL icon control — copies the city page URL for sharing. */
export function CityUrlButton({ url, label }: { url: string; label: string }) {
  const [copied, setCopied] = useState(false)

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt('Copy this city URL:', url)
    }
  }

  return (
    <button
      type="button"
      className="city-url-button"
      onClick={onCopy}
      aria-label={copied ? 'City URL copied' : `Copy URL for ${label}`}
      title={copied ? 'Copied!' : 'Copy page URL'}
    >
      <svg className="city-url-icon" viewBox="0 0 24 24" aria-hidden width="18" height="18">
        <path
          fill="currentColor"
          d="M10.6 13.4a1 1 0 0 1 0-1.4l2.1-2.1a3.2 3.2 0 1 1 4.5 4.5l-1.2 1.2a1 1 0 1 1-1.4-1.4l1.2-1.2a1.2 1.2 0 1 0-1.7-1.7l-2.1 2.1a1 1 0 0 1-1.4 0Zm2.8-2.8a1 1 0 0 1 0 1.4l-2.1 2.1a3.2 3.2 0 1 1-4.5-4.5l1.2-1.2a1 1 0 0 1 1.4 1.4L7.2 11a1.2 1.2 0 1 0 1.7 1.7l2.1-2.1a1 1 0 0 1 1.4 0Z"
        />
      </svg>
      <span>{copied ? 'Copied' : 'URL'}</span>
    </button>
  )
}
