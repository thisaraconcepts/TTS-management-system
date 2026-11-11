import React from 'react'
import { NavLink, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useInstallPrompt } from '../utils/installPrompt'

export const Sidebar = ({ isOpen, onClose, isCollapsed, onToggleCollapse }) => {
  const [canInstall, promptInstall] = useInstallPrompt()
  const { hasPermission, hasRole } = useAuth()
  const location = useLocation()
  const path = location.pathname
  const queryParams = new URLSearchParams(location.search)
  const curTab = queryParams.get('tab') || ''
  const curView = queryParams.get('view') || ''

  // Determine which module layout to display (Exact modular view architecture)
  const isAccommodation = path.startsWith('/accommodation')
  const isStudent = path.startsWith('/students')
  const isParade = path.startsWith('/parade')
  const isAcademic = path.startsWith('/academic')
  const isReport = path.startsWith('/reports')
  const isAdmin = path.startsWith('/admin')

  const renderSidebarContent = () => {
    if (isAccommodation) {
      return (
        <>
          <div className="sidebar-module-header px-4 py-2 text-white-50 small fw-bold text-uppercase border-bottom border-secondary mb-3 d-flex align-items-center">
            <i className="bi bi-house-door me-2"></i>
            <span className="module-header-text">Housing Module</span>
          </div>

          <NavLink to="/dashboard" className="nav-link nav-link-back mb-2" title="Back to Home Portal">
            <i className="bi bi-arrow-left-circle-fill"></i>
            <span>All modules</span>
          </NavLink>

          <NavLink to="/accommodation" end className="nav-link" title="Dashboard">
            <i className="bi bi-speedometer2"></i>
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/accommodation/billets" className="nav-link" title="Billet Management">
            <i className="bi bi-building"></i>
            <span>Billet Management</span>
          </NavLink>
          <NavLink to="/accommodation/bunks" className="nav-link" title="Bunk Bed Management">
            <i className="bi bi-layout-three-columns"></i>
            <span>Bunk Bed Management</span>
          </NavLink>
          <NavLink to="/accommodation/allocate" className="nav-link" title="Bed Allocation">
            <i className="bi bi-door-closed"></i>
            <span>Bed Allocation</span>
          </NavLink>
          <NavLink to="/accommodation/trainees" className="nav-link" title="Trainee Accommodation">
            <i className="bi bi-people-fill"></i>
            <span>Trainee Accommodation</span>
          </NavLink>
          <NavLink to="/accommodation/transfers" className="nav-link" title="Transfer & Release">
            <i className="bi bi-arrow-left-right"></i>
            <span>Transfer / Release</span>
          </NavLink>
          <NavLink to="/accommodation/history" className="nav-link" title="Accommodation History">
            <i className="bi bi-clock-history"></i>
            <span>Accommodation History</span>
          </NavLink>
          <NavLink to="/accommodation/reports" className="nav-link" title="Reports & Analytics">
            <i className="bi bi-file-earmark-bar-graph"></i>
            <span>Reports & Analytics</span>
          </NavLink>
          <NavLink to="/accommodation/map" className="nav-link" title="Visual Bunk Map">
            <i className="bi bi-geo-alt"></i>
            <span>Visual Bunk Map</span>
          </NavLink>

        </>
      )
    }

    if (isStudent) {
      return (
        <>
          <div className="sidebar-module-header px-4 py-2 text-white-50 small fw-bold text-uppercase border-bottom border-secondary mb-3 d-flex align-items-center">
            <i className="bi bi-people me-2"></i>
            <span className="module-header-text">Trainees Module</span>
          </div>

          <NavLink to="/dashboard" className="nav-link nav-link-back mb-2" title="Back to Home Portal">
            <i className="bi bi-arrow-left-circle-fill"></i>
            <span>All modules</span>
          </NavLink>

          <NavLink to="/students" end className="nav-link" title="Trainee Directory">
            <i className="bi bi-people-fill"></i>
            <span>Trainee Directory</span>
          </NavLink>
          {hasPermission('student:write') && (
            <NavLink to="/students/new" className="nav-link" title="Add New Trainee">
              <i className="bi bi-person-plus-fill"></i>
              <span>Add New Trainee</span>
            </NavLink>
          )}
          {hasPermission('personal_occurrence:read') && (
            <NavLink to="/students/occurrences" className="nav-link" title="Personal Occurrence Reporting">
              <i className="bi bi-shield-exclamation"></i>
              <span>Personal Occurrence Reporting</span>
            </NavLink>
          )}

        </>
      )
    }

    if (isParade) {
      const curTab = queryParams.get('tab') || 'monitoring'
      return (
        <>
          <div className="sidebar-module-header px-4 py-2 text-white-50 small fw-bold text-uppercase border-bottom border-secondary mb-3 d-flex align-items-center">
            <i className="bi bi-clipboard2-check me-2"></i>
            <span className="module-header-text">Parade State Module</span>
          </div>

          <NavLink to="/dashboard" className="nav-link nav-link-back mb-2" title="Back to Home Portal">
            <i className="bi bi-arrow-left-circle-fill"></i>
            <span>All modules</span>
          </NavLink>

          <NavLink
            to="/parade?tab=monitoring"
            className={() => `nav-link ${(curTab === 'monitoring' || curTab === 'outstanding') ? 'active' : ''}`}
            title="Outstanding & Monitoring"
          >
            <i className="bi bi-speedometer2"></i>
            <span>Outstanding / Monitoring</span>
          </NavLink>
          <NavLink
            to="/parade?tab=record"
            className={() => `nav-link ${curTab === 'record' ? 'active' : ''}`}
            title="Submit Parade State"
          >
            <i className="bi bi-clipboard2-check-fill"></i>
            <span>Submit Parade State</span>
          </NavLink>
          <NavLink
            to="/parade?tab=night"
            className={() => `nav-link ${curTab === 'night' ? 'active' : ''}`}
            title="Night Parade / Roll Call"
          >
            <i className="bi bi-moon-stars-fill"></i>
            <span>Night Parade / Roll Call</span>
          </NavLink>
          {hasPermission('parade:approve') && (
            <NavLink
              to="/parade?tab=approvals"
              className={() => `nav-link ${curTab === 'approvals' ? 'active' : ''}`}
              title="Pending Approvals"
            >
              <i className="bi bi-shield-check"></i>
              <span>Pending Approvals</span>
            </NavLink>
          )}
          <NavLink
            to="/parade?tab=daterange"
            className={() => `nav-link ${curTab === 'daterange' ? 'active' : ''}`}
            title="Date-Range Monitoring"
          >
            <i className="bi bi-calendar3-range"></i>
            <span>Date Range Monitoring</span>
          </NavLink>
          <NavLink
            to="/parade?tab=history"
            className={() => `nav-link ${curTab === 'history' ? 'active' : ''}`}
            title="Parade History"
          >
            <i className="bi bi-clock-history"></i>
            <span>Parade State History</span>
          </NavLink>

          {hasPermission('reports:read') && (
            <NavLink
              to="/reports?tab=parade"
              className="nav-link"
              title="Official Parade Reports"
            >
              <i className="bi bi-file-earmark-bar-graph"></i>
              <span>Official Reports</span>
            </NavLink>
          )}

        </>
      )
    }

    if (isAcademic) {
      const isTrades = curView === 'trades'
      const isCalendar = curView === 'calendar'
      return (
        <>
          <div className="sidebar-module-header px-4 py-2 text-white-50 small fw-bold text-uppercase border-bottom border-secondary mb-3 d-flex align-items-center">
            <i className="bi bi-journal-bookmark me-2"></i>
            <span className="module-header-text">Academic Module</span>
          </div>

          <NavLink to="/dashboard" className="nav-link nav-link-back mb-2" title="Back to Home Portal">
            <i className="bi bi-arrow-left-circle-fill"></i>
            <span>All modules</span>
          </NavLink>

          <NavLink
            to="/academic"
            end
            className={() => `nav-link ${(!isTrades && !isCalendar && path === '/academic') ? 'active' : ''}`}
            title="Course Syllabus"
          >
            <i className="bi bi-journal-bookmark-fill"></i>
            <span>Course Syllabus</span>
          </NavLink>
          <NavLink
            to="/academic?view=calendar"
            className={() => `nav-link ${isCalendar ? 'active' : ''}`}
            title="Course Calendar"
          >
            <i className="bi bi-calendar-range-fill"></i>
            <span>Course Calendar</span>
          </NavLink>
          {hasPermission('academic:write') && (
            <NavLink
              to="/academic?view=trades"
              className={() => `nav-link ${isTrades ? 'active' : ''}`}
              title="Trade Management"
            >
              <i className="bi bi-gear-fill"></i>
              <span>Trade Management</span>
            </NavLink>
          )}

        </>
      )
    }

    if (isReport) {
      return (
        <>
          <div className="sidebar-module-header px-4 py-2 text-white-50 small fw-bold text-uppercase border-bottom border-secondary mb-3 d-flex align-items-center">
            <i className="bi bi-file-earmark-bar-graph me-2"></i>
            <span className="module-header-text">Reports & Analytics</span>
          </div>

          {/* Direct Return Button to Origin Module */}
          {curTab === 'parade' ? (
            <NavLink to="/parade?tab=monitoring" className="nav-link nav-link-back mb-2" title="Back to Parade State">
              <i className="bi bi-arrow-left-circle-fill"></i>
              <span>Back to Parade State</span>
            </NavLink>
          ) : curTab === 'student' ? (
            <NavLink to="/students" className="nav-link nav-link-back mb-2" title="Back to Trainees">
              <i className="bi bi-arrow-left-circle-fill"></i>
              <span>Back to Trainees</span>
            </NavLink>
          ) : curTab === 'accommodation' ? (
            <NavLink to="/accommodation" className="nav-link nav-link-back mb-2" title="Back to Housing">
              <i className="bi bi-arrow-left-circle-fill"></i>
              <span>Back to Housing</span>
            </NavLink>
          ) : (curTab === 'academic_results' || curTab === 'attendance' || curTab === 'course_calendar') ? (
            <NavLink to="/academic" className="nav-link nav-link-back mb-2" title="Back to Academic Module">
              <i className="bi bi-arrow-left-circle-fill"></i>
              <span>Back to Academic</span>
            </NavLink>
          ) : (
            <NavLink to="/dashboard" className="nav-link nav-link-back mb-2" title="Back to Home Portal">
              <i className="bi bi-arrow-left-circle-fill"></i>
              <span>All modules</span>
            </NavLink>
          )}

          <NavLink to="/reports" end className={() => `nav-link ${!curTab ? 'active' : ''}`} title="Enterprise Report Center">
            <i className="bi bi-speedometer2"></i>
            <span>Report Center</span>
          </NavLink>
          <NavLink to="/reports?tab=student" className={() => `nav-link ${curTab === 'student' ? 'active' : ''}`} title="Trainee Dossiers">
            <i className="bi bi-person-lines-fill"></i>
            <span>Trainee Dossiers</span>
          </NavLink>
          <NavLink to="/reports?tab=parade" className={() => `nav-link ${curTab === 'parade' ? 'active' : ''}`} title="Parade Strength">
            <i className="bi bi-clipboard2-check-fill"></i>
            <span>Parade Strength</span>
          </NavLink>
          <NavLink to="/reports?tab=academic_results" className={() => `nav-link ${curTab === 'academic_results' ? 'active' : ''}`} title="Academic Results">
            <i className="bi bi-award-fill"></i>
            <span>Academic Results</span>
          </NavLink>
          <NavLink to="/reports?tab=attendance" className={() => `nav-link ${curTab === 'attendance' ? 'active' : ''}`} title="Class Attendance">
            <i className="bi bi-calendar-check-fill"></i>
            <span>Class Attendance</span>
          </NavLink>
          <NavLink to="/reports?tab=accommodation" className={() => `nav-link ${curTab === 'accommodation' ? 'active' : ''}`} title="Bunk Housing">
            <i className="bi bi-building-fill"></i>
            <span>Bunk Housing</span>
          </NavLink>
          <NavLink to="/reports?tab=course_calendar" className={() => `nav-link ${curTab === 'course_calendar' ? 'active' : ''}`} title="Course Schedules">
            <i className="bi bi-calendar-range-fill"></i>
            <span>Course Schedules</span>
          </NavLink>
          <NavLink to="/reports?tab=occurrences" className={() => `nav-link ${curTab === 'occurrences' ? 'active' : ''}`} title="Occurrence Log">
            <i className="bi bi-shield-exclamation"></i>
            <span>Occurrences Log</span>
          </NavLink>

        </>
      )
    }

    if (isAdmin) {
      return (
        <>
          <div className="sidebar-module-header px-4 py-2 text-white-50 small fw-bold text-uppercase border-bottom border-secondary mb-3 d-flex align-items-center">
            <i className="bi bi-shield-lock me-2"></i>
            <span className="module-header-text">Security Module</span>
          </div>

          <NavLink to="/dashboard" className="nav-link nav-link-back mb-2" title="Back to Home Portal">
            <i className="bi bi-arrow-left-circle-fill"></i>
            <span>All modules</span>
          </NavLink>

          <NavLink to="/admin" className="nav-link" title="User Accounts">
            <i className="bi bi-gear-fill"></i>
            <span>User Accounts</span>
          </NavLink>

        </>
      )
    }

    // Default main dashboard navigation (Central gateway selector with strict RBAC)
    return (
      <>
        <div className="sidebar-module-header px-4 py-2 text-white-50 small fw-bold text-uppercase border-bottom border-secondary mb-3 d-flex align-items-center">
          <i className="bi bi-grid-3x3-gap me-2"></i>
          <span className="module-header-text">System Navigation</span>
        </div>

        <NavLink to="/dashboard" className="nav-link" title="Executive Overview">
          <i className="bi bi-grid-1x2"></i>
          <span>Executive Overview</span>
        </NavLink>

        {hasPermission('student:read') && (
          <NavLink to="/students" className="nav-link" title="Student Details">
            <i className="bi bi-people"></i>
            <span>Student Details</span>
          </NavLink>
        )}

        {hasPermission('parade:read') && (
          <NavLink to="/parade" className="nav-link" title="Parade State">
            <i className="bi bi-clipboard2-check"></i>
            <span>Parade State</span>
          </NavLink>
        )}

        {hasPermission('room:read') && (
          <NavLink to="/accommodation" className="nav-link" title="Accommodation">
            <i className="bi bi-house-door"></i>
            <span>Accommodation</span>
          </NavLink>
        )}

        {hasPermission('academic:read') && (
          <NavLink to="/academic" className="nav-link" title="Academic Activities">
            <i className="bi bi-journal-bookmark-fill"></i>
            <span>Academic Activities</span>
          </NavLink>
        )}

        {hasPermission('reports:read') && (
          <NavLink to="/reports" className="nav-link" title="Reports & Analytics">
            <i className="bi bi-file-earmark-bar-graph"></i>
            <span>Reports & Analytics</span>
          </NavLink>
        )}

        {(hasRole('Super Administrator') || hasRole('System Administrator') || hasPermission('system:audit')) && (
          <NavLink to="/admin" className="nav-link" title="System Admin">
            <i className="bi bi-gear-fill"></i>
            <span>System Admin</span>
          </NavLink>
        )}
      </>
    )
  }

  return (
    <>
      {isOpen && (
        <div className="sidebar-backdrop d-lg-none" onClick={onClose} />
      )}
      <aside className={`slaf-sidebar d-flex flex-column ${isOpen ? 'show-mobile' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Brand */}
        <div className="d-flex align-items-center position-relative">
          <Link to="/dashboard" className="sidebar-brand flex-grow-1" title="TTS Portal home">
            <img className="sidebar-brand-mark brand-crest" src="/images/tts-crest.jpg" alt="TTS Ekala crest" />
            <span className="sidebar-header-text">
              <span className="sidebar-brand-title d-block">Trade Training School</span>
              <span className="sidebar-brand-sub d-block">Sri Lanka Air Force</span>
            </span>
          </Link>

          {/* Mobile close */}
          <button
            className="btn btn-link d-lg-none position-absolute end-0 me-2 p-2 touch-target"
            onClick={onClose}
            title="Close menu"
            aria-label="Close navigation menu"
          >
            <i className="bi bi-x-lg text-white"></i>
          </button>
        </div>

        {/* Navigation */}
        <nav className="nav flex-column flex-grow-1 pb-3">
          {renderSidebarContent()}
        </nav>

        {/* Footer: collapse toggle (desktop) + version */}
        <div className="sidebar-foot">
          {canInstall && (
            <button
              className="sidebar-collapse-btn sidebar-install-btn d-flex"
              onClick={promptInstall}
              title="Install TTS Portal as an app"
            >
              <i className="bi bi-phone"></i>
              <span className="sidebar-footer-text">Install app</span>
            </button>
          )}
          <button
            className="sidebar-collapse-btn d-none d-lg-flex"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar"
          >
            <i className={`bi ${isCollapsed ? 'bi-layout-sidebar-inset' : 'bi-layout-sidebar'}`}></i>
            <span className="sidebar-footer-text">Collapse</span>
          </button>
          <div className="sidebar-footer-text sidebar-version">TTS Portal v1.0</div>
        </div>
      </aside>
    </>
  )
}
export default Sidebar
