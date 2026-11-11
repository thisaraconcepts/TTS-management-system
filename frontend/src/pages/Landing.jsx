import React, { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useInstallPrompt } from '../utils/installPrompt'
import { toast } from 'react-toastify'

export const Landing = () => {
  const { user, token } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [canInstall, promptInstall] = useInstallPrompt()
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


  // Solid navbar once the user scrolls past the top of the hero
  const [isScrolled, setIsScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const navSolid = isScrolled || isNavOpen

  // Modules list metadata
  const modulesList = [
    {
      title: 'Trainee Records',
      icon: 'bi-people',
      description: 'Personal profiles, service details, documents and batch assignments for every trainee.',
      path: '/students'
    },
    {
      title: 'Daily Parade State',
      icon: 'bi-clipboard2-check',
      description: 'Morning and night parade strength — present, sick, leave, AWOL and temporary duty.',
      path: '/parade'
    },
    {
      title: 'Accommodation',
      icon: 'bi-house-door',
      description: 'Billets, bunk beds and bed allocation, with live occupancy and vacancy figures.',
      path: '/accommodation'
    },
    {
      title: 'Academics',
      icon: 'bi-journal-bookmark',
      description: 'Courses, batches, timetables, lesson plans, assessments and examination results.',
      path: '/academic'
    },
    {
      title: 'Reports',
      icon: 'bi-bar-chart-line',
      description: 'Formal printable reports and summaries for parade, trainees, housing and academics.',
      path: '/reports'
    },
    {
      title: 'Administration',
      icon: 'bi-shield-lock',
      description: 'User accounts, roles and permissions, and the system audit trail.',
      path: '/admin'
    }
  ]

  const statItems = [
    { label: 'Active trainees', value: stats.active_trainees, icon: 'bi-person-badge' },
    { label: 'Active batches', value: stats.active_batches, icon: 'bi-layers' },
    { label: 'Instructors', value: stats.instructors, icon: 'bi-award' },
    { label: 'Billet buildings', value: stats.buildings, icon: 'bi-building' }
  ]

  const navLinks = [
    { id: 'about', label: 'About' },
    { id: 'modules', label: 'Modules' },
    { id: 'notices', label: 'Notices' },
    { id: 'contact', label: 'Contact' }
  ]

  const noticeTone = (type) =>
    type === 'ALERT' ? 'text-bg-danger' : type === 'WARNING' ? 'text-bg-warning' : 'text-bg-secondary'

  return (
    <div className="d-flex flex-column min-vh-100 bg-app">
      {/* ===== Navigation ===== */}
      <header className={`site-nav ${navSolid ? 'is-solid' : ''}`} ref={navRef}>
        <div className="container d-flex align-items-center justify-content-between" style={{ height: 68 }}>
          <button className="site-brand" onClick={() => handleNavClick('hero')} aria-label="Back to top">
            <img className="sidebar-brand-mark brand-crest" src="/images/tts-crest.jpg" alt="TTS Ekala crest" />
            <span>
              <span className="site-brand-title d-block">Trade Training School</span>
              <span className="site-brand-sub d-block">Sri Lanka Air Force</span>
            </span>
          </button>

          <nav className="d-none d-lg-flex align-items-center gap-4">
            {navLinks.map((l) => (
              <button key={l.id} className="site-nav-link" onClick={() => handleNavClick(l.id)}>{l.label}</button>
            ))}
          </nav>

          <div className="d-flex align-items-center gap-2">
            <button className="icon-btn" onClick={toggleTheme} title={theme === 'light' ? 'Dark theme' : 'Light theme'} aria-label="Toggle theme">
              <i className={`bi ${theme === 'light' ? 'bi-moon' : 'bi-sun'}`}></i>
            </button>
            {token && user ? (
              <Link to="/dashboard" className="btn btn-brass d-none d-sm-inline-flex align-items-center gap-2">
                Open portal <i className="bi bi-arrow-right"></i>
              </Link>
            ) : (
              <Link to="/login" className="btn btn-outline-light btn-on-dark d-none d-sm-inline-flex align-items-center gap-2">
                <i className="bi bi-box-arrow-in-right"></i> Sign in
              </Link>
            )}
            <button
              className="icon-btn d-lg-none"
              type="button"
              onClick={() => setIsNavOpen((prev) => !prev)}
              aria-expanded={isNavOpen}
              aria-label="Toggle navigation menu"
            >
              <i className={`bi ${isNavOpen ? 'bi-x-lg' : 'bi-list'} fs-5`}></i>
            </button>
          </div>
        </div>

        {isNavOpen && (
          <div className="site-mobile-menu d-lg-none">
            {navLinks.map((l) => (
              <button key={l.id} className="menu-link" onClick={() => handleNavClick(l.id)}>{l.label}</button>
            ))}
            <div className="p-3 border-top">
              {token && user ? (
                <Link to="/dashboard" onClick={() => setIsNavOpen(false)} className="btn btn-primary w-100">Open portal</Link>
              ) : (
                <Link to="/login" onClick={() => setIsNavOpen(false)} className="btn btn-primary w-100">Sign in</Link>
              )}
              {canInstall && (
                <button
                  type="button"
                  className="btn btn-outline-secondary w-100 mt-2 d-inline-flex align-items-center justify-content-center gap-2"
                  onClick={() => { setIsNavOpen(false); promptInstall() }}
                >
                  <i className="bi bi-phone"></i> Install app
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ===== Hero ===== */}
      <section id="hero" className="hero">
        <div className="hero-media" style={{ backgroundImage: 'url(/images/tts-building.jpg)' }} aria-hidden="true"></div>
        <div className="hero-scrim" aria-hidden="true"></div>
        <div className="container hero-content">
          <span className="hero-kicker">SLAF Trade Training School · Ekala</span>
          <h1 className="hero-title">Training the tradesmen who keep the Air Force flying.</h1>
          <p className="hero-lead">
            The TTS Portal brings trainee records, daily parade state, accommodation and academic work into one place — for instructors, section staff and the command.
          </p>
          <div className="d-flex flex-column flex-sm-row gap-2 gap-sm-3">
            {token && user ? (
              <Link to="/dashboard" className="btn btn-brass btn-lg d-inline-flex align-items-center justify-content-center gap-2">
                Go to dashboard <i className="bi bi-arrow-right"></i>
              </Link>
            ) : (
              <Link to="/login" className="btn btn-brass btn-lg d-inline-flex align-items-center justify-content-center gap-2">
                Sign in to the portal <i className="bi bi-arrow-right"></i>
              </Link>
            )}
            <button className="btn btn-outline-light btn-on-dark btn-lg" onClick={() => scrollSection('modules')}>
              What's inside
            </button>
          </div>
        </div>
      </section>

      {/* ===== Live figures ===== */}
      <section className="stat-strip" aria-label="School at a glance">
        <div className="container">
          <div className="row g-0">
            {statItems.map((s) => (
              <div key={s.label} className="col-6 col-md-3">
                <div className="stat-strip-item">
                  <div className="stat-strip-value">
                    {statsLoading ? <span className="placeholder col-4 rounded"></span> : s.value}
                  </div>
                  <div className="stat-strip-label"><i className={`bi ${s.icon}`}></i>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== About ===== */}
      <section id="about" className="site-section">
        <div className="container">
          <div className="row g-5 align-items-center">
            <div className="col-lg-6">
              <span className="section-eyebrow">About the school</span>
              <h2 className="section-title">Where every SLAF tradesman begins.</h2>
              <p className="section-lead">
                The Trade Training School prepares airmen across the Air Force's technical and administrative trades. This portal replaces paper registers and scattered spreadsheets with one secure record that every section works from.
              </p>
              <blockquote className="vision-quote">
                “To be an exemplary station by creating a stimulating and a challenging environment to develop knowledge, skills, talents and attitudes of all tradesmen in SLAF.”
                <cite>Dream of TTS</cite>
              </blockquote>
              <ul className="fact-list">
                <li><i className="bi bi-check2"></i><span>Role-based access — each section sees only what it needs.</span></li>
                <li><i className="bi bi-check2"></i><span>Parade state updated through the day, not at the end of it.</span></li>
                <li><i className="bi bi-check2"></i><span>Formal, print-ready reports in the school's standard format.</span></li>
              </ul>
            </div>
            <div className="col-lg-6">
              <div className="row g-3">
                <div className="col-12">
                  <figure className="photo-frame m-0" style={{ aspectRatio: '16 / 7' }}>
                    <img src="/images/tts-monument.jpg" alt="The Dream of TTS monument at the school" loading="lazy" />
                    <figcaption className="photo-caption">The “Dream of TTS” monument</figcaption>
                  </figure>
                </div>
                <div className="col-12">
                  <figure className="photo-frame m-0" style={{ aspectRatio: '16 / 7' }}>
                    <img src="/images/tts-gate.jpg" alt="Main gate of the Trade Training School" loading="lazy" />
                    <figcaption className="photo-caption">Main gate — ශිල්පීය පුහුණු පාසල</figcaption>
                  </figure>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Modules ===== */}
      <section id="modules" className="site-section alt">
        <div className="container">
          <div className="row align-items-end mb-4 g-3">
            <div className="col-lg-7">
              <span className="section-eyebrow">Portal modules</span>
              <h2 className="section-title mb-0">Everything a section needs, in one portal.</h2>
            </div>
            <div className="col-lg-5">
              <p className="text-muted mb-0">
                Choose a module to open it. You'll be asked to sign in first, and you'll only see the modules your role allows.
              </p>
            </div>
          </div>

          <div className="feature-grid">
            {modulesList.map((m) => (
              <button key={m.path} className="feature-cell" onClick={() => handleModuleClick(m.path)}>
                <i className={`bi ${m.icon} feature-icon`}></i>
                <h3>{m.title}</h3>
                <p>{m.description}</p>
                <span className="feature-link">Open <i className="bi bi-arrow-right"></i></span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Notices ===== */}
      <section id="notices" className="site-section">
        <div className="container">
          <div className="row g-5">
            <div className="col-lg-4">
              <span className="section-eyebrow">Notice board</span>
              <h2 className="section-title">Circulars & announcements</h2>
              <p className="text-muted">
                Notices issued by the Commandant's office and section heads. Alerts and warnings need action — please read them first.
              </p>
              <div className="d-flex gap-2 align-items-start small text-muted border-top pt-3 mt-4">
                <i className="bi bi-shield-check text-brass"></i>
                <span>All sign-ins are recorded. Never share your credentials.</span>
              </div>
            </div>

            <div className="col-lg-8">
              <div className="section-card">
                <div className="section-card-header">
                  <h3 className="section-card-title">Current notices</h3>
                  {!noticesLoading && <span className="text-muted small">{notices.length} active</span>}
                </div>
                <div className="px-3 px-md-4" style={{ maxHeight: 440, overflowY: 'auto' }}>
                  {noticesLoading ? (
                    <div className="d-flex justify-content-center py-5">
                      <div className="spinner-border spinner-border-sm text-primary" role="status">
                        <span className="visually-hidden">Loading notices…</span>
                      </div>
                    </div>
                  ) : notices.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <i className="bi bi-inbox d-block fs-3 mb-2"></i>
                      No notices at the moment.
                    </div>
                  ) : (
                    notices.map((n) => {
                      const d = new Date(n.created_at)
                      return (
                        <article key={n.id} className="notice-item">
                          <div className="notice-date">
                            <div className="d">{d.getDate()}</div>
                            <div className="m">{d.toLocaleDateString(undefined, { month: 'short' })}</div>
                          </div>
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <span className={`badge ${noticeTone(n.type)}`} style={{ fontSize: '0.65rem' }}>{n.type}</span>
                              <span className="text-muted" style={{ fontSize: '0.75rem' }}>{d.getFullYear()}</span>
                            </div>
                            <h4 className="fs-6 fw-semibold mb-1">{n.title}</h4>
                            <p className="mb-0 text-muted small">{n.message}</p>
                          </div>
                        </article>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Call to action ===== */}
      <section className="cta-band">
        <div className="hero-media" style={{ backgroundImage: 'url(/images/tts-gate.jpg)' }} aria-hidden="true"></div>
        <div className="container py-5">
          <div className="row align-items-center g-4 py-3">
            <div className="col-lg-8">
              <h2 className="font-serif mb-2" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>Staff of the Trade Training School?</h2>
              <p className="mb-0" style={{ color: 'rgba(255,255,255,.8)' }}>
                Sign in with the account issued by the system administrator.
              </p>
            </div>
            <div className="col-lg-4 text-lg-end">
              <Link to={token && user ? '/dashboard' : '/login'} className="btn btn-brass btn-lg d-inline-flex align-items-center gap-2">
                {token && user ? 'Go to dashboard' : 'Sign in'} <i className="bi bi-arrow-right"></i>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Footer / Contact ===== */}
      <footer id="contact" className="site-footer mt-auto">
        <div className="container py-5">
          <div className="row g-4">
            <div className="col-lg-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <img className="sidebar-brand-mark brand-crest" src="/images/tts-crest.jpg" alt="TTS Ekala crest" />
                <span>
                  <span className="sidebar-brand-title d-block">Trade Training School</span>
                  <span className="sidebar-brand-sub d-block">Sri Lanka Air Force</span>
                </span>
              </div>
              <p className="mb-0" style={{ maxWidth: '34ch' }}>
                Management portal for trainee administration, academics, accommodation and parade state.
              </p>
            </div>
            <div className="col-sm-6 col-lg-3">
              <h4>Address</h4>
              <p className="mb-0">
                Trade Training School<br />
                Sri Lanka Air Force Station<br />
                Ekala, Sri Lanka
              </p>
            </div>
            <div className="col-sm-6 col-lg-3">
              <h4>Contact</h4>
              <p className="mb-1"><i className="bi bi-telephone me-2"></i>+94 11 2245362 (Ext. 26522)</p>
              <p className="mb-1"><i className="bi bi-printer me-2"></i>+94 11 2245363</p>
              <p className="mb-1"><i className="bi bi-envelope me-2"></i><a href="mailto:tts.admin@slaf.lk">tts.admin@slaf.lk</a></p>
              <p className="mb-0"><i className="bi bi-life-preserver me-2"></i><a href="mailto:support.portal@slaf.lk">support.portal@slaf.lk</a></p>
            </div>
            <div className="col-lg-2">
              <h4>Portal</h4>
              <ul className="list-unstyled mb-0 d-grid gap-2">
                {navLinks.map((l) => (
                  <li key={l.id}><button className="link" onClick={() => scrollSection(l.id)}>{l.label}</button></li>
                ))}
                <li><Link to="/login">Sign in</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="container py-3 d-flex flex-column flex-md-row justify-content-between gap-2">
            <span>© {new Date().getFullYear()} Sri Lanka Air Force · Trade Training School</span>
            <button className="link" style={{ fontSize: '.78rem' }} onClick={() => toast.info('Privacy policy is managed under military data acts.')}>
              Privacy policy
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
