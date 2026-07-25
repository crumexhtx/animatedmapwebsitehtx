import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contact the MapsToIt team about data corrections, partnerships, or city coverage requests.',
  alternates: { canonical: '/contact' },
}

export default function ContactPage() {
  return (
    <article className="content-page">
      <h1>Contact</h1>
      <p className="lead">
        Questions about a city profile, partnership interest, or a metro you want added next?
      </p>
      <p>
        Email <a href="mailto:hello@mapstoit.com">hello@mapstoit.com</a> and include the city slug if you are reporting
        a data issue.
      </p>
    </article>
  )
}
