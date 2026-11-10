import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const Login = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username || !password) return
    
    setLoading(true)
    const success = await login(username, password)
    setLoading(false)
    
    if (success) {
      const from = location.state?.from || '/dashboard'
      navigate(from, { replace: true })
    }
  }

  return (
    <div className="auth-shell">
      {/* Visual side */}
      <aside className="auth-visual">
        <div className="hero-media" style={{ backgroundImage: 'url(/images/tts-building.jpg)' }} aria-hidden="true"></div>
        <div className="hero-scrim" aria-hidden="true"></div>

        <Link to="/" className="auth-layer d-flex align-items-center gap-2 text-decoration-none">
          <span className="sidebar-brand-mark">TTS</span>
          <span>
            <span className="sidebar-brand-title d-block">Trade Training School</span>
            <span className="sidebar-brand-sub d-block">Sri Lanka Air Force</span>
          </span>
        </Link>

        <div className="auth-layer auth-visual-quote" style={{ maxWidth: 460 }}>
          <span className="hero-kicker">Dream of TTS</span>
          <p className="font-serif mt-3 mb-0" style={{ fontSize: '1.35rem', lineHeight: 1.45 }}>
            “To develop knowledge, skills, talents and attitudes of all tradesmen in SLAF.”
          </p>
        </div>
      </aside>

      {/* Form side */}
      <main className="auth-panel">
        <div className="auth-form fade-in-slide">
          <span className="page-eyebrow">TTS Portal</span>
          <h1 className="h3 mt-1 mb-1 fw-semibold">Sign in</h1>
          <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
            Use the account issued by your system administrator.
          </p>

          <form onSubmit={handleSubmit} noValidate={false}>
            <div className="mb-3">
              <label htmlFor="login-username" className="form-label">Username</label>
              <input
                id="login-username"
                type="text"
                className="form-control"
                placeholder="e.g. 12345 or j.perera"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="login-password" className="form-label">Password</label>
              <div className="position-relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-control pe-5"
                  placeholder="Your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="icon-btn icon-btn-sm position-absolute top-50 end-0 translate-middle-y me-2"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-100 d-inline-flex align-items-center justify-content-center gap-2"
              disabled={loading}
            >
              {loading && <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="d-flex align-items-start gap-2 text-muted mt-4 pt-3 border-top" style={{ fontSize: '0.8rem' }}>
            <i className="bi bi-shield-lock"></i>
            <span>Sign-ins are recorded. Forgotten your password? Contact the system administrator.</span>
          </div>

          <Link to="/" className="d-inline-flex align-items-center gap-1 mt-3 text-decoration-none small">
            <i className="bi bi-arrow-left"></i> Back to home
          </Link>
        </div>
      </main>
    </div>
  )
}
export default Login
