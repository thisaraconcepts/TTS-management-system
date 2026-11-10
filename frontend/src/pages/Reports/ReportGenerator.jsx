import React, { useEffect, useState, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'

export const ReportGenerator = () => {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') || 'student'

  // Active Report Module
  const [activeTab, setActiveTab] = useState(initialTab) // student, parade, academic_results, attendance, accommodation, course_calendar

  // Paper Orientation (auto or manual toggle: 'portrait' | 'landscape')
  const [orientation, setOrientation] = useState(() => {
    return ['academic_results', 'attendance', 'parade', 'course_calendar'].includes(initialTab) ? 'landscape' : 'portrait'
  })

  // Loading & Export State
  const [loading, setLoading] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [reportData, setReportData] = useState(null)

  // Master Filter Metadata
  const [filterMeta, setFilterMeta] = useState({
    trades: [],
    courses: [],
    batches: [],
    ranks: [],
    student_statuses: [],
    parade_statuses: [],
    billets: [],
    subjects: []
  })

  // Filter Parameters State
  const [studentParams, setStudentParams] = useState({ trade: '', course_id: '', batch: '', status: '', rank: '', search: '' })
  const [paradeParams, setParadeParams] = useState({ parade_date: new Date().toISOString().substring(0, 10), trade: '', status: '', approval_status: '' })
  const [academicParams, setAcademicParams] = useState({ course_id: '', subject_id: '', batch: '', result_status: 'ALL' })
  const [attendanceParams, setAttendanceParams] = useState({ course_id: '', subject_id: '', batch: '', date_from: '', date_to: '', status: '' })
  const [accommodationParams, setAccommodationParams] = useState({ building_id: '', billet_id: '', status: '', bunk_level: '', trade: '', batch: '' })
  const [calendarParams, setCalendarParams] = useState({ course_id: '', phase: '', date_from: '', date_to: '' })
  const [occurrenceParams, setOccurrenceParams] = useState({ trainee_id: '', occurrence_type: 'ALL', date_from: '', date_to: '', trade: '', batch: '', search: '' })

  // Search keyword inside live preview table
  const [tableSearch, setTableSearch] = useState('')

  // Sync tab from URL
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam)
      setOrientation(['academic_results', 'attendance', 'parade', 'course_calendar', 'occurrences'].includes(tabParam) ? 'landscape' : 'portrait')
    }
  }, [searchParams])

  // 1. Load Filter Master Data
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await axios.get('/api/v1/reports/meta/filters')
        setFilterMeta(res.data)
      } catch (err) {
        console.error('Failed to load filter metadata', err)
      }
    }
    fetchMetadata()
  }, [])

  // 2. Fetch Report Data
  const handleCompileReport = async (tabToFetch = activeTab) => {
    setLoading(true)
    setTableSearch('')
    try {
      let endpoint = '/api/v1/reports/students'
      let params = {}

      if (tabToFetch === 'student') {
        endpoint = '/api/v1/reports/students'
        params = { ...studentParams }
      } else if (tabToFetch === 'parade') {
        endpoint = '/api/v1/reports/parade-state'
        params = { ...paradeParams }
      } else if (tabToFetch === 'academic_results') {
        endpoint = '/api/v1/reports/academic-results'
        params = { ...academicParams }
      } else if (tabToFetch === 'attendance') {
        endpoint = '/api/v1/reports/attendance'
        params = { ...attendanceParams }
      } else if (tabToFetch === 'accommodation') {
        endpoint = '/api/v1/reports/accommodation'
        params = { ...accommodationParams }
      } else if (tabToFetch === 'course_calendar') {
        endpoint = '/api/v1/reports/course-calendar'
        params = { ...calendarParams }
      } else if (tabToFetch === 'occurrences') {
        endpoint = '/api/v1/reports/occurrences'
        params = { ...occurrenceParams }
      }

      // Filter out empty params
      const cleanParams = {}
      Object.keys(params).forEach(k => {
        if (params[k] !== '' && params[k] !== null && params[k] !== undefined) {
          cleanParams[k] = params[k]
        }
      })

      const res = await axios.get(endpoint, { params: cleanParams })
      setReportData(res.data)
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.detail || 'Failed to compile report from database')
    } finally {
      setLoading(false)
    }
  }

  // Compile on tab switch and adjust default orientation
  useEffect(() => {
    setOrientation(['academic_results', 'attendance', 'parade', 'course_calendar'].includes(activeTab) ? 'landscape' : 'portrait')
    handleCompileReport(activeTab)
  }, [activeTab])

  // 3. Print Classical Formal Report
  const handlePrintReport = () => {
    window.print()
  }

  // 4. Native Backend Excel Export
  const handleExportExcel = async () => {
    if (!reportData || !reportData.rows || reportData.rows.length === 0) {
      toast.warning('No data to export.')
      return
    }

    setExportingExcel(true)
    try {
      const payload = {
        report_type: activeTab,
        title: reportData.header?.title || 'SLAF Official Report',
        header_info: reportData.header,
        summary_stats: reportData.summary_stats?.reduce((acc, curr) => {
          acc[curr.label] = curr.value
          return acc
        }, {}),
        columns: reportData.columns,
        rows: reportData.rows
      }

      const res = await axios.post('/api/v1/reports/export/excel', payload, {
        responseType: 'blob'
      })

      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `SLAF_TTS_${activeTab.toUpperCase()}_${new Date().toISOString().substring(0, 10)}.xlsx`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Official Excel spreadsheet downloaded')
    } catch (err) {
      console.error(err)
      toast.error('Failed to generate Excel export')
    } finally {
      setExportingExcel(false)
    }
  }

  // 5. Native Backend PDF Export
  const handleExportPdf = async () => {
    if (!reportData || !reportData.rows || reportData.rows.length === 0) {
      toast.warning('No data to export.')
      return
    }

    setExportingPdf(true)
    try {
      const payload = {
        report_type: activeTab,
        title: reportData.header?.title || 'SLAF Official Report',
        header_info: reportData.header,
        summary_stats: reportData.summary_stats?.reduce((acc, curr) => {
          acc[curr.label] = curr.value
          return acc
        }, {}),
        columns: reportData.columns,
        rows: reportData.rows
      }

      const res = await axios.post('/api/v1/reports/export/pdf', payload, {
        responseType: 'blob'
      })

      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `SLAF_TTS_${activeTab.toUpperCase()}_${new Date().toISOString().substring(0, 10)}.pdf`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Classical PDF document downloaded')
    } catch (err) {
      console.error(err)
      toast.error('Failed to generate PDF document')
    } finally {
      setExportingPdf(false)
    }
  }

  // Filtered Rows inside live preview
  const filteredRows = useMemo(() => {
    if (!reportData || !reportData.rows) return []
    if (!tableSearch.trim()) return reportData.rows
    const q = tableSearch.toLowerCase()
    return reportData.rows.filter(r => {
      return Object.values(r).some(val =>
        val !== null && val !== undefined && String(val).toLowerCase().includes(q)
      )
    })
  }, [reportData, tableSearch])

  // Get source operational workspace for 1-click return
  const getOriginModuleInfo = () => {
    switch (activeTab) {
      case 'parade':
        return { path: '/parade?tab=monitoring', label: 'Back to Parade State', icon: 'bi-clipboard2-check' }
      case 'student':
        return { path: '/students', label: 'Back to Trainee Directory', icon: 'bi-people' }
      case 'accommodation':
        return { path: '/accommodation', label: 'Back to Housing Panel', icon: 'bi-house-door' }
      case 'academic_results':
      case 'attendance':
      case 'course_calendar':
        return { path: '/academic', label: 'Back to Academic Module', icon: 'bi-journal-bookmark-fill' }
      case 'occurrences':
        return { path: '/students/occurrences', label: 'Back to Occurrences', icon: 'bi-shield-exclamation' }
      default:
        return { path: '/dashboard', label: 'Back to Dashboard', icon: 'bi-grid-1x2' }
    }
  }
  const originInfo = getOriginModuleInfo()

  return (
    <div className="fade-in-slide">
      {/* Top Application Header Bar */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-3 no-print">
        <div className="d-flex align-items-center gap-2 min-w-0">
          <Link
            to={originInfo.path}
            className="icon-btn border flex-shrink-0"
            title={`Return to ${originInfo.label}`}
            aria-label={`Return to ${originInfo.label}`}
          >
            <i className="bi bi-arrow-left"></i>
          </Link>
          <div className="min-w-0">
            <span className="page-eyebrow">Reports</span>
            <h2 className="page-title mb-0 text-truncate">Official registers & reports</h2>
            <small className="text-muted d-none d-sm-block">Print-ready SLAF registers compiled from live records.</small>
          </div>
        </div>
        <div className="d-flex align-items-center flex-wrap gap-2 w-100 w-md-auto justify-content-start justify-content-md-end">
          {/* Orientation Toggle */}
          <div className="btn-group btn-group-sm shadow-xs flex-grow-1 flex-sm-grow-0" role="group">
            <button
              type="button"
              className={`btn ${orientation === 'portrait' ? 'btn-secondary fw-bold' : 'btn-outline-secondary'}`}
              onClick={() => setOrientation('portrait')}
              title="A4 Portrait Orientation (210mm x 297mm)"
            >
              <i className="bi bi-file-earmark me-1"></i> Portrait
            </button>
            <button
              type="button"
              className={`btn ${orientation === 'landscape' ? 'btn-secondary fw-bold' : 'btn-outline-secondary'}`}
              onClick={() => setOrientation('landscape')}
              title="A4 Landscape Orientation (297mm x 210mm)"
            >
              <i className="bi bi-file-earmark-landscape me-1"></i> Landscape
            </button>
          </div>

          <button
            className="btn btn-outline-dark btn-sm fw-semibold shadow-xs flex-grow-1 flex-sm-grow-0"
            onClick={handleExportExcel}
            disabled={loading || exportingExcel || !reportData?.rows?.length}
          >
            {exportingExcel ? (
              <span className="spinner-border spinner-border-sm me-1" role="status"></span>
            ) : (
              <i className="bi bi-file-earmark-excel me-1 text-success"></i>
            )}
            <span className="d-none d-sm-inline">Export </span>Excel
          </button>
          <button
            className="btn btn-outline-dark btn-sm fw-semibold shadow-xs flex-grow-1 flex-sm-grow-0"
            onClick={handleExportPdf}
            disabled={loading || exportingPdf || !reportData?.rows?.length}
          >
            {exportingPdf ? (
              <span className="spinner-border spinner-border-sm me-1" role="status"></span>
            ) : (
              <i className="bi bi-file-earmark-pdf me-1 text-danger"></i>
            )}
            PDF
          </button>
          <button
            className="btn btn-primary btn-sm fw-semibold shadow-xs flex-grow-1 flex-sm-grow-0"
            onClick={handlePrintReport}
            disabled={loading || !reportData?.rows?.length}
          >
            <i className="bi bi-printer me-1"></i> Print
          </button>
        </div>
      </div>

      {/* Module Selector Navigation Tabs */}
      <div className="card slaf-card p-2 mb-3 shadow-xs bg-white no-print">
        <ul className="nav nav-pills custom-pills nav-pills-responsive flex-nowrap">
          <li className="nav-item">
            <button
              className={`nav-link btn-sm ${activeTab === 'student' ? 'active fw-bold' : ''}`}
              onClick={() => setActiveTab('student')}
            >
              <i className="bi bi-person-lines-fill me-1.5"></i> Trainee Master Dossiers
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link btn-sm ${activeTab === 'parade' ? 'active fw-bold' : ''}`}
              onClick={() => setActiveTab('parade')}
            >
              <i className="bi bi-clipboard2-check-fill me-1.5"></i> Daily Parade State
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link btn-sm ${activeTab === 'academic_results' ? 'active fw-bold' : ''}`}
              onClick={() => setActiveTab('academic_results')}
            >
              <i className="bi bi-award-fill me-1.5"></i> Examination Marksheet
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link btn-sm ${activeTab === 'attendance' ? 'active fw-bold' : ''}`}
              onClick={() => setActiveTab('attendance')}
            >
              <i className="bi bi-calendar-check-fill me-1.5"></i> Classroom Attendance
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link btn-sm ${activeTab === 'accommodation' ? 'active fw-bold' : ''}`}
              onClick={() => setActiveTab('accommodation')}
            >
              <i className="bi bi-building-fill me-1.5"></i> Billet Housing & Bunks
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link btn-sm ${activeTab === 'course_calendar' ? 'active fw-bold' : ''}`}
              onClick={() => setActiveTab('course_calendar')}
            >
              <i className="bi bi-calendar-range-fill me-1.5"></i> Course Training Schedule
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link btn-sm ${activeTab === 'occurrences' ? 'active fw-bold' : ''}`}
              onClick={() => setActiveTab('occurrences')}
            >
              <i className="bi bi-shield-exclamation me-1.5"></i> Personal Occurrences & Conduct
            </button>
          </li>
        </ul>
      </div>

      {/* Modern Filter Parameter Panel */}
      <div className="card slaf-card p-3 mb-3 shadow-xs bg-white no-print report-filter-panel">
        <div className="d-flex justify-content-between align-items-center mb-2 pb-1 border-bottom">
          <small className="fw-bold text-uppercase text-muted" style={{ fontSize: '0.75rem' }}>
            <i className="bi bi-sliders me-1 text-primary"></i>
            Report Parameters — {activeTab.replace('_', ' ').toUpperCase()}
          </small>
          <small className="text-muted" style={{ fontSize: '0.75rem' }}>Select dataset criteria and compile</small>
        </div>

        {/* 1. Student Dossier Filters */}
        {activeTab === 'student' && (
          <div className="row g-2 align-items-end">
            <div className="col-md-2">
              <label className="form-label small fw-bold mb-1">Trade</label>
              <select
                className="form-select form-select-sm"
                value={studentParams.trade}
                onChange={(e) => setStudentParams({ ...studentParams, trade: e.target.value })}
              >
                <option value="">All Trades</option>
                {filterMeta.trades.map((t, idx) => <option key={idx} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold mb-1">Course</label>
              <select
                className="form-select form-select-sm"
                value={studentParams.course_id}
                onChange={(e) => setStudentParams({ ...studentParams, course_id: e.target.value })}
              >
                <option value="">All Courses</option>
                {filterMeta.courses.map((c, idx) => <option key={idx} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold mb-1">Batch</label>
              <select
                className="form-select form-select-sm"
                value={studentParams.batch}
                onChange={(e) => setStudentParams({ ...studentParams, batch: e.target.value })}
              >
                <option value="">All Batches</option>
                {filterMeta.batches.map((b, idx) => <option key={idx} value={b.value}>{b.label}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold mb-1">Rank</label>
              <select
                className="form-select form-select-sm"
                value={studentParams.rank}
                onChange={(e) => setStudentParams({ ...studentParams, rank: e.target.value })}
              >
                <option value="">All Ranks</option>
                {filterMeta.ranks.map((r, idx) => <option key={idx} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold mb-1">Status</label>
              <select
                className="form-select form-select-sm"
                value={studentParams.status}
                onChange={(e) => setStudentParams({ ...studentParams, status: e.target.value })}
              >
                <option value="">All Statuses</option>
                {filterMeta.student_statuses.map((s, idx) => <option key={idx} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <button className="btn btn-primary btn-sm w-100 fw-semibold" onClick={() => handleCompileReport('student')}>
                <i className="bi bi-arrow-repeat me-1"></i> Compile Report
              </button>
            </div>
          </div>
        )}

        {/* 2. Parade State Filters */}
        {activeTab === 'parade' && (
          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <label className="form-label small fw-bold mb-1">Parade Date*</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={paradeParams.parade_date}
                onChange={(e) => setParadeParams({ ...paradeParams, parade_date: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-bold mb-1">Trade</label>
              <select
                className="form-select form-select-sm"
                value={paradeParams.trade}
                onChange={(e) => setParadeParams({ ...paradeParams, trade: e.target.value })}
              >
                <option value="">All Trades</option>
                {filterMeta.trades.map((t, idx) => <option key={idx} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold mb-1">Parade Status</label>
              <select
                className="form-select form-select-sm"
                value={paradeParams.status}
                onChange={(e) => setParadeParams({ ...paradeParams, status: e.target.value })}
              >
                <option value="">All Statuses</option>
                {filterMeta.parade_statuses.map((p, idx) => <option key={idx} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold mb-1">Approval State</label>
              <select
                className="form-select form-select-sm"
                value={paradeParams.approval_status}
                onChange={(e) => setParadeParams({ ...paradeParams, approval_status: e.target.value })}
              >
                <option value="">All Submissions</option>
                <option value="APPROVED">Approved Only</option>
                <option value="SUBMITTED">Pending Approval</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>
            <div className="col-md-2">
              <button className="btn btn-primary btn-sm w-100 fw-semibold" onClick={() => handleCompileReport('parade')}>
                <i className="bi bi-arrow-repeat me-1"></i> Compile Report
              </button>
            </div>
          </div>
        )}

        {/* 3. Academic Results Filters */}
        {activeTab === 'academic_results' && (
          <div className="row g-2 align-items-end">
            <div className="col-md-4">
              <label className="form-label small fw-bold mb-1">Course*</label>
              <select
                className="form-select form-select-sm"
                value={academicParams.course_id}
                onChange={(e) => setAcademicParams({ ...academicParams, course_id: e.target.value })}
              >
                <option value="">-- Select Course --</option>
                {filterMeta.courses.map((c, idx) => <option key={idx} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-bold mb-1">Subject</label>
              <select
                className="form-select form-select-sm"
                value={academicParams.subject_id}
                onChange={(e) => setAcademicParams({ ...academicParams, subject_id: e.target.value })}
              >
                <option value="">All Subjects</option>
                {filterMeta.subjects.map((s, idx) => <option key={idx} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-bold mb-1">Outcome Status</label>
              <select
                className="form-select form-select-sm"
                value={academicParams.result_status}
                onChange={(e) => setAcademicParams({ ...academicParams, result_status: e.target.value })}
              >
                <option value="ALL">All Outcomes</option>
                <option value="PASS">PASS Only</option>
                <option value="FAIL">FAIL Only</option>
                <option value="LEAVE">LEAVE (Parade State)</option>
                <option value="IN HOSPITAL">IN HOSPITAL (Parade State)</option>
                <option value="AWOL">AWOL (Parade State)</option>
                <option value="COURSE VISIT">COURSE VISIT (Parade State)</option>
              </select>
            </div>
            <div className="col-md-2">
              <button className="btn btn-primary btn-sm w-100 fw-semibold" onClick={() => handleCompileReport('academic_results')}>
                <i className="bi bi-arrow-repeat me-1"></i> Compile Report
              </button>
            </div>
          </div>
        )}

        {/* 4. Classroom Attendance Filters */}
        {activeTab === 'attendance' && (
          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <label className="form-label small fw-bold mb-1">Course</label>
              <select
                className="form-select form-select-sm"
                value={attendanceParams.course_id}
                onChange={(e) => setAttendanceParams({ ...attendanceParams, course_id: e.target.value })}
              >
                <option value="">All Courses</option>
                {filterMeta.courses.map((c, idx) => <option key={idx} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-bold mb-1">Subject</label>
              <select
                className="form-select form-select-sm"
                value={attendanceParams.subject_id}
                onChange={(e) => setAttendanceParams({ ...attendanceParams, subject_id: e.target.value })}
              >
                <option value="">All Subjects</option>
                {filterMeta.subjects.map((s, idx) => <option key={idx} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold mb-1">Date From</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={attendanceParams.date_from}
                onChange={(e) => setAttendanceParams({ ...attendanceParams, date_from: e.target.value })}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold mb-1">Date To</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={attendanceParams.date_to}
                onChange={(e) => setAttendanceParams({ ...attendanceParams, date_to: e.target.value })}
              />
            </div>
            <div className="col-md-2">
              <button className="btn btn-primary btn-sm w-100 fw-semibold" onClick={() => handleCompileReport('attendance')}>
                <i className="bi bi-arrow-repeat me-1"></i> Compile Report
              </button>
            </div>
          </div>
        )}

        {/* 5. Accommodation Filters */}
        {activeTab === 'accommodation' && (
          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <label className="form-label small fw-bold mb-1">Billet</label>
              <select
                className="form-select form-select-sm"
                value={accommodationParams.billet_id}
                onChange={(e) => setAccommodationParams({ ...accommodationParams, billet_id: e.target.value })}
              >
                <option value="">All Billets</option>
                {filterMeta.billets.map((b, idx) => <option key={idx} value={b.value}>{b.label}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold mb-1">Status</label>
              <select
                className="form-select form-select-sm"
                value={accommodationParams.status}
                onChange={(e) => setAccommodationParams({ ...accommodationParams, status: e.target.value })}
              >
                <option value="">All Statuses</option>
                <option value="Occupied">Occupied</option>
                <option value="Available">Available</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold mb-1">Bunk Level</label>
              <select
                className="form-select form-select-sm"
                value={accommodationParams.bunk_level}
                onChange={(e) => setAccommodationParams({ ...accommodationParams, bunk_level: e.target.value })}
              >
                <option value="">Both Levels</option>
                <option value="TOP">TOP Bunk</option>
                <option value="BOTTOM">BOTTOM Bunk</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-bold mb-1">Trade</label>
              <select
                className="form-select form-select-sm"
                value={accommodationParams.trade}
                onChange={(e) => setAccommodationParams({ ...accommodationParams, trade: e.target.value })}
              >
                <option value="">All Trades</option>
                {filterMeta.trades.map((t, idx) => <option key={idx} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <button className="btn btn-primary btn-sm w-100 fw-semibold" onClick={() => handleCompileReport('accommodation')}>
                <i className="bi bi-arrow-repeat me-1"></i> Compile Report
              </button>
            </div>
          </div>
        )}

        {/* 6. Course Calendar Filters */}
        {activeTab === 'course_calendar' && (
          <div className="row g-2 align-items-end">
            <div className="col-md-4">
              <label className="form-label small fw-bold mb-1">Course Schedule*</label>
              <select
                className="form-select form-select-sm"
                value={calendarParams.course_id}
                onChange={(e) => setCalendarParams({ ...calendarParams, course_id: e.target.value })}
              >
                <option value="">All Active Courses</option>
                {filterMeta.courses.map((c, idx) => <option key={idx} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-bold mb-1">Phase</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="e.g. Phase 1"
                value={calendarParams.phase}
                onChange={(e) => setCalendarParams({ ...calendarParams, phase: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-bold mb-1">Date From</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={calendarParams.date_from}
                onChange={(e) => setCalendarParams({ ...calendarParams, date_from: e.target.value })}
              />
            </div>
            <div className="col-md-2">
              <button className="btn btn-primary btn-sm w-100 fw-semibold" onClick={() => handleCompileReport('course_calendar')}>
                <i className="bi bi-arrow-repeat me-1"></i> Compile Report
              </button>
            </div>
          </div>
        )}

        {/* 7. Personal Occurrence Filters */}
        {activeTab === 'occurrences' && (
          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <label className="form-label small fw-bold mb-1">Occurrence Category</label>
              <select
                className="form-select form-select-sm"
                value={occurrenceParams.occurrence_type}
                onChange={(e) => setOccurrenceParams({ ...occurrenceParams, occurrence_type: e.target.value })}
              >
                <option value="ALL">All Categories</option>
                <option value="ACHIEVEMENT">Achievements / Commendations</option>
                <option value="MISCONDUCT_OFFENSE">Misconduct / Offenses</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold mb-1">Trade</label>
              <select
                className="form-select form-select-sm"
                value={occurrenceParams.trade}
                onChange={(e) => setOccurrenceParams({ ...occurrenceParams, trade: e.target.value })}
              >
                <option value="">All Trades</option>
                {filterMeta.trades.map((t, idx) => <option key={idx} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold mb-1">Date From</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={occurrenceParams.date_from}
                onChange={(e) => setOccurrenceParams({ ...occurrenceParams, date_from: e.target.value })}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold mb-1">Date To</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={occurrenceParams.date_to}
                onChange={(e) => setOccurrenceParams({ ...occurrenceParams, date_to: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <button className="btn btn-primary btn-sm w-100 fw-semibold" onClick={() => handleCompileReport('occurrences')}>
                <i className="bi bi-arrow-repeat me-1"></i> Compile Dossier Report
              </button>
            </div>
          </div>
        )}
      </div>


      {/* Filter / Search within preview table */}
      <div className="d-flex justify-content-between align-items-center mb-2 px-1 no-print">
        <div className="small text-muted">
          Showing <strong>{filteredRows.length}</strong> of <strong>{reportData?.total_records || 0}</strong> compiled records • Formal A4 Preview ({orientation.toUpperCase()})
        </div>
        <div style={{ width: '280px' }}>
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Search within compiled records..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CLASSICAL FORMAL ACADEMIC / INSTITUTIONAL REPORT PAPER DOCUMENT            */}
      {/* ========================================================================= */}
      <div className={`report-paper-classical ${orientation === 'landscape' ? 'orientation-landscape' : 'orientation-portrait'} p-4 p-md-5 bg-white`}>
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-dark" role="status"></div>
            <p className="mt-2 text-muted small">Executing SQL aggregations and compiling formal report...</p>
          </div>
        ) : !reportData ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-journal-text fs-1 d-block mb-2"></i>
            Select parameters and click "Compile Report".
          </div>
        ) : (
          <>
            {/* 1. Classical Institutional Header */}
            <div className="text-center mb-2">
              <div className="d-flex justify-content-between align-items-center mb-1 text-muted" style={{ fontSize: '0.75rem' }}>
                <span>SRI LANKA AIR FORCE • TRADE TRAINING SCHOOL</span>
                <span className="fw-bold text-dark">{reportData.header?.security_classification || 'RESTRICTED / OFFICIAL USE ONLY'}</span>
              </div>

              <div className="report-double-rule-top"></div>

              <h4 className="fw-bold mb-0 text-uppercase" style={{ letterSpacing: '0.8px', fontSize: '1.25rem' }}>
                {reportData.header?.organization || 'SRI LANKA AIR FORCE'}
              </h4>
              <h5 className="fw-bold mb-1" style={{ fontSize: '1.05rem', color: '#1f2937' }}>
                {reportData.header?.school_name || 'TRADE TRAINING SCHOOL (TTS EKALA)'}
              </h5>

              <div className="fs-6 fw-bold text-uppercase mt-2" style={{ letterSpacing: '0.4px', textDecoration: 'underline' }}>
                {reportData.header?.title}
              </div>
              <div className="text-muted small mt-0.5" style={{ fontSize: '0.825rem' }}>
                {reportData.header?.subtitle}
              </div>

              <div className="report-double-rule-bottom"></div>
            </div>

            {/* 2. Section 1: Report Information & Parameters */}
            <div className="report-section-header">1. REPORT INFORMATION & PARAMETERS</div>
            <table className="report-formal-table mb-3">
              <tbody>
                <tr>
                  <td style={{ width: '18%', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>Organization:</td>
                  <td style={{ width: '32%' }}>Sri Lanka Air Force (TTS Ekala)</td>
                  <td style={{ width: '20%', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>Generated Date/Time:</td>
                  <td style={{ width: '30%' }}>{reportData.header?.generated_at}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold', backgroundColor: '#f8fafc' }}>Security Classification:</td>
                  <td>RESTRICTED / OFFICIAL USE ONLY</td>
                  <td style={{ fontWeight: 'bold', backgroundColor: '#f8fafc' }}>Authorized Officer:</td>
                  <td>{reportData.header?.generated_by}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold', backgroundColor: '#f8fafc' }}>Applied Parameters:</td>
                  <td>
                    {reportData.header?.parameters && Object.keys(reportData.header.parameters).length > 0 ? (
                      Object.entries(reportData.header.parameters)
                        .filter(([_, v]) => v)
                        .map(([k, v]) => `${k.replace('_', ' ').toUpperCase()}: ${v}`)
                        .join(' | ') || 'All Master Records'
                    ) : 'All Master Records'}
                  </td>
                  <td style={{ fontWeight: 'bold', backgroundColor: '#f8fafc' }}>Total Records Compiled:</td>
                  <td><strong>{reportData.total_records} Records</strong></td>
                </tr>
              </tbody>
            </table>

            {/* 3. Section 2: Statistical Summary Table (Academic / Research Style) */}
            {reportData.summary_stats && reportData.summary_stats.length > 0 && (
              <>
                <div className="report-section-header">2. STATISTICAL SUMMARY & KEY METRICS</div>
                <div className="text-muted small mb-1" style={{ fontSize: '0.75rem' }}>
                  <em>Table 1: Aggregated Performance & Strength Metrics</em>
                </div>
                <table className="report-formal-table mb-3">
                  <thead>
                    <tr>
                      <th style={{ width: '35%', textAlign: 'left' }}>Metric / Parameter</th>
                      <th style={{ width: '15%', textAlign: 'right' }}>Value</th>
                      <th style={{ width: '35%', textAlign: 'left' }}>Metric / Parameter</th>
                      <th style={{ width: '15%', textAlign: 'right' }}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: Math.ceil(reportData.summary_stats.length / 2) }).map((_, rIdx) => {
                      const item1 = reportData.summary_stats[rIdx * 2]
                      const item2 = reportData.summary_stats[rIdx * 2 + 1]
                      return (
                        <tr key={rIdx}>
                          <td style={{ fontWeight: '600' }}>{item1.label}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                            {item1.value} {item1.percentage !== null && item1.percentage !== undefined ? `(${item1.percentage}%)` : ''}
                          </td>
                          <td style={{ fontWeight: '600' }}>{item2 ? item2.label : ''}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                            {item2 ? `${item2.value} ${item2.percentage !== null && item2.percentage !== undefined ? `(${item2.percentage}%)` : ''}` : ''}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </>
            )}

            {/* 4. Section 3: Detailed Records Table */}
            <div className="report-section-header">
              {reportData.summary_stats?.length > 0 ? '3. DETAILED SYSTEM RECORDS' : '2. DETAILED SYSTEM RECORDS'}
            </div>
            <div className="text-muted small mb-1" style={{ fontSize: '0.75rem' }}>
              <em>Table 2: Trainee Master Register & Logged Records</em>
            </div>

            <div className="table-responsive">
              <table className="report-formal-table mb-2">
                <thead>
                  <tr>
                    {reportData.columns?.map((col, cIdx) => (
                      <th
                        key={cIdx}
                        style={{ minWidth: col.min_width || 'auto', textAlign: col.align || 'left' }}
                      >
                        {col.label.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={reportData.columns?.length || 8} className="text-center py-4 text-muted">
                        {reportData.empty_message || 'No records found matching the specified parameters.'}
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {reportData.columns?.map((col, cIdx) => {
                          const val = row[col.field]
                          const isNumericOrStatus = ['s_no', 'service_number', 'status', 'result_status', 'marks_obtained', 'batch'].includes(col.field)
                          return (
                            <td
                              key={cIdx}
                              style={{
                                textAlign: col.align || 'left',
                                fontWeight: isNumericOrStatus ? '600' : 'normal'
                              }}
                            >
                              {val !== null && val !== undefined ? String(val) : '—'}
                            </td>
                          )
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 5. Section 4: Official Authentication & Certification Block */}
            <div className="report-signature-block">
              <div className="report-section-header">OFFICIAL AUTHENTICATION & CERTIFICATION</div>
              <div className="d-flex justify-content-between text-center mt-3">
                <div className="report-sig-col text-start">
                  <div className="fw-bold">PREPARED BY:</div>
                  <div className="report-sig-line"></div>
                  <div className="small">Name: ....................................................</div>
                  <div className="small">Service No: ............................................</div>
                  <div className="small">Designation: System Officer / Instructor</div>
                  <div className="small">Date: .....................................................</div>
                </div>

                <div className="report-sig-col text-start">
                  <div className="fw-bold">CHECKED & VERIFIED BY:</div>
                  <div className="report-sig-line"></div>
                  <div className="small">Name: ....................................................</div>
                  <div className="small">Service No: ............................................</div>
                  <div className="small">Designation: Chief Ground Instructor</div>
                  <div className="small">Date: .....................................................</div>
                </div>

                <div className="report-sig-col text-start">
                  <div className="fw-bold">APPROVED & AUTHENTICATED BY:</div>
                  <div className="report-sig-line"></div>
                  <div className="small">Name: ....................................................</div>
                  <div className="small">Service No: ............................................</div>
                  <div className="small">Designation: Commanding Officer / OC</div>
                  <div className="small">Date: .....................................................</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ReportGenerator
