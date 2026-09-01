'use client'

import { useMemo, useState } from 'react'
import { cityFlagCandidates } from '@/lib/city-media'

type Props = {
  name: string
  state: string
  slug: string
}

/** Tries Wikimedia city-flag filenames until one loads; hidden when none exist. */
export function CityFlag({ name, state, slug }: Props) {
  const candidates = useMemo(() => cityFlagCandidates({ name, state, slug }), [name, state, slug])
  const [index, setIndex] = useState(0)

  if (index >= candidates.length) return null

  return (
    <img
      className="city-flag city-flag-city"
      src={candidates[index]}
      alt={`${name} city flag`}
      width={40}
      height={27}
      loading="lazy"
      decoding="async"
      onError={() => setIndex((value) => value + 1)}
    />
  )
}
