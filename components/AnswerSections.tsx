import type { AnswerSection } from '@/lib/snapshot'

/** Answer-first question H2s — fully server-rendered for AI Overview citability. */
export function AnswerSections({ sections }: { sections: AnswerSection[] }) {
  if (!sections.length) return null

  return (
    <div className="answer-sections">
      {sections.map((section) => (
        <section key={section.heading} className="answer-section">
          <h2>{section.heading}</h2>
          <p className="answer-lead">{section.answer}</p>
          {section.bullets?.length ? (
            <ul className="answer-bullets">
              {section.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  )
}
