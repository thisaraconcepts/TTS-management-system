import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { SYSTEM_MODULES, openModule, checkModuleAccess, isUserAdmin } from '../utils/navigation'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js'
import { Pie, Bar } from 'react-chartjs-2'

// Register Chart.js models
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

export const Dashboard = () => {
  const { user, hasPermission, hasRole } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [paradeMonitoring, setParadeMonitoring] = useState(null)
  const [loading, setLoading] = useState(true)
  const isAdmin = isUserAdmin(user)

  const fetchSummary = async (isBackground = false) => {
    try {
      const [sumRes, paradeMonRes] = await Promise.all([
        axios.get('/api/v1/dashboard/summary', {
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
          params: { _t: Date.now() }
        }),
        axios.get('/api/v1/parade/monitoring/summary', {
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
          params: { _t: Date.now() }
        }).catch(() => ({ data: null }))
      ])
      setSummary(sumRes.data)
      setParadeMonitoring(paradeMonRes.data)
    } catch (err) {
      console.error('Failed to load dashboard summary', err)
    } finally {
      if (!isBackground) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    fetchSummary(false)

    // Periodic real-time update every 15 seconds
    const interval = setInterval(() => {
      fetchSummary(true)
    }, 15000)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchSummary(true)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  if (loading || !summary) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading Dashboard Summary...</span>
        </div>
      </div>
    )
  }

  const { parade, accommodation, academic, recent_activities } = summary

  // Pie Chart Data: Parade State Distribution
  const pieData = {
    labels: ['Present', 'Sick Report', 'Hospital', 'Leave', 'TDY', 'Course Visit', 'Detached', 'AWOL'],
    datasets: [
      {
        data: [
          parade.present,
          parade.sick_report,
          parade.hospital,
          parade.leave,
          parade.temp_duty,
          parade.course_visit,
          parade.detached_duty,
          parade.awol,
        ],
        backgroundColor: [
          '#10b981', // green
          '#f59e0b', // orange
          '#f87171', // light red
          '#3b82f6', // blue
          '#8b5cf6', // purple
          '#ec4899', // pink
          '#6b7280', // gray
          '#ef4444', // bold red
        ],
        borderWidth: 1,
      },
    ],
  }

  // Bar Chart Data: Performance Analysis
  const barData = {
    labels: ['Class Pass Rate', 'Bed Occupancy', 'Active Courses'],
    datasets: [
      {
        label: 'System Performance %',
        data: [academic.average_pass_rate, accommodation.occupancy_rate, academic.course_count * 10], // scaled
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  }

  const chartTextColor = theme === 'dark' ? '#f3f4f6' : '#1f2937'
  const chartGridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'

  return (
    <div className="fade-in-slide">
      {/* Top Header */}
      <div className="d-flex justify-content-between align-items-start align-items-sm-center mb-4 flex-column flex-sm-row gap-2">
        <div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <h2 className="mb-0 text-primary display-font fw-bold">Executive Dashboard</h2>
            <span className={`badge ${isAdmin ? 'bg-primary' : 'bg-secondary'} px-2.5 py-1 fw-semibold`}>
              <i className={`bi ${isAdmin ? 'bi-shield-fill-check' : 'bi-person-badge'} me-1`}></i>
              {isAdmin ? 'ADMIN SESSION' : `${user?.role?.name || 'STANDARD USER'}`}
            </span>
          </div>
          <p className="text-muted mb-0 small">
            Central operational gateway and status overview for Sri Lanka Air Force Trade Training School
          </p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2 shadow-xs fw-semibold w-100 w-sm-auto justify-content-center" onClick={fetchSummary}>
          <i className="bi bi-arrow-clockwise"></i> Refresh Status
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="row g-2 g-sm-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card slaf-card kpi-card p-3 d-flex flex-column h-100 shadow-xs">
            <span className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.72rem' }}>Total Enrolled</span>
            <h3 className="mb-0 mt-2 fw-bold">{parade.total_enrolled}</h3>
            <span className="text-muted mt-1 small" style={{ fontSize: '0.68rem' }}>Registered trainees</span>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card slaf-card kpi-card success p-3 d-flex flex-column h-100 shadow-xs">
            <span className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.72rem' }}>Present Strength</span>
            <h3 className="mb-0 mt-2 fw-bold text-success">{parade.present}</h3>
            <span className="text-muted mt-1 small" style={{ fontSize: '0.68rem' }}>On-duty strength</span>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card slaf-card kpi-card warning p-3 d-flex flex-column h-100 shadow-xs">
            <span className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.72rem' }}>Sick / Hospital</span>
            <h3 className="mb-0 mt-2 fw-bold text-warning">{parade.sick_report + parade.hospital}</h3>
            <span className="text-muted mt-1 small" style={{ fontSize: '0.68rem' }}>Medical category</span>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card slaf-card kpi-card danger p-3 d-flex flex-column h-100 shadow-xs">
            <span className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.72rem' }}>Absent / AWOL</span>
            <h3 className="mb-0 mt-2 fw-bold text-danger">{parade.leave + parade.awol}</h3>
            <span className="text-muted mt-1 small" style={{ fontSize: '0.68rem' }}>Out of camp limits</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          CENTRAL MODULE LAUNCHER & WORKSPACE GATEWAY
      ══════════════════════════════════════════════════════════════ */}
      <div className="card slaf-card p-4 mb-4 border-0 shadow-sm">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <div>
            <h5 className="card-title mb-0 fw-bold display-font text-body d-flex align-items-center gap-2">
              <i className="bi bi-grid-3x3-gap-fill text-primary"></i>
              SLAF TTS Operational Modules & Workspaces
            </h5>
            <small className="text-muted">
              Select an authorized operational module below. Permissions are dynamically validated per session.
            </small>
          </div>
          <span className="badge bg-light text-secondary border px-2.5 py-1.5 small">
            Logged In: <strong>{user?.full_name}</strong> ({user?.role?.name})
          </span>
        </div>

        <div className="row g-3">
          {SYSTEM_MODULES.map((mod) => {
            const hasAccess = checkModuleAccess(user, mod.permissionCode, hasPermission)

            return (
              <div key={mod.id} className="col-12 col-sm-6 col-lg-3">
                <div
                  className={`card h-100 p-3.5 border transition-all cursor-pointer position-relative ${hasAccess ? 'hover-shadow-md border-secondary border-opacity-25' : 'bg-light bg-opacity-75 border-secondary border-opacity-10 opacity-75'
                    }`}
                  style={{
                    borderRadius: '12px',
                    transition: 'all 0.2s ease-in-out',
                    cursor: 'pointer'
                  }}
                  onClick={() => openModule(navigate, mod, user, hasPermission)}
                  title={hasAccess ? `Open ${mod.title}` : `Access Restricted: Requires ${mod.permissionCode}`}
                >
                  <div className="d-flex justify-content-between align-items-start mb-2.5">
                    <div
                      className="d-inline-flex align-items-center justify-content-center rounded-3 p-2.5 shadow-xs"
                      style={{
                        backgroundColor: mod.bgColor,
                        color: mod.color,
                        width: '44px',
                        height: '44px'
                      }}
                    >
                      <i className={`bi ${mod.icon} fs-5`}></i>
                    </div>

                    <span
                      className={`badge rounded-pill px-2 py-1 ${hasAccess
                        ? (isAdmin ? 'bg-primary-subtle text-primary border border-primary-subtle' : 'bg-success-subtle text-success border border-success-subtle')
                        : 'bg-danger-subtle text-danger border border-danger-subtle'
                        }`}
                      style={{ fontSize: '0.68rem', fontWeight: 600 }}
                    >
                      {hasAccess ? (isAdmin ? 'Admin' : 'Authorized') : 'Restricted'}
                    </span>
                  </div>

                  <h6 className="fw-bold text-body mb-1" style={{ fontSize: '0.92rem' }}>
                    {mod.title}
                  </h6>

                  <p className="text-muted mb-3 flex-grow-1" style={{ fontSize: '0.78rem', lineHeight: '1.35' }}>
                    {mod.description}
                  </p>

                  <div className="d-flex align-items-center justify-content-between pt-2 border-top border-secondary border-opacity-10 mt-auto">
                    <small className="text-muted fw-semibold" style={{ fontSize: '0.72rem' }}>
                      {mod.category}
                    </small>
                    <span
                      className={`small fw-bold d-inline-flex align-items-center gap-1 ${hasAccess ? 'text-primary' : 'text-danger'
                        }`}
                      style={{ fontSize: '0.78rem' }}
                    >
                      {hasAccess ? (
                        <>Open <i className="bi bi-arrow-right"></i></>
                      ) : (
                        <><i className="bi bi-lock-fill"></i> Locked</>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Parade State Submission Monitoring Quick Widget */}
      {paradeMonitoring && (
        <div className="card slaf-card p-3 mb-4 border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#fff' }}>
          <div className="d-flex justify-content-between align-items-center flex-column flex-lg-row gap-3">
            <div className="d-flex align-items-center gap-3 text-center text-sm-start flex-column flex-sm-row">
              <div className="rounded p-2 bg-primary bg-opacity-25 text-primary flex-shrink-0">
                <i className="bi bi-clipboard2-check-fill fs-3 text-info" />
              </div>
              <div>
                <div className="fw-bold text-white mb-0" style={{ fontSize: '1rem' }}>
                  Today's Parade State Submission Status ({paradeMonitoring.date})
                </div>
                <div className="text-white-50 small">
                  Official daily strength aggregates approved parade states only.
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-3 flex-wrap justify-content-center justify-content-lg-end w-100 w-lg-auto">
              <div className="d-flex gap-1.5 gap-sm-2 flex-wrap justify-content-center">
                <div className="px-2.5 px-sm-3 py-1 rounded bg-white bg-opacity-10 text-center">
                  <div className="fw-bold fs-6 text-white">{paradeMonitoring.total_required}</div>
                  <div className="text-white-50" style={{ fontSize: '0.68rem' }}>Required</div>
                </div>
                <div className="px-2.5 px-sm-3 py-1 rounded bg-danger bg-opacity-20 text-center border border-danger border-opacity-25">
                  <div className="fw-bold fs-6 text-danger">{paradeMonitoring.not_submitted}</div>
                  <div className="text-danger" style={{ fontSize: '0.68rem' }}>Not Submitted</div>
                </div>
                <div className="px-2.5 px-sm-3 py-1 rounded bg-warning bg-opacity-20 text-center border border-warning border-opacity-25">
                  <div className="fw-bold fs-6 text-warning">{paradeMonitoring.pending_approval}</div>
                  <div className="text-warning" style={{ fontSize: '0.68rem' }}>Pending</div>
                </div>
                <div className="px-2.5 px-sm-3 py-1 rounded bg-success bg-opacity-20 text-center border border-success border-opacity-25">
                  <div className="fw-bold fs-6 text-success">{paradeMonitoring.approved}</div>
                  <div className="text-success" style={{ fontSize: '0.68rem' }}>Approved</div>
                </div>
                {paradeMonitoring.returned > 0 && (
                  <div className="px-2.5 px-sm-3 py-1 rounded bg-danger bg-opacity-20 text-center border border-danger border-opacity-25">
                    <div className="fw-bold fs-6 text-danger">{paradeMonitoring.returned}</div>
                    <div className="text-danger" style={{ fontSize: '0.68rem' }}>Returned</div>
                  </div>
                )}
              </div>

              <button
                onClick={() => openModule(navigate, SYSTEM_MODULES.find(m => m.id === 'parade'), user, hasPermission)}
                className="btn btn-info btn-sm fw-semibold text-dark shadow-sm w-100 w-sm-auto"
              >
                <i className="bi bi-speedometer2 me-1" />
                Manage Monitoring
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Graphs Layout */}
      <div className="row g-4 mb-4">
        <div className="col-lg-6 col-md-12">
          <div className="card slaf-card p-3 p-sm-4 h-100 shadow-xs">
            <h5 className="card-title mb-3 fw-bold">Trainee Strength Distribution</h5>
            <div className="mx-auto position-relative" style={{ maxWidth: '320px', height: '260px' }}>
              <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 }, color: chartTextColor } } } }} />
            </div>
          </div>
        </div>
        <div className="col-lg-6 col-md-12">
          <div className="card slaf-card p-3 p-sm-4 h-100 shadow-xs">
            <h5 className="card-title mb-3 fw-bold">Performance & Accommodation</h5>
            <div className="position-relative" style={{ height: '260px' }}>
              <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { color: chartTextColor }, grid: { color: chartGridColor } }, y: { ticks: { color: chartTextColor }, grid: { color: chartGridColor } } }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 }, color: chartTextColor } } } }} />
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Sub-layouts */}
      <div className="row g-4">
        {/* Recent Audit Logs (Only visible to System Administrators & Security Officers) */}
        {(hasPermission('system:audit') || hasRole('Super Administrator') || hasRole('System Administrator') || isAdmin) && (
          <div className="col-lg-7 col-md-12">
            <div className="card slaf-card p-4 h-100 shadow-xs">
              <h5 className="card-title mb-3 fw-bold">Recent Security & Audit Logs</h5>
              <div className="table-responsive">
                <table className="table slaf-table mb-0">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Action</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent_activities.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center text-muted">No audit trails recorded</td>
                      </tr>
                    ) : (
                      recent_activities.map((log) => (
                        <tr key={log.id}>
                          <td><span className="fw-semibold">{log.username}</span></td>
                          <td>{log.action}</td>
                          <td><small className="text-muted">{new Date(log.created_at).toLocaleString()}</small></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Accommodation Occupancy Card */}
        <div className={(hasPermission('system:audit') || hasRole('Super Administrator') || hasRole('System Administrator') || isAdmin) ? 'col-lg-5 col-md-12' : 'col-12'}>
          <div className="card slaf-card p-4 h-100 shadow-xs">
            <h5 className="card-title mb-3 fw-bold">Accommodation Summary</h5>
            <div className="d-flex flex-column gap-3">
              <div className="d-flex justify-content-between align-items-center">
                <span>Total beds configured</span>
                <span className="fw-bold">{accommodation.total_beds}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span>Currently occupied</span>
                <span className="fw-bold text-primary">{accommodation.occupied_beds}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span>Bed occupancy rate</span>
                <span className="fw-bold text-success">{accommodation.occupancy_rate}%</span>
              </div>
              <div className="progress mt-2" style={{ height: '10px' }}>
                <div
                  className="progress-bar bg-success"
                  role="progressbar"
                  style={{ width: `${accommodation.occupancy_rate}%` }}
                  aria-valuenow={accommodation.occupancy_rate}
                  aria-valuemin="0"
                  aria-valuemax="100"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
export default Dashboard
