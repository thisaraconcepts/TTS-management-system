import React, { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { toast } from 'react-toastify'

export const Landing = () => {
  const { user, token } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [stats, setStats] = useState({
    active_trainees: 0,
    active_batches: 0,
    instructors: 0,
    buildings: 0
  })
  const [notices, setNotices] = useState([])
  const [statsLoading, setStatsLoading] = useState(true)
  const [noticesLoading, setNoticesLoading] = useState(true)

  // Fetch Public Stats & Notices with real-time sync
  useEffect(() => {
    let isMounted = true

    const fetchStats = async (isBackground = false) => {
      try {
        const res = await axios.get('/api/v1/public/stats', {
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
          params: { _t: Date.now() }
        })
        if (res.data && isMounted) {
          setStats(prev => ({
            ...prev,
            ...res.data
          }))
        }
      } catch (err) {
        console.warn('Could not load live public stats, using baseline counters.', err)
      } finally {
        if (isMounted && !isBackground) {
          setStatsLoading(false)
        }
      }
    }

    const fetchNotices = async (isBackground = false) => {
      try {
        const res = await axios.get('/api/v1/public/notices', {
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
          params: { _t: Date.now() }
        })
        if (Array.isArray(res.data) && isMounted) {
          setNotices(res.data)
        }
      } catch (err) {
        console.warn('Could not load public notices.', err)
      } finally {
        if (isMounted && !isBackground) {
          setNoticesLoading(false)
        }
      }
    }

    // Initial load
    fetchStats(false)
    fetchNotices(false)

    // Real-time background sync interval (every 15 seconds)
    const interval = setInterval(() => {
      fetchStats(true)
      fetchNotices(true)
    }, 15000)

    // Immediate sync on tab visibility regaining focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStats(true)
        fetchNotices(true)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isMounted = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const handleModuleClick = (targetPath, requiredPermission) => {
    if (token && user) {
      // User is logged in, check if they can access or let the route shield handle it
      navigate(targetPath)
    } else {
      // User is not logged in, redirect to login with state redirection
      toast.info('Authentication required. Please sign in to access this module.')
      navigate('/login', { state: { from: targetPath } })
    }
  }

  const [isNavOpen, setIsNavOpen] = useState(false)
  const navRef = useRef(null)

  const handleNavClick = (id) => {
    setIsNavOpen(false)
    scrollSection(id)
  }

  // Handle outside clicks and window resize for mobile nav drawer
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isNavOpen && navRef.current && !navRef.current.contains(e.target)) {
        setIsNavOpen(false)
      }
    }
    const handleResize = () => {
      if (window.innerWidth >= 992 && isNavOpen) {
        setIsNavOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    window.addEventListener('resize', handleResize)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      window.removeEventListener('resize', handleResize)
    }
  }, [isNavOpen])

  const scrollSection = (id) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Modules list metadata
  const modulesList = [
    {
      title: 'Student Details Management',
      icon: 'bi-people-fill',
      description: 'Manage trainee personal profiles, service details, documents, and active batch assignments.',
      path: '/students',
      color: '#3b82f6'
    },
    {
      title: 'Daily Parade State Board',
      icon: 'bi-clipboard2-check-fill',
      description: 'Instantly view and manage daily parade strengths: Present, Sick, Leave, AWOL, and Temporary duties.',
      path: '/parade',
      color: '#10b981'
    },


    {
      title: 'Accommodation Management',
      icon: 'bi-house-door-fill',
      description: 'Allocate beds, billet assignments, room counts, and view real-time occupancy vacancies.',
      path: '/accommodation',
      color: '#f59e0b'
    },
    {
      title: 'Academic Activities',
      icon: 'bi-journal-bookmark-fill',
      description: 'Map timetables, input exam outcomes, manage course syllabi, and track trainees performance.',
      path: '/academic',
      color: '#8b5cf6'
    },
    {
      title: 'Reports & Dashboard',
      icon: 'bi-bar-chart-line-fill',
      description: 'Compile data exports, visualize KPIs, check squadron counts, and extract management reports.',
      path: '/reports',
      color: '#ec4899'
    },
    {
      title: 'User & Role Management',
      icon: 'bi-shield-lock-fill',
      description: 'Supervise portal accounts, audit log activities, toggle status controls, and verify permission roles.',
      path: '/admin',
      color: '#ef4444'
    }
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Sticky Glass Navbar */}
      <nav className="navbar navbar-expand-lg landing-navbar fixed-top px-3 px-md-4 py-2" ref={navRef}>
        <div className="container-fluid d-flex align-items-center justify-content-between">
          <div className="navbar-brand d-flex align-items-center gap-3 cursor-pointer" onClick={() => handleNavClick('hero')}>
            {/* Air force icon graphic logo */}
            <div className="d-flex align-items-center justify-content-center bg-primary text-white rounded-circle p-2" style={{ width: '42px', height: '42px', minWidth: '42px' }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M12 2L2 22h9l1-3 1 3h9L12 2zm0 4.27L18.42 19h-2.58l-1-3h-5.68l-1 3H5.58L12 6.27z" />
              </svg>
            </div>
            <div>
              <h5 className="mb-0 text-primary display-font fw-bold" style={{ fontSize: '1.05rem', letterSpacing: '0.5px' }}>SRI LANKA AIR FORCE</h5>
              <p className="mb-0 text-muted" style={{ fontSize: '0.72rem', fontWeight: 600 }}>TRADE TRAINING SCHOOL (TTS) PORTAL</p>
            </div>
          </div>

          <button
            className="navbar-toggler border-0 p-1 d-flex align-items-center justify-content-center shadow-none"
            type="button"
            onClick={() => setIsNavOpen(prev => !prev)}
            aria-expanded={isNavOpen}
            aria-label="Toggle navigation menu"
          >
            <i className={isNavOpen ? "bi bi-x-lg fs-2 text-primary" : "bi bi-list fs-1 text-primary"}></i>
          </button>

          <div className={`collapse navbar-collapse landing-navbar-collapse ${isNavOpen ? 'show' : ''} justify-content-end align-items-center gap-4`} id="landingNavbar">
            <ul className="navbar-nav mb-2 mb-lg-0 gap-3">
              <li className="nav-item">
                <button className="btn btn-link nav-link fw-semibold text-body py-1" onClick={() => handleNavClick('hero')}>Home</button>
              </li>
              <li className="nav-item">
                <button className="btn btn-link nav-link fw-semibold text-body py-1" onClick={() => handleNavClick('about')}>About</button>
              </li>
              <li className="nav-item">
                <button className="btn btn-link nav-link fw-semibold text-body py-1" onClick={() => handleNavClick('modules')}>Modules</button>
              </li>
              <li className="nav-item">
                <button className="btn btn-link nav-link fw-semibold text-body py-1" onClick={() => handleNavClick('notices')}>Notices</button>
              </li>
              <li className="nav-item">
                <button className="btn btn-link nav-link fw-semibold text-body py-1" onClick={() => handleNavClick('contact')}>Contact</button>
              </li>
            </ul>

            <div className="landing-navbar-auth d-flex align-items-center gap-3 border-start ps-3" style={{ borderColor: 'var(--border-color)' }}>
              {/* Theme toggle */}
              <button className="btn btn-link text-body p-2 me-1 d-flex align-items-center" onClick={toggleTheme} title="Toggle Light/Dark Mode" aria-label="Toggle theme">
                {theme === 'light' ? (
                  <i className="bi bi-moon-stars-fill fs-5"></i>
                ) : (
                  <i className="bi bi-sun-fill fs-5"></i>
                )}
              </button>

              {/* Login Button */}
              {token && user ? (
                <Link to="/dashboard" onClick={() => setIsNavOpen(false)} className="btn btn-primary btn-auth-link px-4 py-2 rounded-pill fw-semibold d-flex align-items-center gap-2">
                  <i className="bi bi-grid-1x2"></i> Enter Portal
                </Link>
              ) : (
                <Link to="/login" onClick={() => setIsNavOpen(false)} className="btn btn-outline-primary btn-auth-link px-4 py-2 rounded-pill fw-semibold">
                  <i className="bi bi-box-arrow-in-right me-1"></i> Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile navigation backdrop */}
      {isNavOpen && (
        <div
          className="landing-nav-backdrop d-lg-none"
          onClick={() => setIsNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Hero Banner Section */}
      <section id="hero" className="position-relative d-flex align-items-center text-white" style={{
        minHeight: '85vh',
        paddingTop: '75px',
        background: 'linear-gradient(135deg, #091326 0%, #172d54 50%, #0f1d3a 100%)',
        overflow: 'hidden'
      }}>
        {/* Abstract Jet Silhouette Overlay Background */}
        <div className="hero-aircraft-wrapper" aria-hidden="true">
          <svg className="hero-aircraft-svg" viewBox="0 0 24 24">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L14 19v-5.5l7 2.5z" />
          </svg>
        </div>

        {/* Ambient Grid overlay */}
        <div className="position-absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(var(--color-primary) 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }}></div>

        <div className="container position-relative py-5" style={{ zIndex: 2 }}>
          <div className="row align-items-center">
            <div className="col-lg-8">
              <span className="badge bg-primary-subtle text-primary border border-primary px-3 py-2 rounded-pill fw-semibold text-uppercase mb-3" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>
                <i className="bi bi-shield-check me-1"></i> Centered Military Intelligence Portal
              </span>
              <h1 className="display-5 fs-2 fs-md-1 fw-extrabold text-white display-font mb-3" style={{ lineHeight: '1.2' }}>
                Welcome to the Trade Training School <br />
                <span className="text-info">Management Portal</span>
              </h1>
              <p className="lead text-white-50 mb-4" style={{ maxWidth: '680px', fontSize: '1.15rem' }}>
                A centralized, secure enterprise platform designed to manage trainee logs, academic tracking, room vacancies, parade state reports, and school operations for the Sri Lanka Air Force.
              </p>
              <div className="d-flex flex-column flex-sm-row flex-wrap gap-3">
                {token && user ? (
                  <Link to="/dashboard" className="btn btn-info text-dark btn-lg px-4 py-2.5 rounded-3 fw-bold shadow-lg d-flex align-items-center justify-content-center gap-2 w-100 w-sm-auto">
                    Go to Portal Dashboard <i className="bi bi-arrow-right"></i>
                  </Link>
                ) : (
                  <Link to="/login" className="btn btn-info text-dark btn-lg px-4 py-2.5 rounded-3 fw-bold shadow-lg d-flex align-items-center justify-content-center gap-2 w-100 w-sm-auto">
                    Access Portal Login <i className="bi bi-box-arrow-in-right"></i>
                  </Link>
                )}
                <button className="btn btn-outline-light btn-lg px-4 py-2.5 rounded-3 fw-semibold w-100 w-sm-auto" onClick={() => scrollSection('about')}>
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Statistics Counters Section */}
      <section className="py-5 bg-app border-bottom" style={{ borderColor: 'var(--border-color)' }}>
        <div className="container">
          <div className="row g-3 g-md-4 justify-content-center">
            {/* Stat Card 1 */}
            <div className="col-6 col-md-3">
              <div className="card slaf-card p-3 p-md-4 text-center h-100">
                <div className="d-inline-flex bg-primary-subtle text-primary rounded-circle p-2.5 p-md-3 mx-auto mb-2 mb-md-3">
                  <i className="bi bi-person-badge-fill" style={{ fontSize: '1.5rem' }}></i>
                </div>
                <h2 className="display-6 fs-3 fs-md-2 fw-bold mb-1 text-primary">
                  {statsLoading ? (
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                  ) : stats.active_trainees}
                </h2>
                <p className="text-muted fw-semibold mb-0" style={{ fontSize: '0.8rem' }}>Active Trainees</p>
              </div>
            </div>

            {/* Stat Card 2 */}
            <div className="col-6 col-md-3">
              <div className="card slaf-card p-3 p-md-4 text-center h-100">
                <div className="d-inline-flex bg-success-subtle text-success rounded-circle p-2.5 p-md-3 mx-auto mb-2 mb-md-3">
                  <i className="bi bi-layers-fill" style={{ fontSize: '1.5rem' }}></i>
                </div>
                <h2 className="display-6 fs-3 fs-md-2 fw-bold mb-1 text-success">
                  {statsLoading ? (
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                  ) : stats.active_batches}
                </h2>
                <p className="text-muted fw-semibold mb-0" style={{ fontSize: '0.8rem' }}>Active Batches</p>
              </div>
            </div>

            {/* Stat Card 3 */}
            <div className="col-6 col-md-3">
              <div className="card slaf-card p-3 p-md-4 text-center h-100">
                <div className="d-inline-flex bg-purple-subtle text-purple rounded-circle p-2.5 p-md-3 mx-auto mb-2 mb-md-3" style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                  <i className="bi bi-award-fill" style={{ fontSize: '1.5rem' }}></i>
                </div>
                <h2 className="display-6 fs-3 fs-md-2 fw-bold mb-1" style={{ color: '#8b5cf6' }}>
                  {statsLoading ? (
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                  ) : stats.instructors}
                </h2>
                <p className="text-muted fw-semibold mb-0" style={{ fontSize: '0.8rem' }}>Instructors</p>
              </div>
            </div>

            {/* Stat Card 4 */}
            <div className="col-6 col-md-3">
              <div className="card slaf-card p-3 p-md-4 text-center h-100">
                <div className="d-inline-flex bg-warning-subtle text-warning rounded-circle p-2.5 p-md-3 mx-auto mb-2 mb-md-3">
                  <i className="bi bi-building-fill" style={{ fontSize: '1.5rem' }}></i>
                </div>
                <h2 className="display-6 fs-3 fs-md-2 fw-bold mb-1 text-warning">
                  {statsLoading ? (
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                  ) : stats.buildings}
                </h2>
                <p className="text-muted fw-semibold mb-0" style={{ fontSize: '0.8rem' }}>Billet Buildings</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* System Modules Section */}
      <section id="modules" className="py-5" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="container py-3">
          <div className="text-center mb-5">
            <h2 className="text-primary display-font mb-2">Portal System Modules</h2>
            <p className="text-muted mx-auto" style={{ maxWidth: '600px' }}>
              Select a module to navigate. Unauthenticated sessions will be redirected to verify credentials.
            </p>
          </div>

          <div className="row g-4">
            {modulesList.map((m, index) => (
              <div key={index} className="col-lg-4 col-md-6">
                <div
                  className="card slaf-card h-100 p-4 cursor-pointer"
                  onClick={() => handleModuleClick(m.path)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <div className="d-flex align-items-center justify-content-center rounded-circle text-white shadow-sm" style={{
                      width: '50px',
                      height: '50px',
                      backgroundColor: m.color,
                    }}>
                      <i className={`bi ${m.icon}`} style={{ fontSize: '1.4rem' }}></i>
                    </div>
                    <h5 className="mb-0 display-font fw-bold" style={{ fontSize: '1.1rem' }}>{m.title}</h5>
                  </div>
                  <p className="text-muted mb-4" style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>{m.description}</p>
                  <div className="d-flex align-items-center gap-1 mt-auto fw-bold text-primary" style={{ fontSize: '0.85rem' }}>
                    Access Module <i className="bi bi-arrow-right"></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Notices announcement Board */}
      <section id="notices" className="py-5 bg-app border-top border-bottom" style={{ borderColor: 'var(--border-color)' }}>
        <div className="container py-3">
          <div className="row g-5">
            <div className="col-lg-5 d-flex flex-column justify-content-center">
              <span className="text-primary fw-bold text-uppercase mb-2" style={{ letterSpacing: '1px', fontSize: '0.85rem' }}>Announcements Board</span>
              <h2 className="display-font text-body mb-3">Latest SLAF TTS Announcements</h2>
              <p className="text-muted mb-4">
                View real-time updates and circulars issued by school commandants and discipline sections. Ensure immediate action is taken on warnings and inspection targets.
              </p>
              <div className="p-3 glass-card bg-primary-subtle text-primary border-primary d-flex align-items-start gap-3">
                <i className="bi bi-info-circle-fill" style={{ fontSize: '1.5rem' }}></i>
                <div>
                  <h6 className="fw-bold mb-1">Information Portal Notification</h6>
                  <p className="mb-0 text-muted" style={{ fontSize: '0.8rem' }}>Logins are audited. Do not share credentials. Ensure parade state logs are verified by commanding officers.</p>
                </div>
              </div>
            </div>

            <div className="col-lg-7">
              <div className="card slaf-card p-4 h-100" style={{ minHeight: '350px' }}>
                <h5 className="display-font mb-4 fw-bold border-bottom pb-2 d-flex justify-content-between align-items-center">
                  <span><i className="bi bi-bell-fill text-warning me-2"></i>Active Circulars</span>
                  <span className="badge bg-secondary" style={{ fontSize: '0.7rem' }}>Dynamic Feed</span>
                </h5>

                {noticesLoading ? (
                  <div className="d-flex justify-content-center align-items-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading notices...</span>
                    </div>
                  </div>
                ) : notices.length === 0 ? (
                  <div className="text-center py-5 text-muted">No public notices currently available.</div>
                ) : (
                  <div className="list-group list-group-flush gap-3" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    {notices.map((n) => (
                      <div key={n.id} className="list-group-item bg-transparent border-0 p-3 rounded-3 glass-card d-flex flex-column gap-1">
                        <div className="d-flex justify-content-between align-items-center">
                          <span className={`badge px-2.5 py-1 text-uppercase ${n.type === 'ALERT' ? 'bg-danger text-white' :
                            n.type === 'WARNING' ? 'bg-warning text-dark' : 'bg-primary text-white'
                            }`} style={{ fontSize: '0.65rem', fontWeight: 600 }}>
                            {n.type}
                          </span>
                          <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                            {new Date(n.created_at).toLocaleDateString(undefined, {
                              year: 'numeric', month: 'short', day: 'numeric'
                            })}
                          </span>
                        </div>
                        <h6 className="fw-bold mb-1 text-body mt-1">{n.title}</h6>
                        <p className="mb-0 text-muted" style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>{n.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-5" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="container py-4">
          <div className="row align-items-center g-5">
            <div className="col-lg-7">
              <span className="text-primary fw-bold text-uppercase mb-2" style={{ letterSpacing: '1.5px', fontSize: '0.85rem' }}>Centralized SSOT</span>
              <h2 className="display-font text-primary mb-3">About The TTS Portal System</h2>
              <p className="text-muted mb-4" style={{ lineHeight: '1.6' }}>
                The Trade Training School Management Portal is a centralized web-based information management system designed to streamline trainee administration, academic management, accommodation management, and operational reporting for the Sri Lanka Air Force Trade Training School.
              </p>
              <p className="text-muted mb-4" style={{ lineHeight: '1.6' }}>
                By establishing a single MySQL source of truth, the system replaces manual record files and disconnected spreadsheets. Unauthorized modifications are prohibited by JWT session audits and Role-Based Access controls, ensuring maximum data integrity and operational confidentiality.
              </p>
              <div className="row g-3">
                <div className="col-sm-6 d-flex align-items-center gap-2">
                  <i className="bi bi-check-circle-fill text-success"></i>
                  <span className="fw-semibold text-muted" style={{ fontSize: '0.85rem' }}>Secure JWT Authorization</span>
                </div>
                <div className="col-sm-6 d-flex align-items-center gap-2">
                  <i className="bi bi-check-circle-fill text-success"></i>
                  <span className="fw-semibold text-muted" style={{ fontSize: '0.85rem' }}>Real-time Parade Updates</span>
                </div>
                <div className="col-sm-6 d-flex align-items-center gap-2">
                  <i className="bi bi-check-circle-fill text-success"></i>
                  <span className="fw-semibold text-muted" style={{ fontSize: '0.85rem' }}>Bed Allocation Maps</span>
                </div>
                <div className="col-sm-6 d-flex align-items-center gap-2">
                  <i className="bi bi-check-circle-fill text-success"></i>
                  <span className="fw-semibold text-muted" style={{ fontSize: '0.85rem' }}>Class Examination Matrices</span>
                </div>
              </div>
            </div>

            <div className="col-lg-5 text-center">
              {/* Emblem graphics shield placeholder using custom SVG */}
              <div className="d-inline-flex bg-primary-subtle text-primary rounded-circle p-5 shadow-glow" style={{ animation: 'pulse 3s infinite' }}>
                <svg viewBox="0 0 24 24" width="120" height="120" fill="currentColor">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 12c-2.7 0-5.8-1.28-6-3v-1c0-1.66 1.34-3 3-3h6c1.66 0 3 1.34 3 3v1c-.2 1.72-3.3 3-6 3z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-5 bg-app border-top" style={{ borderColor: 'var(--border-color)' }}>
        <div className="container py-3">
          <div className="text-center mb-5">
            <h2 className="display-font text-body">Contact Administration</h2>
            <p className="text-muted">Need help resetting credentials or requesting system permissions?</p>
          </div>

          <div className="row g-4 justify-content-center">
            <div className="col-md-4">
              <div className="card slaf-card p-4 text-center">
                <i className="bi bi-geo-alt-fill text-primary mb-3" style={{ fontSize: '1.75rem' }}></i>
                <h5 className="display-font fw-bold">Office Address</h5>
                <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
                  Trade Training School,<br />
                  Sri Lanka Air Force Station,<br />
                  Ekala, Sri Lanka.
                </p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card slaf-card p-4 text-center">
                <i className="bi bi-envelope-at-fill text-primary mb-3" style={{ fontSize: '1.75rem' }}></i>
                <h5 className="display-font fw-bold">Email Support</h5>
                <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
                  tts.admin@slaf.lk<br />
                  support.portal@slaf.lk
                </p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card slaf-card p-4 text-center">
                <i className="bi bi-telephone-fill text-primary mb-3" style={{ fontSize: '1.75rem' }}></i>
                <h5 className="display-font fw-bold">Contact Us</h5>
                <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
                  +94 11 2245362 (Ext. 26522)<br />
                  Fax: +94 11 2245363
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-4 bg-dark text-white border-top border-secondary">
        <div className="container">
          <div className="row align-items-center justify-content-between g-3">
            <div className="col-md-6 text-center text-md-start">
              <span className="fw-bold text-info">SLAF Trade Training School</span>
              <span className="text-white-50 ms-2">| Management Portal 0.9.0-beta</span>
            </div>
            <div className="col-md-6 text-center text-md-end text-white-50" style={{ fontSize: '0.85rem' }}>
              Copyright © 2026 Sri Lanka Air Force. All rights reserved. <br />
              <span className="cursor-pointer text-info" style={{ cursor: 'pointer' }} onClick={() => toast.info('Privacy policy is managed under military data acts.')}>Privacy Policy</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
