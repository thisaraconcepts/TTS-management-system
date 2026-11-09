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
      return { title: 'Accommodation Management Module', parent: '/dashboard', parentLabel: 'Dashboard' }
    }
    if (path.startsWith('/students')) {
      return { title: 'Student Details Management Module', parent: '/dashboard', parentLabel: 'Dashboard' }
    }
    if (path.startsWith('/parade')) {
      return { title: 'Daily Parade State Board', parent: '/dashboard', parentLabel: 'Dashboard' }
    }
    if (path.startsWith('/academic')) {
      return { title: 'Academic Activities Module', parent: '/dashboard', parentLabel: 'Dashboard' }
    }
    if (path.startsWith('/reports')) {
      if (tab === 'parade') {
        return { title: 'Reports & Analytics — Parade Strength', parent: '/parade?tab=monitoring', parentLabel: 'Parade State' }
      }
      if (tab === 'student') {
        return { title: 'Reports & Analytics — Trainee Dossiers', parent: '/students', parentLabel: 'Students' }
      }
      if (tab === 'accommodation') {
        return { title: 'Reports & Analytics — Bunk Housing', parent: '/accommodation', parentLabel: 'Accommodation' }
      }
      if (tab === 'academic_results' || tab === 'attendance' || tab === 'course_calendar') {
        return { title: 'Reports & Analytics — Academic Reports', parent: '/academic', parentLabel: 'Academic' }
      }
      return { title: 'Reports & Analytics Module', parent: '/dashboard', parentLabel: 'Dashboard' }
    }
    if (path.startsWith('/admin')) {
      return { title: 'System Administration Module', parent: '/dashboard', parentLabel: 'Dashboard' }
    }
    return { title: 'TTS Management Portal', parent: null, parentLabel: null }
  }

  const moduleInfo = getModuleInfo()
  const isHome = path === '/dashboard' || path === '/'

  return (
    <header className={`glass-header app-navbar d-flex align-items-center justify-content-between px-3 px-md-4 py-2 fixed-top ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Header Module Name, Back Button, and Current DateTime */}
      <div className="d-flex align-items-center gap-1 gap-sm-2 flex-grow-1 overflow-hidden me-2">
        <button 
          className="btn btn-link text-primary p-1 d-lg-none me-1 touch-target d-flex align-items-center justify-content-center" 
          onClick={onToggleSidebar} 
          title="Open Navigation Menu"
          aria-label="Open Navigation Menu"
        >
          <i className="bi bi-list fs-1"></i>
        </button>

        {!isHome && (
          <div className="d-flex align-items-center gap-1 me-1 flex-shrink-0">
            <button 
              className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1 shadow-xs px-2 px-sm-2.5 py-1 rounded-pill"
              onClick={() => navigate('/dashboard')}
              title="Back to Home Portal"
            >
              <i className="bi bi-arrow-left-circle-fill"></i>
              <span className="d-none d-md-inline small fw-semibold">Back to Home Portal</span>
              <span className="d-none d-sm-inline d-md-none small fw-semibold">Home</span>
            </button>
            {moduleInfo.parent && moduleInfo.parent !== '/dashboard' && (
              <button 
                className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1 shadow-xs px-2 py-1 rounded-pill"
                onClick={() => navigate(moduleInfo.parent)}
                title={`Back to ${moduleInfo.parentLabel || 'Previous Page'}`}
              >
                <i className="bi bi-arrow-left"></i>
                <span className="d-none d-sm-inline small fw-semibold">{moduleInfo.parentLabel || 'Back'}</span>
              </button>
            )}
          </div>
        )}

        <div className="overflow-hidden">
          <div className="d-flex align-items-center gap-2">
            <h4 className="mb-0 display-font text-primary fw-bold navbar-title text-truncate" style={{ letterSpacing: '0.3px' }} title={moduleInfo.title}>
              {moduleInfo.title}
            </h4>
          </div>
          <small className="text-muted d-none d-md-block text-truncate" style={{ fontSize: '0.75rem', fontWeight: 500 }}>
            {currentDateTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} | {currentDateTime.toLocaleTimeString()}
          </small>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="d-flex align-items-center gap-2 gap-sm-3">
        {/* Toggle Theme */}
        <button className="btn btn-link text-body p-1" onClick={toggleTheme} title="Toggle Light/Dark Theme">
          {theme === 'light' ? (
            <i className="bi bi-moon-stars-fill" style={{ fontSize: '1.15rem' }}></i>
          ) : (
            <i className="bi bi-sun-fill" style={{ fontSize: '1.15rem' }}></i>
          )}
        </button>

        {/* Notifications Icon dropdown */}
        <div className="position-relative">
          <button className="btn btn-link text-body p-1 position-relative" onClick={() => setShowNotifications(!showNotifications)}>
            <i className="bi bi-bell-fill" style={{ fontSize: '1.15rem' }}></i>
            {notifications.length > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.65rem' }}>
                {notifications.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="card slaf-card position-absolute end-0 mt-3 p-0 shadow-lg" style={{ width: 'min(300px, calc(100vw - 24px))', zIndex: 1100, maxHeight: '400px', overflowY: 'auto' }}>
              <div className="card-header bg-app d-flex justify-content-between align-items-center py-2 px-3">
                <span className="fw-semibold">Alert Center</span>
                <span className="badge bg-secondary">{notifications.length} new</span>
              </div>
              <div className="list-group list-group-flush">
                {notifications.length === 0 ? (
                  <div className="text-center py-4 text-muted">No pending alerts</div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="list-group-item p-3 position-relative">
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <span className={`fw-semibold text-${n.type === 'ALERT' ? 'danger' : 'warning'}`} style={{ fontSize: '0.85rem' }}>
                          {n.title}
                        </span>
                        <button className="btn btn-link p-0 text-muted" onClick={() => markAsRead(n.id)}>
                          <i className="bi bi-x-circle-fill"></i>
                        </button>
                      </div>
                      <p className="mb-0 text-muted" style={{ fontSize: '0.75rem' }}>{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Logged user section */}
        <div className="d-flex align-items-center gap-2">
          <Link to="/profile" className="text-decoration-none d-flex align-items-center gap-2">
            {user?.profile_photo ? (
              <img src={user.profile_photo} alt={user.full_name} className="rounded-circle object-fit-cover border border-2 border-primary" style={{ width: '32px', height: '32px' }} />
            ) : (
              <div className="d-inline-flex bg-primary-subtle text-primary rounded-circle align-items-center justify-content-center border" style={{ width: '32px', height: '32px' }}>
                <i className="bi bi-person-fill"></i>
              </div>
            )}
            <div className="text-end d-none d-sm-block">
              <div className="fw-semibold text-body hover-primary" style={{ fontSize: '0.85rem' }}>{user?.full_name}</div>
              <div className="text-muted" style={{ fontSize: '0.7rem', fontWeight: 500 }}>{user?.role?.name}</div>
            </div>
          </Link>
          <button className="btn btn-outline-danger btn-sm px-2.5 py-1 rounded-pill ms-1" onClick={logout} title="Logout">
            <i className="bi bi-box-arrow-right me-1"></i> <span className="d-none d-sm-inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  )
}
export default Navbar
