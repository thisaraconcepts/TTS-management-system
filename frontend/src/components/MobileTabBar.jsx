import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SYSTEM_MODULES, checkModuleAccess } from '../utils/navigation'

// Bottom tab bar for phones (and the installed app): the most used modules
// one thumb-tap away. Only modules the user may open are shown.
const PREFERRED = ['parade', 'trainees', 'academic', 'accommodation', 'reports']
const ICONS = { parade: 'bi-clipboard2-check', trainees: 'bi-people', academic: 'bi-journal-bookmark', accommodation: 'bi-house-door', reports: 'bi-file-earmark-bar-graph' }
const LABELS = { parade: 'Parade', trainees: 'Trainees', academic: 'Academics', accommodation: 'Housing', reports: 'Reports' }

export const MobileTabBar = ({ onOpenMenu }) => {
  const { user, hasPermission } = useAuth()
  const { pathname } = useLocation()

  const modules = PREFERRED
    .map((id) => SYSTEM_MODULES.find((m) => m.id === id))
    .filter((m) => m && checkModuleAccess(user, m.permissionCode, hasPermission))
    .slice(0, 3)

  const basePath = (p) => p.split('?')[0]

  return (
    <nav className="mobile-tabbar d-lg-none no-print" aria-label="Quick navigation">
      <Link to="/dashboard" className={`mobile-tab ${pathname === '/dashboard' ? 'active' : ''}`}>
        <i className="bi bi-grid"></i>
        <span>Home</span>
      </Link>
      {modules.map((m) => (
        <Link
          key={m.id}
          to={m.path}
          className={`mobile-tab ${pathname.startsWith(basePath(m.path)) ? 'active' : ''}`}
        >
          <i className={`bi ${ICONS[m.id]}`}></i>
          <span>{LABELS[m.id]}</span>
        </Link>
      ))}
      <button type="button" className="mobile-tab" onClick={onOpenMenu} aria-label="Open full menu">
        <i className="bi bi-list"></i>
        <span>Menu</span>
      </button>
    </nav>
  )
}

export default MobileTabBar
