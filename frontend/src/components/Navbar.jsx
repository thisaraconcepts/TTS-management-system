import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { toast } from 'react-toastify'

export const Navbar = ({ onToggleSidebar, isCollapsed }) => {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [currentDateTime, setCurrentDateTime] = useState(new Date())
  const location = useLocation()
  const navigate = useNavigate()

  const path = location.pathname
  const queryParams = new URLSearchParams(location.search)
  const tab = queryParams.get('tab')

  // Dynamic live clock in header
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch unread notifications every 30 seconds
  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/api/v1/dashboard/notifications')
      setNotifications(res.data)
    } catch (err) {
      console.error('Failed to load notifications', err)
    }
  }

  useEffect(() => {
    fetchNotifications()
    const timer = setInterval(fetchNotifications, 30000)
    return () => clearInterval(timer)
  }, [])

  const markAsRead = async (id) => {
    try {
      await axios.post(`/api/v1/dashboard/notifications/${id}/read`)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      toast.info('Notification dismissed')
    } catch (err) {
      console.error(err)
    }
  }

  // Determine active module title and origin link for header
  const getModuleInfo = () => {
    if (path.startsWith('/accommodation')) {
      return { title: 'Accommodation', parent: '/dashboard', parentLabel: 'Dashboard' }
    }
    if (path.startsWith('/students')) {
      return { title: 'Trainees', parent: '/dashboard', parentLabel: 'Dashboard' }
    }
    if (path.startsWith('/parade')) {
      return { title: 'Parade State', parent: '/dashboard', parentLabel: 'Dashboard' }
    }
    if (path.startsWith('/academic')) {
      return { title: 'Academics', parent: '/dashboard', parentLabel: 'Dashboard' }
    }
    if (path.startsWith('/reports')) {
      if (tab === 'parade') {
        return { title: 'Reports · Parade Strength', parent: '/parade?tab=monitoring', parentLabel: 'Parade State' }
      }
      if (tab === 'student') {
        return { title: 'Reports · Trainee Dossiers', parent: '/students', parentLabel: 'Students' }
      }
      if (tab === 'accommodation') {
        return { title: 'Reports · Accommodation', parent: '/accommodation', parentLabel: 'Accommodation' }
      }
      if (tab === 'academic_results' || tab === 'attendance' || tab === 'course_calendar') {
        return { title: 'Reports · Academics', parent: '/academic', parentLabel: 'Academic' }
      }
      return { title: 'Reports', parent: '/dashboard', parentLabel: 'Dashboard' }
    }
    if (path.startsWith('/admin')) {
      return { title: 'Administration', parent: '/dashboard', parentLabel: 'Dashboard' }
    }
    if (path.startsWith('/profile')) {
      return { title: 'My profile', parent: '/dashboard', parentLabel: 'Dashboard' }
    }
    if (path.startsWith('/access-denied')) {
      return { title: 'Access restricted', parent: '/dashboard', parentLabel: 'Dashboard' }
    }
    return { title: 'Overview', parent: null, parentLabel: null }
  }

  const moduleInfo = getModuleInfo()
  const isHome = path === '/dashboard' || path === '/'


  const initials = (user?.full_name || user?.username || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

  return (
    <header className={`glass-header app-navbar d-flex align-items-center justify-content-between px-3 px-md-4 fixed-top ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Left: menu toggle + breadcrumb/title */}
      <div className="d-flex align-items-center gap-2 flex-grow-1 overflow-hidden me-2">
        <button
          className="icon-btn d-lg-none flex-shrink-0"
          onClick={onToggleSidebar}
          title="Open navigation menu"
          aria-label="Open navigation menu"
        >
          <i className="bi bi-list fs-4"></i>
        </button>

        <div className="overflow-hidden">
          <nav className="app-crumbs d-none d-sm-flex align-items-center gap-1 text-truncate" aria-label="Breadcrumb">
            {isHome ? (
              <span>{currentDateTime.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            ) : (
              <>
                <Link to="/dashboard">Home</Link>
                {moduleInfo.parent && moduleInfo.parent !== '/dashboard' && (
                  <>
                    <i className="bi bi-chevron-right" style={{ fontSize: '0.6rem' }}></i>
                    <Link to={moduleInfo.parent}>{moduleInfo.parentLabel}</Link>
                  </>
                )}
                <i className="bi bi-chevron-right" style={{ fontSize: '0.6rem' }}></i>
                <span className="text-truncate">{moduleInfo.title}</span>
              </>
            )}
          </nav>
          <h1 className="navbar-title mb-0 text-truncate" title={moduleInfo.title}>
            {moduleInfo.title}
          </h1>
        </div>
      </div>

      {/* Right: clock, theme, alerts, user */}
      <div className="d-flex align-items-center gap-1 gap-sm-2">
        <span className="app-clock d-none d-xl-inline tabular-nums me-2">
          {currentDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>

        <button className="icon-btn" onClick={toggleTheme} title={theme === 'light' ? 'Dark theme' : 'Light theme'} aria-label="Toggle theme">
          <i className={`bi ${theme === 'light' ? 'bi-moon' : 'bi-sun'}`}></i>
        </button>

        {/* Notifications */}
        <div className="position-relative">
          <button
            className="icon-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            title="Alerts"
            aria-label="Alerts"
            aria-expanded={showNotifications}
          >
            <i className="bi bi-bell"></i>
            {notifications.length > 0 && <span className="notif-dot">{notifications.length}</span>}
          </button>

          {showNotifications && (
            <div className="notif-panel">
              <div className="notif-panel-head">
                <span>Alerts</span>
                <span className="text-muted small">{notifications.length} unread</span>
              </div>
              <div className="notif-panel-body">
                {notifications.length === 0 ? (
                  <div className="text-center py-4 text-muted small">
                    <i className="bi bi-check2-circle d-block fs-4 mb-1"></i>
                    You're all caught up
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className={`notif-item ${n.type === 'ALERT' ? 'is-alert' : 'is-warning'}`}>
                      <div className="flex-grow-1">
                        <div className="notif-title">{n.title}</div>
                        <p className="notif-msg">{n.message}</p>
                      </div>
                      <button className="icon-btn icon-btn-sm" onClick={() => markAsRead(n.id)} title="Dismiss" aria-label="Dismiss alert">
                        <i className="bi bi-x"></i>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <span className="navbar-divider d-none d-sm-block"></span>

        {/* User */}
        <Link to="/profile" className="user-chip text-decoration-none" title="My profile">
          {user?.profile_photo ? (
            <img src={user.profile_photo} alt={user.full_name} className="user-avatar object-fit-cover" />
          ) : (
            <span className="user-avatar">{initials}</span>
          )}
          <span className="d-none d-md-block text-start lh-sm">
            <span className="user-name d-block">{user?.full_name}</span>
            <span className="user-role d-block">{user?.role?.name}</span>
          </span>
        </Link>
        <button className="icon-btn" onClick={logout} title="Sign out" aria-label="Sign out">
          <i className="bi bi-box-arrow-right"></i>
        </button>
      </div>
    </header>
  )
}
export default Navbar
