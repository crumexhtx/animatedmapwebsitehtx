import { Compass, Info, Layers, Mail } from 'lucide-react'
import { NavLink, useLocation } from 'react-router'
import { datasets } from '../data'
import { Brand } from './Brand'

export function SiteHeader() {
  const location = useLocation()
  const atlasActive = location.pathname === '/' || location.pathname.startsWith('/atlas')
  const datasetsActive = location.pathname.startsWith('/datasets')

  return (
    <header>
      <NavLink className="brand-button" to="/" aria-label="Open atlas">
        <Brand />
      </NavLink>
      <div className="header-stat"><b>{datasets.length}</b><span>deck.gl<br />layer demos</span></div>
      <nav className="site-nav" aria-label="Main navigation">
        <NavLink to="/" end className={() => (atlasActive ? 'active' : '')}>
          <Layers size={14} /> Atlas
        </NavLink>
        <NavLink to="/datasets" className={() => (datasetsActive ? 'active' : '')}>
          <Compass size={14} /> Datasets
        </NavLink>
        <NavLink to="/about" className={({ isActive }) => (isActive ? 'active' : '')}>
          <Info size={14} /> About
        </NavLink>
        <NavLink to="/contact" className={({ isActive }) => (isActive ? 'active' : '')}>
          <Mail size={14} /> Contact
        </NavLink>
      </nav>
    </header>
  )
}
