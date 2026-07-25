import { Info } from 'lucide-react'

export function AboutPage() {
  return (
    <article className="content-page">
      <span className="panel-kicker"><Info size={14} /> ABOUT MAPSTOIT</span>
      <h1>Geospatial data,<br /><em>made visible.</em></h1>
      <p className="page-lead">
        mapstoit is an interactive demo atlas built to show how public geospatial themes behave across different visualization layers.
      </p>
      <div className="page-grid">
        <section>
          <small>01 · THE IDEA</small>
          <h2>One map, six visual languages</h2>
          <p>
            Compare polygon density, origin–destination arcs, spatial aggregation, screen grids, highway paths, and flight corridors without changing tools.
            The MVP ships with the United States; the same dataset model is built to extend to any country next.
          </p>
        </section>
        <section>
          <small>02 · THE STACK</small>
          <h2>MapLibre + deck.gl</h2>
          <p>MapLibre provides the basemap while deck.gl renders fast, interactive WebGL layers over it. React and TypeScript power the interface.</p>
        </section>
        <section>
          <small>03 · THE DATA</small>
          <h2>Demo figures, traceable patterns</h2>
          <p>
            Each dataset page labels figures as illustrative approximations modeled after public sources (Census, NHTSA, BLS, and others) so you can verify the pattern — not treat the numbers as a live feed.
          </p>
        </section>
      </div>
    </article>
  )
}
