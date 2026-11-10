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

  const isDark = theme === 'dark'
  const chartTextColor = isDark ? '#c3cad6' : '#4a5462'
  const chartGridColor = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(16, 24, 40, 0.06)'
  const canSeeAudit = hasPermission('system:audit') || hasRole('Super Administrator') || hasRole('System Administrator') || isAdmin

  // Parade distribution — status colours only, muted
  const paradeSegments = [
    { label: 'Present', value: parade.present, color: '#1f7a4d' },
    { label: 'Sick report', value: parade.sick_report, color: '#d68c12' },
    { label: 'Hospital', value: parade.hospital, color: '#b26a00' },
    { label: 'Leave', value: parade.leave, color: '#2c5ea8' },
    { label: 'Temp. duty', value: parade.temp_duty, color: '#6b85ad' },
    { label: 'Course visit', value: parade.course_visit, color: '#9aaccb' },
    { label: 'Detached', value: parade.detached_duty, color: '#8a94a3' },
    { label: 'AWOL', value: parade.awol, color: '#b42318' },
  ]

  const pieData = {
    labels: paradeSegments.map((s) => s.label),
    datasets: [
      {
        data: paradeSegments.map((s) => s.value),
        backgroundColor: paradeSegments.map((s) => s.color),
        borderColor: isDark ? '#151b24' : '#ffffff',
        borderWidth: 2,
      },
    ],
  }

  const barData = {
    labels: ['Class pass rate', 'Bed occupancy', 'Active courses'],
    datasets: [
      {
        label: 'Percent',
        data: [academic.average_pass_rate, accommodation.occupancy_rate, academic.course_count * 10], // scaled
        backgroundColor: isDark ? '#4f7fc4' : '#1b3f73',
        borderRadius: 4,
        maxBarThickness: 48,
      },
    ],
  }

  const paradeTotal = paradeSegments.reduce((a, s) => a + (s.value || 0), 0)
  const firstName = (user?.full_name || '').split(' ')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const occupancy = Math.max(0, Math.min(100, Number(accommodation.occupancy_rate) || 0))

  return (
    <div className="fade-in-slide">
      {/* Page header */}
      <div className="page-header">
        <div>
          <span className="page-eyebrow">{isAdmin ? 'Administrator' : (user?.role?.name || 'Overview')}</span>
          <h2 className="page-title">{greeting}{firstName ? `, ${firstName}` : ''}</h2>
          <p className="page-subtitle">Today's strength, parade submissions and quick access to your modules.</p>
        </div>
        <button className="btn btn-outline-secondary d-inline-flex align-items-center gap-2" onClick={() => fetchSummary()}>
          <i className="bi bi-arrow-clockwise"></i> Refresh
        </button>
      </div>

      {/* KPIs */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-xl-3">
          <div className="stat-tile accent-primary">
            <div className="stat-label">Total enrolled</div>
            <div className="stat-value">{parade.total_enrolled}</div>
            <div className="stat-foot">Registered trainees</div>
          </div>
        </div>
        <div className="col-6 col-xl-3">
          <div className="stat-tile accent-success">
            <div className="stat-label">Present</div>
            <div className="stat-value text-success">{parade.present}</div>
            <div className="stat-foot">On-duty strength</div>
          </div>
        </div>
        <div className="col-6 col-xl-3">
          <div className="stat-tile accent-warning">
            <div className="stat-label">Sick / hospital</div>
            <div className="stat-value text-warning">{parade.sick_report + parade.hospital}</div>
            <div className="stat-foot">Medical category</div>
          </div>
        </div>
        <div className="col-6 col-xl-3">
          <div className="stat-tile accent-danger">
            <div className="stat-label">Leave / AWOL</div>
            <div className="stat-value text-danger">{parade.leave + parade.awol}</div>
            <div className="stat-foot">Out of camp limits</div>
          </div>
        </div>
      </div>

      {/* Parade submission status */}
      {paradeMonitoring && (
        <div className="section-card mb-4">
          <div className="section-card-header">
            <div>
              <h3 className="section-card-title">Parade state submissions</h3>
              <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                {paradeMonitoring.date} · Daily strength counts approved parade states only
              </div>
            </div>
            <button
              onClick={() => openModule(navigate, SYSTEM_MODULES.find(m => m.id === 'parade'), user, hasPermission)}
              className="btn btn-primary btn-sm d-inline-flex align-items-center gap-2"
            >
              Open monitoring <i className="bi bi-arrow-right"></i>
            </button>
          </div>
          <div className="row g-0 text-center submission-row">
            <div className="col">
              <div className="submission-cell">
                <div className="submission-value">{paradeMonitoring.total_required}</div>
                <div className="submission-label">Required</div>
              </div>
            </div>
            <div className="col">
              <div className="submission-cell">
                <div className="submission-value text-danger">{paradeMonitoring.not_submitted}</div>
                <div className="submission-label">Not submitted</div>
              </div>
            </div>
            <div className="col">
              <div className="submission-cell">
                <div className="submission-value text-warning">{paradeMonitoring.pending_approval}</div>
                <div className="submission-label">Pending</div>
              </div>
            </div>
            <div className="col">
              <div className="submission-cell">
                <div className="submission-value text-success">{paradeMonitoring.approved}</div>
                <div className="submission-label">Approved</div>
              </div>
            </div>
            {paradeMonitoring.returned > 0 && (
              <div className="col">
                <div className="submission-cell">
                  <div className="submission-value text-danger">{paradeMonitoring.returned}</div>
                  <div className="submission-label">Returned</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modules */}
      <div className="section-card mb-4">
        <div className="section-card-header">
          <div>
            <h3 className="section-card-title">Modules</h3>
            <div className="text-muted" style={{ fontSize: '0.8rem' }}>Modules your role can't open are shown as locked.</div>
          </div>
        </div>
        <div className="section-card-body">
          <div className="row g-3">
            {SYSTEM_MODULES.map((mod) => {
              const hasAccess = checkModuleAccess(user, mod.permissionCode, hasPermission)
              return (
                <div key={mod.id} className="col-12 col-sm-6 col-xl-3">
                  <button
                    type="button"
                    className={`module-tile ${hasAccess ? '' : 'is-locked'}`}
                    onClick={() => openModule(navigate, mod, user, hasPermission)}
                    title={hasAccess ? `Open ${mod.title}` : `Restricted — requires ${mod.permissionCode}`}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <span className="module-tile-icon"><i className={`bi ${mod.icon}`}></i></span>
                      {!hasAccess && (
                        <span className="text-muted small d-inline-flex align-items-center gap-1">
                          <i className="bi bi-lock"></i> Locked
                        </span>
                      )}
                    </div>
                    <div className="fw-semibold mb-1" style={{ fontSize: '0.92rem' }}>{mod.title}</div>
                    <p className="text-muted mb-3 flex-grow-1" style={{ fontSize: '0.8rem', lineHeight: 1.45 }}>{mod.description}</p>
                    <div className="d-flex align-items-center justify-content-between pt-2 border-top mt-auto w-100">
                      <span className="text-muted" style={{ fontSize: '0.72rem' }}>{mod.category}</span>
                      {hasAccess && (
                        <span className="text-primary fw-semibold d-inline-flex align-items-center gap-1" style={{ fontSize: '0.78rem' }}>
                          Open <i className="bi bi-arrow-right"></i>
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="row g-4 mb-4">
        <div className="col-lg-6">
          <div className="section-card h-100">
            <div className="section-card-header">
              <h3 className="section-card-title">Trainee strength</h3>
              <span className="text-muted small tabular-nums">{paradeTotal} total</span>
            </div>
            <div className="section-card-body">
              <div className="row align-items-center g-3">
                <div className="col-sm-6">
                  <div className="position-relative mx-auto" style={{ maxWidth: 220, height: 220 }}>
                    {paradeTotal > 0 ? (
                      <Pie
                        data={pieData}
                        options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
                      />
                    ) : (
                      <div className="chart-empty">
                        <i className="bi bi-clipboard2"></i>
                        <span>No approved parade state yet today</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-sm-6">
                  <ul className="list-unstyled mb-0 chart-legend">
                    {paradeSegments.map((s) => (
                      <li key={s.label}>
                        <span className="legend-swatch" style={{ background: s.color }}></span>
                        <span className="flex-grow-1">{s.label}</span>
                        <span className="fw-semibold tabular-nums">{s.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="section-card h-100">
            <div className="section-card-header">
              <h3 className="section-card-title">Performance & accommodation</h3>
            </div>
            <div className="section-card-body">
              <div className="position-relative" style={{ height: 240 }}>
                <Bar
                  data={barData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      x: { ticks: { color: chartTextColor }, grid: { display: false } },
                      y: { ticks: { color: chartTextColor }, grid: { color: chartGridColor }, border: { display: false } }
                    },
                    plugins: { legend: { display: false } }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audit + accommodation */}
      <div className="row g-4">
        {canSeeAudit && (
          <div className="col-lg-7">
            <div className="section-card h-100">
              <div className="section-card-header">
                <h3 className="section-card-title">Recent activity</h3>
                <span className="text-muted small">Audit log</span>
              </div>
              <div className="table-responsive border-0 rounded-0">
                <table className="table table-hover mb-0 align-middle">
                  <thead>
                    <tr>
                      <th className="ps-3">User</th>
                      <th>Action</th>
                      <th className="pe-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent_activities.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center text-muted py-4">No activity recorded yet</td>
                      </tr>
                    ) : (
                      recent_activities.map((log) => (
                        <tr key={log.id}>
                          <td className="ps-3 fw-semibold">{log.username}</td>
                          <td>{log.action}</td>
                          <td className="pe-3 text-muted small text-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className={canSeeAudit ? 'col-lg-5' : 'col-12'}>
          <div className="section-card h-100">
            <div className="section-card-header">
              <h3 className="section-card-title">Accommodation</h3>
            </div>
            <div className="section-card-body">
              <div className="d-flex align-items-baseline gap-2 mb-2">
                <span className="stat-value-lg tabular-nums">{accommodation.occupancy_rate}%</span>
                <span className="text-muted small">beds occupied</span>
              </div>
              <div className="progress mb-4" style={{ height: 8 }} role="progressbar" aria-valuenow={occupancy} aria-valuemin="0" aria-valuemax="100">
                <div className="progress-bar" style={{ width: `${occupancy}%`, background: 'var(--color-primary)' }}></div>
              </div>
              <dl className="kv-list mb-0">
                <div><dt>Beds configured</dt><dd>{accommodation.total_beds}</dd></div>
                <div><dt>Occupied</dt><dd>{accommodation.occupied_beds}</dd></div>
                <div><dt>Vacant</dt><dd>{Math.max(0, (accommodation.total_beds || 0) - (accommodation.occupied_beds || 0))}</dd></div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
export default Dashboard
