import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { AcademicCalendarView } from './AcademicCalendarView'

export const AcademicDashboard = ({ onNavigate }) => {
  const [stats, setStats] = useState({
    total_trades: 0,
    total_courses: 0,
    active_batches: 0,
    active_instructors: 0,
    active_students: 0,
    available_classrooms: 0,
    upcoming_phase_tests: 0,
    upcoming_final_exams: 0,
    classroom_utilization_rate: 0,
    batch_distribution_by_trade: [],
    recent_batches: [],
    upcoming_academic_activities: []
  })
  const [loading, setLoading] = useState(true)

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/v1/academic/dashboard-summary')
      setStats(res.data)
    } catch (err) {
      console.error('Failed to load academic dashboard', err)
      toast.error('Failed to load dashboard summary metrics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary me-3" role="status"></div>
        <span className="fw-semibold text-secondary">Loading Academic ERP Dashboard...</span>
      </div>
    )
  }

  return (
    <div className="fade-in-slide">
      {/* Page header */}
      <div className="page-header">
        <div>
          <span className="page-eyebrow">Academics</span>
          <h2 className="page-title">Academic overview</h2>
          <p className="page-subtitle">Trades, courses, batches, classrooms and upcoming examinations.</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-outline-secondary btn-sm" onClick={fetchDashboardData}>
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate('batches')}>
            <i className="bi bi-plus-lg me-1"></i> New batch
          </button>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="row g-3 mb-4 row-cols-2 row-cols-md-3">
        {[
          { label: 'Trades', value: stats.total_trades, foot: 'Technical categories', icon: 'bi-wrench-adjustable', to: 'trades' },
          { label: 'Courses', value: stats.total_courses, foot: 'Basic & advanced', icon: 'bi-book-half', to: 'courses' },
          { label: 'Active batches', value: stats.active_batches, foot: 'In progress', icon: 'bi-layers', to: 'batches', tone: 'accent-success' },
          { label: 'Active instructors', value: stats.active_instructors, foot: 'Portal users', icon: 'bi-person-badge', to: 'instructors' },
          { label: 'Active trainees', value: stats.active_students, foot: 'From trainee records', icon: 'bi-people' },
          { label: 'Available classrooms', value: stats.available_classrooms, foot: `${stats.classroom_utilization_rate}% occupancy`, icon: 'bi-door-open', to: 'classrooms' },
          { label: 'Examinations & tests', value: (Number(stats.upcoming_phase_tests) || 0) + (Number(stats.upcoming_final_exams) || 0), foot: `${stats.upcoming_phase_tests || 0} phase · ${stats.upcoming_final_exams || 0} final`, icon: 'bi-award', to: 'examinations', tone: stats.upcoming_phase_tests ? 'accent-warning' : '' },
          { label: 'Course calendars', value: stats.total_courses || 0, foot: 'View master calendars', icon: 'bi-calendar-range', to: 'calendar' },
          { label: 'Pending instructors', value: stats.pending_instructor_assignments || 0, foot: 'Nomination pending', icon: 'bi-person-exclamation', to: 'calendar', tone: stats.pending_instructor_assignments ? 'accent-danger' : '' },
        ].map((t) => (
          <div key={t.label} className="col">
            {t.to ? (
              <button type="button" className={`stat-tile stat-tile-link w-100 text-start ${t.tone || ''}`} onClick={() => onNavigate(t.to)}>
                <div className="d-flex justify-content-between align-items-start gap-2">
                  <span className="stat-label">{t.label}</span>
                  <i className={`bi ${t.icon} text-muted`}></i>
                </div>
                <div className="stat-value">{t.value}</div>
                <div className="stat-foot">{t.foot}</div>
              </button>
            ) : (
              <div className={`stat-tile ${t.tone || ''}`}>
                <div className="d-flex justify-content-between align-items-start gap-2">
                  <span className="stat-label">{t.label}</span>
                  <i className={`bi ${t.icon} text-muted`}></i>
                </div>
                <div className="stat-value">{t.value}</div>
                <div className="stat-foot">{t.foot}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Primary Landing Page Component: Academic Course Calendar */}
      <AcademicCalendarView onNavigate={onNavigate} />

      {/* Row 2: Analytics & Recent Activity Grid */}

      <div className="row g-3 mb-4">
        {/* Batch Distribution by Trade Widget */}
        <div className="col-lg-7">
          <div className="card slaf-card h-100 p-3 shadow-sm">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h6 className="fw-bold text-dark mb-0">Active Batches Distribution by Trade</h6>
                <small className="text-muted">Batch breakdown across SLAF Technical Categories</small>
              </div>
              <button className="btn btn-link btn-sm text-primary p-0 fw-semibold" onClick={() => onNavigate('trades')}>
                View Trades <i className="bi bi-arrow-right"></i>
              </button>
            </div>
            
            {stats.batch_distribution_by_trade.length === 0 ? (
              <p className="text-muted small py-4 text-center">No trade distribution metrics recorded yet.</p>
            ) : (
              <div className="d-flex flex-column gap-2.5">
                {stats.batch_distribution_by_trade.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-light rounded border">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-semibold text-dark small">
                        <span className="badge bg-primary-subtle text-primary me-2">{item.code}</span>
                        {item.trade}
                      </span>
                      <span className="badge bg-secondary-subtle text-dark fw-bold">{item.active_batches} Active Batch(es)</span>
                    </div>
                    <div className="progress" style={{ height: '6px' }}>
                      <div 
                        className="progress-bar bg-primary" 
                        role="progressbar" 
                        style={{ width: `${Math.min(100, (item.active_batches / Math.max(1, stats.active_batches)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Classroom Utilization Gauge Widget */}
        <div className="col-lg-5">
          <div className="card slaf-card h-100 p-3 shadow-sm d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="fw-bold text-dark mb-0">Classroom Capacity & Occupancy</h6>
                <button className="btn btn-link btn-sm text-primary p-0 fw-semibold" onClick={() => onNavigate('classrooms')}>
                  Manage <i className="bi bi-arrow-right"></i>
                </button>
              </div>
              <p className="text-muted small">Real-time utilization rate of TTS Lecture Halls & Technical Labs.</p>

              <div className="text-center my-3">
                <div className="d-inline-flex align-items-center justify-content-center rounded-circle border border-4 border-primary p-4 shadow-sm" style={{ width: '130px', height: '130px', backgroundColor: 'var(--tint-primary)' }}>
                  <div>
                    <h2 className="fw-extrabold display-font text-primary mb-0">{stats.classroom_utilization_rate}%</h2>
                    <small className="text-muted fw-semibold">Utilized</small>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-light rounded p-3 border">
              <div className="row text-center g-2">
                <div className="col-6 border-end">
                  <span className="text-muted small d-block">Available Rooms</span>
                  <span className="fw-bold text-success fs-5">{stats.available_classrooms}</span>
                </div>
                <div className="col-6">
                  <span className="text-muted small d-block">Total Classrooms</span>
                  <span className="fw-bold text-dark fs-5">{stats.available_classrooms + (stats.classroom_utilization_rate > 0 ? 1 : 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Recently Created Batches & Upcoming Activities */}
      <div className="row g-3">
        {/* Recently Created Batches */}
        <div className="col-lg-8">
          <div className="card slaf-card p-3 shadow-sm">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold text-dark mb-0"><i className="bi bi-clock-history me-2 text-primary"></i>Recently Configured Batches</h6>
              <button className="btn btn-outline-primary btn-sm fw-semibold" onClick={() => onNavigate('batches')}>
                All Batches
              </button>
            </div>
            
            <div className="table-responsive">
              <table className="table slaf-table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Batch Name</th>
                    <th>Course Name</th>
                    <th>Classroom</th>
                    <th>Assigned Instructor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_batches.length === 0 ? (
                    <tr><td colSpan="5" className="text-center py-4 text-muted">No training batches registered yet.</td></tr>
                  ) : (
                    stats.recent_batches.map((b) => (
                      <tr key={b.id}>
                        <td><strong className="text-dark">{b.name}</strong></td>
                        <td><span className="text-muted small">{b.course_name}</span></td>
                        <td><span className="badge bg-secondary-subtle text-dark border">{b.classroom}</span></td>
                        <td><small className="fw-semibold text-primary">{b.instructor}</small></td>
                        <td>
                          <span className={`badge bg-${b.status === 'Active' ? 'success' : 'secondary'}-subtle text-${b.status === 'Active' ? 'success' : 'secondary'} border px-2 py-0.5`}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Quick Academic Timeline & Calendar Widget */}
        <div className="col-lg-4">
          <div className="card slaf-card p-3 shadow-sm h-100">
            <h6 className="fw-bold text-dark mb-3"><i className="bi bi-calendar-event me-2 text-warning"></i>Upcoming Academic Schedule</h6>
            
            <div className="d-flex flex-column gap-2.5">
              {stats.upcoming_academic_activities.map((act, idx) => (
                <div key={idx} className="p-2.5 bg-light rounded border border-start border-3 border-warning">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="fw-bold text-dark small">{act.title}</span>
                    <span className="badge bg-warning-subtle text-warning border" style={{ fontSize: '0.7rem' }}>{act.type}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center text-muted" style={{ fontSize: '0.75rem' }}>
                    <span><i className="bi bi-clock me-1"></i>{act.date}</span>
                    <span><i className="bi bi-geo-alt me-1"></i>{act.location}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
