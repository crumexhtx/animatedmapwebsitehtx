import Image from 'next/image'
import type { CityImage } from '@/lib/types'

export function CityGallery({
  images,
  cityName,
  skipFirst = false,
}: {
  images?: CityImage[]
  cityName: string
  /** Omit the first photo when it is already shown in the profile hero. */
  skipFirst?: boolean
}) {
  const gallery = skipFirst ? images?.slice(1) : images
  if (!gallery || gallery.length === 0) return null

  return (
    <section className="city-gallery" aria-label={`Photos of ${cityName}`}>
      <div className="city-gallery-grid">
        {gallery.slice(0, 2).map((image) => (
          <figure key={image.url} className="city-gallery-item">
            <div className="city-gallery-photo">
              <Image src={image.url} alt={image.alt} fill sizes="(max-width: 560px) 100vw, 50vw" />
            </div>
            <figcaption>
              Photo:{' '}
              <a href={image.creditUrl} target="_blank" rel="noreferrer noopener">
                {image.credit}
              </a>{' '}
              on Unsplash
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
