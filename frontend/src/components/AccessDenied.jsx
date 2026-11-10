import React from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { goToHomePortal, isUserAdmin } from '../utils/navigation'

export const AccessDenied = ({ moduleTitle, permissionCode, attemptedPath }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  // Retrieve metadata from props or router state if available
  const state = location.state || {}
  const displayTitle = moduleTitle || state.moduleTitle || 'Restricted Operational Workspace'
  const displayCode = permissionCode || state.permissionCode || 'Access Permission Required'
  const displayPath = attemptedPath || state.attemptedPath || location.pathname
  const isAdmin = isUserAdmin(user)

  return (
    <div className="py-4 py-md-5 fade-in-slide">
      <div className="section-card mx-auto" style={{ maxWidth: 620 }}>
        <div className="section-card-body p-4 p-md-5">
          <div className="d-flex align-items-center gap-3 mb-4">
            <span className="module-tile-icon" style={{ background: 'var(--tint-danger)', color: 'var(--color-danger)' }}>
              <i className="bi bi-shield-lock"></i>
            </span>
            <div>
              <span className="page-eyebrow" style={{ color: 'var(--color-danger)' }}>Access restricted</span>
              <h2 className="page-title mb-0">You don't have access to this module</h2>
            </div>
          </div>

          <p className="text-muted mb-4">
            Your account doesn't have the permission needed to open <strong className="text-body">{displayTitle}</strong>.
            If you need it for your duties, ask the System Administrator or the Officer Commanding Training (OCT).
          </p>

          <dl className="kv-list mb-4">
            <div><dt>Module</dt><dd>{displayTitle}</dd></div>
            <div><dt>Permission required</dt><dd><code className="text-danger">{displayCode}</code></dd></div>
            <div><dt>Signed in as</dt><dd>{user?.full_name || 'Anonymous'} <span className="text-muted fw-normal">({user?.username})</span></dd></div>
            <div><dt>Role</dt><dd>{user?.role?.name || 'Standard user'}{isAdmin ? ' · Admin' : ''}</dd></div>
            <div><dt>Requested page</dt><dd className="text-truncate" style={{ maxWidth: '60%' }}>{displayPath}</dd></div>
          </dl>

          <div className="d-flex flex-column flex-sm-row gap-2">
            <button
              type="button"
              className="btn btn-primary d-inline-flex align-items-center justify-content-center gap-2"
              onClick={() => goToHomePortal(navigate)}
            >
              <i className="bi bi-house-door"></i> Back to home
            </button>
            <Link to="/profile" className="btn btn-outline-secondary d-inline-flex align-items-center justify-content-center gap-2">
              <i className="bi bi-person-badge"></i> View my permissions
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccessDenied
