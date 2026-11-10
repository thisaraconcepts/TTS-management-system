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
      {/* ERP Welcome Header Banner */}
      <div className="card slaf-card bg-primary text-white p-4 mb-4 position-relative overflow-hidden border-0 shadow-md">
        <div className="position-absolute end-0 bottom-0 opacity-10 pe-4 pb-2 d-none d-md-block">
          <i className="bi bi-journal-bookmark-fill display-1"></i>
        </div>
        <div className="row align-items-center g-3">
          <div className="col-12 col-lg-8">
            <span className="badge bg-white text-primary fw-bold text-uppercase px-3 py-1 mb-2">
              SLAF TTS Academic Portal
            </span>
            <h3 className="fw-extrabold display-font mb-1 fs-4 fs-md-3">Academic Activities Executive Dashboard</h3>
            <p className="mb-0 text-white-50 small">
              Single Source of Truth (SSOT) for Trade Training, Course Curriculum, Classrooms & Examination Metrics.
            </p>
          </div>
          <div className="col-12 col-lg-4 text-start text-lg-end">
            <button className="btn btn-light text-primary fw-semibold btn-sm me-2 shadow-sm" onClick={fetchDashboardData}>
              <i className="bi bi-arrow-clockwise me-1"></i> Refresh Data
            </button>
            <button className="btn btn-outline-light fw-semibold btn-sm shadow-sm" onClick={() => onNavigate('batches')}>
              <i className="bi bi-plus-circle me-1"></i> New Batch
            </button>
          </div>
        </div>
      </div>

      {/* 9 Primary ERP Summary Tiles */}
      <div className="row g-3 mb-4">
        {/* Total Trades */}
        <div className="col-6 col-md-4 col-xl-4">
          <div className="card slaf-card h-100 p-3 border-start border-4 border-primary shadow-sm hover-elevate cursor-pointer" onClick={() => onNavigate('trades')}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-bold text-uppercase">Total Trades</span>
              <div className="bg-primary-subtle text-primary rounded-circle p-2">
                <i className="bi bi-wrench-adjustable fs-5"></i>
              </div>
            </div>
            <h2 className="fw-extrabold display-font mb-0 text-dark">{stats.total_trades}</h2>
            <small className="text-muted"><i className="bi bi-shield-check text-success me-1"></i>Technical Categories</small>
          </div>
        </div>

        {/* Total Courses */}
        <div className="col-6 col-md-4 col-xl-4">
          <div className="card slaf-card h-100 p-3 border-start border-4 border-info shadow-sm hover-elevate cursor-pointer" onClick={() => onNavigate('courses')}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-bold text-uppercase">Total Courses</span>
              <div className="bg-info-subtle text-info rounded-circle p-2">
                <i className="bi bi-book-half fs-5"></i>
              </div>
            </div>
            <h2 className="fw-extrabold display-font mb-0 text-dark">{stats.total_courses}</h2>
            <small className="text-muted"><i className="bi bi-info-circle text-info me-1"></i>Basic & Advance</small>
          </div>
        </div>

        {/* Active Batches */}
        <div className="col-6 col-md-4 col-xl-4">
          <div className="card slaf-card h-100 p-3 border-start border-4 border-success shadow-sm hover-elevate cursor-pointer" onClick={() => onNavigate('batches')}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-bold text-uppercase">Active Batches</span>
              <div className="bg-success-subtle text-success rounded-circle p-2">
                <i className="bi bi-layers-fill fs-5"></i>
              </div>
            </div>
            <h2 className="fw-extrabold display-font mb-0 text-dark">{stats.active_batches}</h2>
            <small className="text-success fw-semibold"><i className="bi bi-activity me-1"></i>In Progress</small>
          </div>
        </div>

        {/* Active Instructors */}
        <div className="col-6 col-md-4 col-xl-4">
          <div className="card slaf-card h-100 p-3 border-start border-4 border-warning shadow-sm hover-elevate cursor-pointer" onClick={() => onNavigate('instructors')}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-bold text-uppercase">Active Instructors</span>
              <div className="bg-warning-subtle text-warning rounded-circle p-2">
                <i className="bi bi-person-badge-fill fs-5"></i>
              </div>
            </div>
            <h2 className="fw-extrabold display-font mb-0 text-dark">{stats.active_instructors}</h2>
            <small className="text-muted"><i className="bi bi-person-check text-warning me-1"></i>SSOT User Portal</small>
          </div>
        </div>

        {/* Active Students */}
        <div className="col-6 col-md-4 col-xl-4">
          <div className="card slaf-card h-100 p-3 border-start border-4 border-secondary shadow-sm">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-bold text-uppercase">Active Trainees</span>
              <div className="bg-secondary-subtle text-dark rounded-circle p-2">
                <i className="bi bi-people-fill fs-5"></i>
              </div>
            </div>
            <h2 className="fw-extrabold display-font mb-0 text-dark">{stats.active_students}</h2>
            <small className="text-muted"><i className="bi bi-check-circle me-1"></i>Central Student SSOT</small>
          </div>
        </div>

        {/* Available Classrooms */}
        <div className="col-6 col-md-4 col-xl-4">
          <div className="card slaf-card h-100 p-3 border-start border-4 border-teal shadow-sm hover-elevate cursor-pointer" onClick={() => onNavigate('classrooms')} style={{ borderLeftColor: '#0d9488' }}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-bold text-uppercase">Available Classrooms</span>
              <div className="bg-teal-subtle text-teal rounded-circle p-2" style={{ backgroundColor: '#ccfbf1', color: '#0f766e' }}>
                <i className="bi bi-door-open-fill fs-5"></i>
              </div>
            </div>
            <h2 className="fw-extrabold display-font mb-0 text-dark">{stats.available_classrooms}</h2>
            <small className="text-muted"><i className="bi bi-percent me-1"></i>{stats.classroom_utilization_rate}% Occupancy</small>
          </div>
        </div>

        {/* Scheduled Examinations & Tests (Unified) */}
        <div className="col-6 col-md-4 col-xl-4">
          <div className="card slaf-card h-100 p-3 border-start border-4 border-danger shadow-sm hover-elevate cursor-pointer" onClick={() => onNavigate('examinations')} style={{ borderLeftColor: '#dc2626' }}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-bold text-uppercase">Examinations & Tests</span>
              <div className="bg-danger-subtle text-danger rounded-circle p-2">
                <i className="bi bi-award-fill fs-5"></i>
              </div>
            </div>
            <h2 className="fw-extrabold display-font mb-0 text-dark">
              {(Number(stats.upcoming_phase_tests) || 0) + (Number(stats.upcoming_final_exams) || 0)}
            </h2>
            <small className="text-muted d-flex align-items-center flex-wrap gap-1">
              <span className="text-danger fw-semibold">
                <i className="bi bi-clock-history me-1"></i>{stats.upcoming_phase_tests || 0} Phase
              </span>
              <span>•</span>
              <span className="text-dark fw-semibold">
                <i className="bi bi-award me-1"></i>{stats.upcoming_final_exams || 0} Final
              </span>
            </small>
          </div>
        </div>

        {/* Course Calendars */}
        <div className="col-6 col-md-4 col-xl-4">
          <div className="card slaf-card h-100 p-3 border-start border-4 shadow-sm hover-elevate cursor-pointer" onClick={() => onNavigate('calendar')} style={{ borderLeftColor: '#6366f1' }}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-bold text-uppercase">Course Calendars</span>
              <div className="rounded-circle p-2" style={{ backgroundColor: '#e0e7ff', color: '#4338ca' }}>
                <i className="bi bi-calendar-range-fill fs-5"></i>
              </div>
            </div>
            <h2 className="fw-extrabold display-font mb-0 text-dark">{stats.total_courses || 0}</h2>
            <small className="text-primary fw-semibold"><i className="bi bi-arrow-right-circle me-1"></i>View Master Calendars</small>
          </div>
        </div>

        {/* Pending Instructor Assignments */}
        <div className="col-6 col-md-4 col-xl-4">
          <div className="card slaf-card h-100 p-3 border-start border-4 border-warning shadow-sm hover-elevate cursor-pointer" onClick={() => onNavigate('calendar')}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-muted small fw-bold text-uppercase">Pending Instructors</span>
              <div className="bg-warning-subtle text-warning rounded-circle p-2">
                <i className="bi bi-exclamation-triangle-fill fs-5"></i>
              </div>
            </div>
            <h2 className="fw-extrabold display-font mb-0 text-dark">{stats.pending_instructor_assignments || 0}</h2>
            <small className="text-warning-emphasis fw-semibold"><i className="bi bi-person-x me-1"></i>Nomination Pending</small>
          </div>
        </div>
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
                <div className="d-inline-flex align-items-center justify-content-center rounded-circle border border-4 border-primary p-4 shadow-sm" style={{ width: '130px', height: '130px', backgroundColor: '#eff6ff' }}>
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
