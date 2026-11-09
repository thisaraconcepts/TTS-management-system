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
    <div className="container py-5 text-center fade-in-slide">
      <div 
        className="card slaf-card p-4 p-md-5 mx-auto border-0 shadow-lg" 
        style={{ 
          maxWidth: '680px',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '16px'
        }}
      >
        {/* Security Shield Icon */}
        <div className="mb-4">
          <div 
            className="d-inline-flex align-items-center justify-content-center bg-danger bg-opacity-10 text-danger rounded-circle p-3 shadow-xs"
            style={{ width: '90px', height: '90px' }}
          >
            <i className="bi bi-shield-lock-fill" style={{ fontSize: '3.25rem' }}></i>
          </div>
        </div>

        {/* Header Titles */}
        <div className="mb-3">
          <span className="badge bg-danger text-white px-3 py-1.5 fw-bold text-uppercase mb-2 shadow-xs" style={{ letterSpacing: '0.08em', fontSize: '0.75rem' }}>
            <i className="bi bi-exclamation-octagon-fill me-1.5"></i> Access Restricted / Unauthorized
          </span>
          <h2 className="display-font text-body fw-bold mb-1">ACCESS DENIED</h2>
          <p className="text-muted small mb-0">
            Sri Lanka Air Force • Trade Training School Security Gateway
          </p>
        </div>

        {/* Detailed Explanation Alert */}
        <div className="alert alert-danger bg-danger bg-opacity-10 border-danger border-opacity-25 text-start p-3.5 mb-4 rounded-3">
          <div className="d-flex align-items-start gap-2.5">
            <i className="bi bi-shield-x fs-4 text-danger mt-0.5"></i>
            <div className="small text-body">
              <div className="fw-bold text-danger mb-1" style={{ fontSize: '0.9rem' }}>
                You do not have the required security permissions to access this module.
              </div>
              <div>
                Your current account credentials lack the authorization clearance necessary to view or execute operations in <strong>{displayTitle}</strong>.
              </div>
            </div>
          </div>
        </div>

        {/* Authorization Metadata Details */}
        <div className="card slaf-card border text-start p-3 mb-4 rounded-3">
          <div className="row g-2 small">
            <div className="col-12 col-sm-6">
              <span className="text-muted d-block">Requested Module:</span>
              <strong className="text-body">{displayTitle}</strong>
            </div>
            <div className="col-12 col-sm-6">
              <span className="text-muted d-block">Required Permission Code:</span>
              <code className="text-danger fw-bold">{displayCode}</code>
            </div>
            <div className="col-12 col-sm-6 mt-2">
              <span className="text-muted d-block">Authenticated User:</span>
              <span className="text-body fw-semibold">{user?.full_name || 'Anonymous'}</span>
              <small className="text-muted d-block">{user?.rank || 'Trainee/Staff'} ({user?.username})</small>
            </div>
            <div className="col-12 col-sm-6 mt-2">
              <span className="text-muted d-block">Assigned Role:</span>
              <span className={`badge ${isAdmin ? 'bg-primary' : 'bg-secondary'}`}>
                {user?.role?.name || 'Standard User'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="d-flex flex-column flex-sm-row justify-content-center align-items-center gap-2.5">
          <button 
            type="button"
            className="btn btn-primary btn-lg px-4 py-2.5 fw-bold shadow-sm d-inline-flex align-items-center justify-content-center gap-2 w-100 w-sm-auto"
            onClick={() => goToHomePortal(navigate)}
            title="Return to the Executive Dashboard"
          >
            <i className="bi bi-house-door-fill"></i>
            <span>Back to Home Portal</span>
          </button>

          <Link 
            to="/profile" 
            className="btn btn-outline-secondary btn-lg px-3.5 py-2.5 fw-semibold d-inline-flex align-items-center justify-content-center gap-2 w-100 w-sm-auto"
            title="View my authorized permissions"
          >
            <i className="bi bi-person-badge"></i>
            <span>View My Permissions</span>
          </Link>
        </div>

        <div className="mt-4 pt-2 text-muted" style={{ fontSize: '0.72rem' }}>
          Please contact the <strong>System Administrator</strong> or <strong>Officer Commanding Training (OCT)</strong> if you require access to this military workspace.
        </div>
      </div>
    </div>
  )
}

export default AccessDenied
