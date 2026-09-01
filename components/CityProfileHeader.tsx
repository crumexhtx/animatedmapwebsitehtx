import Image from 'next/image'
import type { ReactNode } from 'react'
import type { CityRecord } from '@/lib/types'
import { resolveCityHero, stateFlagUrl } from '@/lib/city-media'
import { CityFlag } from '@/components/CityFlag'

type Props = {
  city: CityRecord
  title: ReactNode
  actions?: ReactNode
}

export async function CityProfileHeader({ city, title, actions }: Props) {
  const hero = await resolveCityHero(city)

  return (
    <>
      {hero ? (
        <figure className="city-hero-banner">
          <div className="city-hero-banner-photo">
            <Image
              src={hero.url}
              alt={hero.alt}
              fill
              priority
              sizes="(max-width: 1120px) 100vw, 1120px"
            />
          </div>
          {hero.credit ? (
            <figcaption className="city-hero-banner-credit">
              Photo:{' '}
              {hero.creditUrl ? (
                <a href={hero.creditUrl} target="_blank" rel="noreferrer noopener">
                  {hero.credit}
                </a>
              ) : (
                hero.credit
              )}
            </figcaption>
          ) : null}
        </figure>
      ) : null}

      <div className="city-title-row">
        <div className="city-flags" aria-label="City and state flags">
          <img
            className="city-flag city-flag-state"
            src={stateFlagUrl(city.stateCode)}
            alt={`${city.state} flag`}
            width={40}
            height={27}
            loading="eager"
            decoding="async"
          />
          <CityFlag name={city.name} state={city.state} slug={city.slug} />
        </div>
        {title}
        {actions}
      </div>
    </>
  )
}
