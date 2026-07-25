import { ArrowUpRight, ExternalLink, Mail } from 'lucide-react'

export function ContactPage() {
  return (
    <article className="content-page contact-page">
      <span className="panel-kicker"><Mail size={14} /> CONTACT</span>
      <h1>Let’s map<br /><em>something useful.</em></h1>
      <p className="page-lead">
        Found a data issue, have a dataset suggestion, or want to contribute a new country view? Open a discussion in the project repository.
      </p>
      <div className="contact-actions">
        <a href="https://github.com/crumexhtx/animatedmapwebsitehtx/issues/new" target="_blank" rel="noreferrer">
          <span><b>Report or suggest</b><small>Open a GitHub issue</small></span>
          <ArrowUpRight size={18} />
        </a>
        <a href="https://github.com/crumexhtx/animatedmapwebsitehtx" target="_blank" rel="noreferrer">
          <span><b>View the project</b><small>Source code and updates</small></span>
          <ExternalLink size={18} />
        </a>
      </div>
    </article>
  )
}
