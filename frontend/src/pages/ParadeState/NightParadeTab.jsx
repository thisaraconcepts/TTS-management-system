import React, { useState, useEffect, useMemo, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import { ClassicalReportModal } from '../../components/ClassicalReportModal'

const STATUS_OPTIONS = [
  { value: 'Present', label: 'Present (On Parade)', color: '#1f7a4d', bg: 'var(--tint-success)', icon: 'bi-check-circle-fill' },
  { value: 'Hospital', label: 'Hospital', color: '#6e5a8a', bg: 'var(--tint-plum)', icon: 'bi-hospital-fill' },
  { value: 'Sick Report', label: 'Sick Report', color: '#b26a00', bg: 'var(--tint-warning)', icon: 'bi-thermometer-high' },
  { value: 'Leave', label: 'Leave', color: '#2c5ea8', bg: 'var(--tint-primary)', icon: 'bi-airplane-fill' },
  { value: 'AWOL', label: 'AWOL', color: '#b42318', bg: 'var(--tint-danger)', icon: 'bi-exclamation-triangle-fill' },
  { value: 'Temporary Duty', label: 'Temporary Duty', color: '#2f6f86', bg: 'var(--tint-teal)', icon: 'bi-briefcase-fill' },
  { value: 'Course Visit', label: 'Course Visit', color: '#2f6f86', bg: 'var(--tint-teal)', icon: 'bi-geo-alt-fill' },
  { value: 'Detached Duty', label: 'Detached Duty', color: '#6e5a8a', bg: 'var(--tint-plum)', icon: 'bi-person-badge-fill' }
]

const getStatusBadge = (status) => {
  const opt = STATUS_OPTIONS.find((s) => s.value === status) || {
    label: status || 'Unknown',
    color: '#5b6574',
    bg: 'var(--bg-subtle)',
    icon: 'bi-question-circle'
  }
  return (
    <span
      className="badge px-2 py-1 fw-bold d-inline-flex align-items-center gap-1 text-nowrap"
      style={{
        backgroundColor: opt.bg,
        color: opt.color,
        border: `1px solid ${opt.color}40`,
        fontSize: '0.78rem'
      }}
    >
      <i className={`bi ${opt.icon}`} />
      {opt.label}
    </span>
  )
}

export const NightParadeTab = ({
  selectedDate,
  trades = [],
  officerOptions = [],
  onOpenReport
}) => {
  const { hasPermission, user: currentUser } = useAuth()

  // Filters
  const [selectedTrade, setSelectedTrade] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState('ALL') // ALL | CHANGED | UNVERIFIED | NON_PRESENT

  // Data states
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [morningAvailable, setMorningAvailable] = useState(true)
  const [contextData, setContextData] = useState(null)
  const [submitterRemarks, setSubmitterRemarks] = useState('')

  // Trainees & verification tracking: { [student_id]: { night_status, morning_status, remarks, verified } }
  const [traineeRecords, setTraineeRecords] = useState({})
  const [savedSnapshot, setSavedSnapshot] = useState({}) // Snapshot of persisted DB values for dirty tracking
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [traineeList, setTraineeList] = useState([])

  // Analytics / Summary
  const [summaryData, setSummaryData] = useState(null)
  const [activeSubTab, setActiveSubTab] = useState('rollcall') // 'rollcall' | 'summary' | 'transitions' | 'changes'

  // Classical Report Modal
  const [showNightReportModal, setShowNightReportModal] = useState(false)

  // ── Fetch Night Parade Context & Summary ───────────────────────
  const fetchNightContext = useCallback(async () => {
    setLoading(true)
    try {
      const params = { parade_date: selectedDate }
      if (selectedTrade && selectedTrade !== 'All') {
        params.trade = selectedTrade
      }

      const [ctxRes, sumRes] = await Promise.all([
        axios.get('/api/v1/parade/night/context', { params }),
        axios.get('/api/v1/parade/night/summary', { params })
      ])

      const ctx = ctxRes.data
      setContextData(ctx)
      setMorningAvailable(ctx.morning_available)
      setSubmitterRemarks(ctx.submitter_remarks || '')
      setTraineeList(ctx.trainees || [])

      // Build state record map & snapshot for dirty detection
      const recordsMap = {}
      const snapshotMap = {}
      ;(ctx.trainees || []).forEach((t) => {
        const nStatus = t.night_status || t.morning_status || 'Present'
        const rem = t.remarks || ''
        recordsMap[t.student_id] = {
          student_id: t.student_id,
          morning_status: t.morning_status || 'Present',
          night_status: nStatus,
          remarks: rem,
          verified: t.is_verified || (ctx.night_submission_status === 'COMPLETED'),
          status_changed: t.status_changed || false
        }
        snapshotMap[t.student_id] = {
          night_status: nStatus,
          remarks: rem
        }
      })
      setTraineeRecords(recordsMap)
      setSavedSnapshot(snapshotMap)
      setSummaryData(sumRes.data)
    } catch (err) {
      console.error('Failed to load night parade context', err)
      toast.error(err.response?.data?.detail || 'Failed to fetch Night Parade Roll Call context')
    } finally {
      setLoading(false)
    }
  }, [selectedDate, selectedTrade])

  useEffect(() => {
    fetchNightContext()
  }, [fetchNightContext])

  // ── Handlers for changing status / remarks ─────────────────────
  const handleStatusChange = (studentId, newStatus) => {
    setTraineeRecords((prev) => {
      const current = prev[studentId] || {}
      const mStatus = current.morning_status || 'Present'
      const changed = newStatus !== mStatus
      return {
        ...prev,
        [studentId]: {
          ...current,
          night_status: newStatus,
          status_changed: changed,
          verified: true
        }
      }
    })
  }

  const handleRemarksChange = (studentId, newRemarks) => {
    setTraineeRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        remarks: newRemarks
      }
    }))
  }

  const handleToggleVerified = (studentId) => {
    setTraineeRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        verified: !prev[studentId]?.verified
      }
    }))
  }

  // ── Quick Action: Inherit All Morning Baseline ─────────────────
  const handleInheritMorningBaseline = () => {
    setTraineeRecords((prev) => {
      const next = { ...prev }
      traineeList.forEach((t) => {
        const mStatus = t.morning_status || 'Present'
        next[t.student_id] = {
          ...next[t.student_id],
          student_id: t.student_id,
          morning_status: mStatus,
          night_status: mStatus,
          status_changed: false,
          verified: true
        }
      })
      return next
    })
    toast.info('Inherited morning baseline statuses for all trainees.')
  }

  // ── Quick Action: Mark All Remaining On Parade ─────────────────
  const handleMarkAllOnParade = () => {
    setTraineeRecords((prev) => {
      const next = { ...prev }
      traineeList.forEach((t) => {
        const current = next[t.student_id]
        if (!current || !current.verified) {
          const mStatus = t.morning_status || 'Present'
          next[t.student_id] = {
            ...current,
            student_id: t.student_id,
            morning_status: mStatus,
            night_status: 'Present',
            status_changed: 'Present' !== mStatus,
            verified: true
          }
        }
      })
      return next
    })
    toast.info('Marked unverified trainees as Present (On Parade).')
  }

  // ── Dirty State & Unsaved Changes Tracking ────────────────────
  const { dirtyCount, dirtyMap } = useMemo(() => {
    let count = 0
    const map = {}
    traineeList.forEach((t) => {
      const current = traineeRecords[t.student_id]
      const snapshot = savedSnapshot[t.student_id]
      if (current && snapshot) {
        const isDirty = (current.night_status !== snapshot.night_status) || (current.remarks !== snapshot.remarks)
        if (isDirty) {
          count++
          map[t.student_id] = true
        }
      }
    })
    return { dirtyCount: count, dirtyMap: map }
  }, [traineeList, traineeRecords, savedSnapshot])

  const hasUnsavedChanges = dirtyCount > 0

  const handleTradeChange = (newTrade) => {
    if (hasUnsavedChanges) {
      if (!window.confirm(`You have ${dirtyCount} unsaved change(s) for ${selectedTrade}. Switching trade will discard these changes. Continue?`)) {
        return
      }
    }
    setSelectedTrade(newTrade)
  }

  // ── SAVE NIGHT PARADE (Persist Evening Changes to DB) ──────────
  const handleSaveNightParade = async () => {
    setSaving(true)
    try {
      const recordsPayload = traineeList.map((t) => {
        const rec = traineeRecords[t.student_id] || {}
        return {
          student_id: t.student_id,
          morning_status: rec.morning_status || t.morning_status || 'Present',
          night_status: rec.night_status || 'Present',
          status_changed: (rec.night_status || 'Present') !== (rec.morning_status || t.morning_status || 'Present'),
          remarks: rec.remarks || ''
        }
      })

      const payload = {
        date: selectedDate,
        trade: selectedTrade || 'All',
        records: recordsPayload,
        submitter_remarks: submitterRemarks
      }

      const res = await axios.post('/api/v1/parade/night/save', payload)
      const saveTime = res.data?.last_saved_at || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      setLastSavedAt(saveTime)
      toast.success(`Night Parade changes saved successfully. (${selectedTrade === 'All' ? 'All Trades' : selectedTrade})`)
      await fetchNightContext()
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.detail || 'Night Parade changes could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  // ── Complete Night Parade Roll Call (No Instructor Approval) ───
  const handleCompleteNightParade = async () => {
    if (!morningAvailable) {
      toast.error('Cannot complete: Morning Parade State has not been recorded for this date.')
      return
    }

    // 1. Strict Dynamic Strength & Accountability Validation
    const expected = traineeList.length
    const unverifiedTrainees = []
    const unannotatedChanges = []

    traineeList.forEach((t) => {
      const rec = traineeRecords[t.student_id] || {}
      if (!rec.verified || !rec.night_status) {
        unverifiedTrainees.push(`${t.service_number} (${t.rank} ${t.full_name})`)
      }

      const mStatus = rec.morning_status || t.morning_status || 'Present'
      const nStatus = rec.night_status || 'Present'
      if (mStatus !== nStatus && (!rec.remarks || !rec.remarks.trim())) {
        unannotatedChanges.push(`${t.service_number} (${t.rank} ${t.full_name})`)
      }
    })

    if (unverifiedTrainees.length > 0) {
      toast.error(
        `Night Parade cannot be completed: ${unverifiedTrainees.length} unverified trainee(s). Expected: ${expected}, Accounted: ${expected - unverifiedTrainees.length}, Unverified: ${unverifiedTrainees.length}. Please verify all trainees.`
      )
      return
    }

    if (unannotatedChanges.length > 0) {
      toast.warning(
        `Mandatory Remarks required for ${unannotatedChanges.length} status changed trainee(s): ${unannotatedChanges.slice(0, 3).join(', ')}${unannotatedChanges.length > 3 ? '...' : ''}`
      )
      return
    }

    setCompleting(true)
    try {
      const recordsPayload = traineeList.map((t) => {
        const rec = traineeRecords[t.student_id] || {}
        return {
          student_id: t.student_id,
          morning_status: rec.morning_status || t.morning_status || 'Present',
          night_status: rec.night_status || 'Present',
          status_changed: (rec.night_status || 'Present') !== (rec.morning_status || t.morning_status || 'Present'),
          remarks: rec.remarks || ''
        }
      })

      const payload = {
        date: selectedDate,
        trade: selectedTrade,
        records: recordsPayload,
        submitter_remarks: submitterRemarks
      }

      const res = await axios.post('/api/v1/parade/night/complete', payload)
      toast.success(
        `Night Parade State COMPLETED & LOCKED for ${selectedTrade} (Total Accounted: ${res.data.accounted_strength}/${res.data.expected_strength})!`
      )
      await fetchNightContext()
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.detail || 'Failed to complete Night Parade Roll Call.')
    } finally {
      setCompleting(false)
    }
  }

  // ── Computed Filtered Trainees ─────────────────────────────────
  const filteredTrainees = useMemo(() => {
    let list = traineeList

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (t) =>
          t.service_number?.toLowerCase().includes(q) ||
          t.full_name?.toLowerCase().includes(q) ||
          t.rank?.toLowerCase().includes(q) ||
          t.trade?.toLowerCase().includes(q) ||
          t.course_name?.toLowerCase().includes(q) ||
          t.batch?.toLowerCase().includes(q)
      )
    }

    if (filterMode === 'CHANGED') {
      list = list.filter((t) => {
        const rec = traineeRecords[t.student_id]
        const m = rec?.morning_status || t.morning_status || 'Present'
        const n = rec?.night_status || 'Present'
        return m !== n
      })
    } else if (filterMode === 'UNVERIFIED') {
      list = list.filter((t) => !traineeRecords[t.student_id]?.verified)
    } else if (filterMode === 'NON_PRESENT') {
      list = list.filter((t) => {
        const rec = traineeRecords[t.student_id]
        const n = rec?.night_status || 'Present'
        return n !== 'Present'
      })
    }

    return list
  }, [traineeList, searchQuery, filterMode, traineeRecords])

  // ── Dynamic Strength & Accountability Calculation ─────────────
  const liveStats = useMemo(() => {
    let expected = traineeList.length
    let onParade = 0
    let hospital = 0
    let sickReport = 0
    let leave = 0
    let awol = 0
    let tempDuty = 0
    let courseVisit = 0
    let detachedDuty = 0
    let other = 0
    let changed = 0
    let unverified = 0
    let accounted = 0

    traineeList.forEach((t) => {
      const rec = traineeRecords[t.student_id] || {}
      const m = rec.morning_status || t.morning_status || 'Present'
      const n = rec.night_status || 'Present'

      if (rec.verified && n) {
        accounted++
      } else {
        unverified++
      }

      if (m !== n) changed++

      if (n === 'Present') onParade++
      else if (n === 'Hospital') hospital++
      else if (n === 'Sick Report') sickReport++
      else if (n === 'Leave') leave++
      else if (n === 'AWOL') awol++
      else if (n === 'Temporary Duty') tempDuty++
      else if (n === 'Course Visit') courseVisit++
      else if (n === 'Detached Duty') detachedDuty++
      else other++
    })

    const isComplete = expected > 0 && accounted === expected && unverified === 0

    return {
      expected,
      accounted,
      onParade,
      hospital,
      sickReport,
      leave,
      awol,
      tempDuty,
      courseVisit,
      detachedDuty,
      other,
      changed,
      unverified,
      isComplete
    }
  }, [traineeList, traineeRecords])

  const isCompleted = contextData?.night_submission_status === 'COMPLETED'

  return (
    <div className="fade-in">
      {/* ─── 1. MORNING BASELINE UNAVAILABLE ALERT BANNER ─── */}
      {!morningAvailable && (
        <div className="alert alert-warning d-flex align-items-center gap-3 shadow-xs border-warning border-2 p-3 mb-4 rounded-3">
          <i className="bi bi-exclamation-triangle-fill fs-3 text-warning flex-shrink-0" />
          <div className="flex-grow-1">
            <h6 className="fw-bold mb-1 text-dark">MORNING PARADE STATE NOT AVAILABLE FOR {selectedDate}</h6>
            <p className="mb-0 text-dark small" style={{ lineHeight: '1.4' }}>
              The Morning Parade State for this date has not yet been recorded. Night Roll Call operates on the strict{' '}
              <strong>"Morning Baseline $\rightarrow$ Evening Verification"</strong> protocol and cannot be completed until
              the morning baseline is saved.
            </p>
          </div>
          <button
            className="btn btn-sm btn-outline-dark fw-bold px-3 text-nowrap"
            onClick={() => window.location.search = `?tab=record&date=${selectedDate}`}
          >
            <i className="bi bi-arrow-left-circle me-1" />
            Go to Morning Entry
          </button>
        </div>
      )}

      {/* ─── 2. Top Header & Control Bar ─── */}
      <div className="card slaf-card shadow-xs mb-4 border-0">
        <div className="card-body p-3">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="d-flex align-items-center gap-2">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: '42px', height: '42px', backgroundColor: '#1b2b4a', color: 'var(--tint-primary-border)' }}
              >
                <i className="bi bi-moon-stars-fill fs-5" />
              </div>
              <div>
                <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                  Night Parade State & Roll Call
                  {contextData?.night_submission_status && (
                    <span
                      className={`badge px-2 py-1 fs-7 fw-bold ${
                        contextData.night_submission_status === 'COMPLETED'
                          ? 'bg-success'
                          : contextData.night_submission_status === 'IN_PROGRESS'
                          ? 'bg-primary'
                          : 'bg-secondary'
                      }`}
                    >
                      {contextData.night_submission_status}
                    </span>
                  )}
                </h5>
                <small className="text-muted">
                  Evening accountability & strength confirmation for {selectedDate} (No instructor approval required)
                </small>
              </div>
            </div>

            {/* Trade selector & Top Actions Toolbar */}
            <div className="d-flex align-items-center gap-2 flex-wrap ms-auto">
              <div className="d-flex align-items-center gap-1.5">
                <label className="form-label mb-0 small fw-bold text-muted text-nowrap">Trade Unit:</label>
                <select
                  className="form-select form-select-sm shadow-xs fw-semibold"
                  style={{ minWidth: '180px' }}
                  value={selectedTrade}
                  onChange={(e) => handleTradeChange(e.target.value)}
                >
                  <option value="All">All Trades (Overview)</option>
                  {trades.map((tr) => (
                    <option key={tr.id || tr.name} value={tr.name}>
                      {tr.name} {tr.code ? `(${tr.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Unsaved Changes Status Indicator */}
              {hasUnsavedChanges ? (
                <span
                  className="badge bg-danger-subtle text-danger border border-danger-subtle px-2.5 py-1.5 fw-bold d-inline-flex align-items-center gap-1 shadow-xs animate-pulse"
                  style={{ fontSize: '0.78rem' }}
                >
                  <i className="bi bi-exclamation-triangle-fill" />
                  {dirtyCount} Unsaved Change{dirtyCount > 1 ? 's' : ''}
                </span>
              ) : lastSavedAt ? (
                <span
                  className="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1.5 fw-semibold d-inline-flex align-items-center gap-1 shadow-xs"
                  style={{ fontSize: '0.76rem' }}
                >
                  <i className="bi bi-check-circle-fill" />
                  Saved ({lastSavedAt})
                </span>
              ) : null}

              {/* Top Prominent SAVE NIGHT PARADE Button */}
              {!isCompleted && (
                <button
                  className={`btn btn-sm fw-bold shadow-xs d-inline-flex align-items-center gap-1.5 ${
                    hasUnsavedChanges ? 'btn-primary' : 'btn-outline-primary'
                  }`}
                  onClick={handleSaveNightParade}
                  disabled={saving || completing || !hasUnsavedChanges}
                  title={hasUnsavedChanges ? "Persist Night Parade status changes to database" : "No unsaved changes to save"}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" />
                      SAVING...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-floppy-fill" />
                      SAVE NIGHT PARADE
                    </>
                  )}
                </button>
              )}

              <button
                className="btn btn-sm btn-outline-secondary fw-semibold shadow-xs"
                onClick={() => setShowNightReportModal(true)}
                title="Generate Official SLAF Night Roll Call Classical Report"
              >
                <i className="bi bi-file-earmark-ruled me-1" />
                Night Parade Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. ACCOUNTABILITY STATUS & RECONCILIATION STRIP ─── */}
      <div className="card slaf-card shadow-xs mb-4 border-0 bg-white">
        <div className="card-body p-3">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="d-flex align-items-center gap-2">
              <span className="fw-bold text-dark small text-uppercase">Accountability Status:</span>
              {liveStats.isComplete ? (
                <span className="badge bg-success px-3 py-1.5 fs-7 fw-bold d-inline-flex align-items-center gap-1 shadow-xs">
                  <i className="bi bi-check-circle-fill" />
                  ACCOUNTABILITY COMPLETE: YES ({liveStats.accounted}/{liveStats.expected})
                </span>
              ) : (
                <span className="badge bg-danger px-3 py-1.5 fs-7 fw-bold d-inline-flex align-items-center gap-1 shadow-xs">
                  <i className="bi bi-exclamation-octagon-fill" />
                  ACCOUNTABILITY COMPLETE: NO (Unverified: {liveStats.unverified})
                </span>
              )}
            </div>

            <div className="d-flex align-items-center gap-3 small text-muted">
              <div>
                <strong>Expected Strength:</strong> <span className="font-monospace fw-bold text-primary">{liveStats.expected}</span>
              </div>
              <div>
                <strong>Accounted:</strong> <span className="font-monospace fw-bold text-success">{liveStats.accounted}</span>
              </div>
              <div>
                <strong>Status Changed:</strong> <span className="font-monospace fw-bold text-danger">{liveStats.changed}</span>
              </div>
              {contextData?.completed_by_name && (
                <div>
                  <strong>Completed By:</strong> <span className="fw-semibold text-dark">{contextData.completed_by_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4. ACCOUNTABILITY & ROLL CALL KPI METRIC CARDS ─── */}
      <div className="row g-2 mb-4">
        {/* Total Expected */}
        <div className="col-6 col-sm-4 col-md-3 col-xl">
          <div className="card slaf-card p-2.5 text-center h-100 shadow-xs border-top border-4 border-primary">
            <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '0.72rem' }}>
              Expected
            </div>
            <div className="fw-bold text-primary display-6 my-0.5">{liveStats.expected}</div>
            <div className="small text-muted" style={{ fontSize: '0.72rem' }}>Total Trainees</div>
          </div>
        </div>

        {/* On Parade (Present in Camp) */}
        <div className="col-6 col-sm-4 col-md-3 col-xl">
          <div className="card slaf-card p-2.5 text-center h-100 shadow-xs border-top border-4 border-success">
            <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '0.72rem' }}>
              On Parade
            </div>
            <div className="fw-bold text-success display-6 my-0.5">{liveStats.onParade}</div>
            <div className="small text-success fw-semibold" style={{ fontSize: '0.72rem' }}>
              {liveStats.expected > 0 ? `${Math.round((liveStats.onParade / liveStats.expected) * 100)}% Present` : '0%'}
            </div>
          </div>
        </div>

        {/* In Hospital */}
        <div className="col-6 col-sm-4 col-md-3 col-xl">
          <div className="card slaf-card p-2.5 text-center h-100 shadow-xs border-top border-4" style={{ borderColor: '#6e5a8a' }}>
            <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '0.72rem' }}>
              Hospital
            </div>
            <div className="fw-bold display-6 my-0.5" style={{ color: '#6e5a8a' }}>{liveStats.hospital}</div>
            <div className="small text-muted" style={{ fontSize: '0.72rem' }}>Admitted / Inward</div>
          </div>
        </div>

        {/* Sick Report */}
        <div className="col-6 col-sm-4 col-md-3 col-xl">
          <div className="card slaf-card p-2.5 text-center h-100 shadow-xs border-top border-4 border-warning">
            <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '0.72rem' }}>
              Sick Report
            </div>
            <div className="fw-bold text-warning display-6 my-0.5">{liveStats.sickReport}</div>
            <div className="small text-muted" style={{ fontSize: '0.72rem' }}>Excused / MI Room</div>
          </div>
        </div>

        {/* Leave */}
        <div className="col-6 col-sm-4 col-md-3 col-xl">
          <div className="card slaf-card p-2.5 text-center h-100 shadow-xs border-top border-4 border-info">
            <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '0.72rem' }}>
              On Leave
            </div>
            <div className="fw-bold text-info display-6 my-0.5">{liveStats.leave}</div>
            <div className="small text-muted" style={{ fontSize: '0.72rem' }}>Authorized Leave</div>
          </div>
        </div>

        {/* AWOL */}
        <div className="col-6 col-sm-4 col-md-3 col-xl">
          <div className="card slaf-card p-2.5 text-center h-100 shadow-xs border-top border-4 border-danger">
            <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '0.72rem' }}>
              AWOL
            </div>
            <div className="fw-bold text-danger display-6 my-0.5">{liveStats.awol}</div>
            <div className="small text-danger fw-semibold" style={{ fontSize: '0.72rem' }}>Unaccounted</div>
          </div>
        </div>

        {/* Status Changed Count */}
        <div className="col-6 col-sm-4 col-md-3 col-xl">
          <div
            className="card slaf-card p-2.5 text-center h-100 shadow-xs border-top border-4 cursor-pointer"
            style={{
              borderColor: '#b42318',
              backgroundColor: filterMode === 'CHANGED' ? 'var(--tint-danger)' : 'var(--bg-card)'
            }}
            onClick={() => setFilterMode(filterMode === 'CHANGED' ? 'ALL' : 'CHANGED')}
          >
            <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '0.72rem' }}>
              Status Changed
            </div>
            <div className="fw-bold display-6 my-0.5" style={{ color: '#b42318' }}>{liveStats.changed}</div>
            <div className="small fw-semibold" style={{ fontSize: '0.72rem', color: '#b42318' }}>
              <i className="bi bi-arrow-left-right me-1" />
              Morn $\rightarrow$ Night
            </div>
          </div>
        </div>

        {/* Unverified */}
        <div className="col-6 col-sm-4 col-md-3 col-xl">
          <div
            className="card slaf-card p-2.5 text-center h-100 shadow-xs border-top border-4 cursor-pointer"
            style={{
              borderColor: '#5b6574',
              backgroundColor: filterMode === 'UNVERIFIED' ? 'var(--bg-subtle)' : 'var(--bg-card)'
            }}
            onClick={() => setFilterMode(filterMode === 'UNVERIFIED' ? 'ALL' : 'UNVERIFIED')}
          >
            <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '0.72rem' }}>
              Unverified
            </div>
            <div className="fw-bold text-secondary display-6 my-0.5">{liveStats.unverified}</div>
            <div className="small text-muted" style={{ fontSize: '0.72rem' }}>Pending Roll Call</div>
          </div>
        </div>
      </div>

      {/* ─── 5. Sub-Navigation Tabs ─── */}
      <div className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-3 flex-wrap gap-2">
        <div className="d-flex flex-wrap gap-1 shadow-xs">
          <button
            className={`btn btn-sm ${activeSubTab === 'rollcall' ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`}
            onClick={() => setActiveSubTab('rollcall')}
          >
            <i className="bi bi-clipboard2-check me-1" />
            Evening Roll Call Table
          </button>
          <button
            className={`btn btn-sm ${activeSubTab === 'summary' ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`}
            onClick={() => setActiveSubTab('summary')}
          >
            <i className="bi bi-grid-3x3 me-1" />
            Trade Breakdown
          </button>
          <button
            className={`btn btn-sm ${activeSubTab === 'transitions' ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`}
            onClick={() => setActiveSubTab('transitions')}
          >
            <i className="bi bi-arrow-left-right me-1" />
            Status Transitions
          </button>
          <button
            className={`btn btn-sm ${activeSubTab === 'changes' ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`}
            onClick={() => setActiveSubTab('changes')}
          >
            <i className="bi bi-person-exclamation me-1" />
            Changed Trainees ({liveStats.changed})
          </button>
        </div>

        {/* Quick helper buttons when in rollcall table */}
        {activeSubTab === 'rollcall' && !isCompleted && (
          <div className="d-flex align-items-center gap-2 flex-wrap w-100 w-md-auto">
            <button
              className="btn btn-sm btn-outline-secondary shadow-xs fw-semibold flex-grow-1 flex-md-grow-0"
              onClick={handleInheritMorningBaseline}
              title="Reset all unedited night statuses to morning baseline"
            >
              <i className="bi bi-arrow-counterclockwise me-1" />
              Inherit Morning
            </button>
            <button
              className="btn btn-sm btn-outline-success shadow-xs fw-semibold flex-grow-1 flex-md-grow-0"
              onClick={handleMarkAllOnParade}
              title="Mark all unverified trainees as Present (On Parade)"
            >
              <i className="bi bi-check2-all me-1" />
              Mark All Present
            </button>
          </div>
        )}
      </div>

      {/* ─── 6. SUB-TAB 1: ROLL CALL NOMINAL ROLL TABLE ─── */}
      {activeSubTab === 'rollcall' && (
        <div>
          {/* Table Filters & Search Bar */}
          <div className="card slaf-card shadow-xs mb-3 border-0 bg-light">
            <div className="card-body p-2.5 d-flex flex-wrap align-items-center justify-content-between gap-2">
              {/* Filter Pills */}
              <div className="d-flex align-items-center gap-1.5 flex-wrap">
                <span className="small fw-bold text-muted me-1">Filter:</span>
                <button
                  className={`btn btn-xs py-1 px-2.5 rounded-pill fw-semibold ${
                    filterMode === 'ALL' ? 'btn-dark' : 'btn-outline-secondary'
                  }`}
                  onClick={() => setFilterMode('ALL')}
                >
                  All Trainees ({traineeList.length})
                </button>
                <button
                  className={`btn btn-xs py-1 px-2.5 rounded-pill fw-semibold ${
                    filterMode === 'CHANGED' ? 'btn-danger' : 'btn-outline-danger'
                  }`}
                  onClick={() => setFilterMode('CHANGED')}
                >
                  <i className="bi bi-arrow-left-right me-1" />
                  Status Changed ({liveStats.changed})
                </button>
                <button
                  className={`btn btn-xs py-1 px-2.5 rounded-pill fw-semibold ${
                    filterMode === 'UNVERIFIED' ? 'btn-secondary' : 'btn-outline-secondary'
                  }`}
                  onClick={() => setFilterMode('UNVERIFIED')}
                >
                  <i className="bi bi-hourglass me-1" />
                  Unverified ({liveStats.unverified})
                </button>
                <button
                  className={`btn btn-xs py-1 px-2.5 rounded-pill fw-semibold ${
                    filterMode === 'NON_PRESENT' ? 'btn-warning text-dark' : 'btn-outline-warning text-dark'
                  }`}
                  onClick={() => setFilterMode('NON_PRESENT')}
                >
                  <i className="bi bi-exclamation-octagon me-1" />
                  Non-Present ({traineeList.length - liveStats.onParade})
                </button>
              </div>

              {/* Search input */}
              <div className="input-group input-group-sm shadow-xs" style={{ maxWidth: '280px' }}>
                <span className="input-group-text bg-white border-end-0">
                  <i className="bi bi-search text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search service no, name, trade..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="btn btn-outline-secondary border-start-0 bg-white" onClick={() => setSearchQuery('')}>
                    <i className="bi bi-x" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="card slaf-card shadow-sm border-0 mb-4 overflow-hidden">
            <div className="table-responsive" style={{ maxHeight: '600px' }}>
              <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                <thead className="table-dark sticky-top text-nowrap" style={{ zIndex: 10 }}>
                  <tr>
                    <th style={{ width: '45px' }} className="text-center">#</th>
                    <th style={{ width: '50px' }} className="text-center" title="Mark Trainee Verified in Evening Roll Call">
                      <i className="bi bi-check2-square fs-6" />
                    </th>
                    <th style={{ width: '120px' }}>Service No</th>
                    <th style={{ width: '90px' }}>Rank</th>
                    <th style={{ minWidth: '220px' }}>Full Name</th>
                    <th style={{ width: '110px' }}>Trade</th>
                    <th style={{ width: '150px' }} className="text-center bg-secondary bg-opacity-25">
                      <i className="bi bi-sun-fill text-warning me-1" />
                      Morning Baseline
                    </th>
                    <th style={{ width: '170px' }} className="text-center bg-primary bg-opacity-25">
                      <i className="bi bi-moon-stars-fill text-info me-1" />
                      Night Status
                    </th>
                    <th style={{ width: '95px' }} className="text-center">Changed?</th>
                    <th style={{ minWidth: '200px' }}>Evening Verification Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="10" className="text-center py-5">
                        <div className="spinner-border text-primary spinner-border-sm me-2" role="status" />
                        <span className="text-muted">Loading Night Parade Roll Call roster...</span>
                      </td>
                    </tr>
                  ) : filteredTrainees.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="text-center py-5 text-muted">
                        <i className="bi bi-people fs-2 d-block mb-2" />
                        No trainees found matching the selected trade and filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTrainees.map((t, idx) => {
                      const rec = traineeRecords[t.student_id] || {}
                      const mStatus = rec.morning_status || t.morning_status || 'Present'
                      const nStatus = rec.night_status || 'Present'
                      const isChanged = mStatus !== nStatus
                      const isVerified = rec.verified

                      return (
                        <tr
                          key={t.student_id}
                          style={{
                            backgroundColor: isChanged ? 'var(--tint-danger)' : !isVerified ? 'var(--tint-warning)' : undefined
                          }}
                        >
                          <td className="text-center text-muted fw-bold">{idx + 1}</td>

                          {/* Verified Checkbox */}
                          <td className="text-center">
                            <input
                              type="checkbox"
                              className="form-check-input cursor-pointer"
                              checked={isVerified || false}
                              disabled={isCompleted}
                              onChange={() => handleToggleVerified(t.student_id)}
                              title="Mark verified in roll call"
                            />
                          </td>

                          {/* Service Number */}
                          <td className="fw-bold font-monospace">
                            {t.service_number}
                            {dirtyMap[t.student_id] && (
                              <span
                                className="badge bg-warning text-dark ms-1.5 px-1.5 py-0.5 fw-bold"
                                style={{ fontSize: '0.65rem' }}
                                title="Modified — Unsaved change"
                              >
                                UNSAVED
                              </span>
                            )}
                          </td>

                          {/* Rank */}
                          <td>
                            <span className="badge bg-light text-dark border">{t.rank || 'Trainee'}</span>
                          </td>

                          {/* Full Name */}
                          <td className="fw-semibold text-dark">{t.full_name}</td>

                          {/* Trade */}
                          <td>
                            <span className="badge bg-secondary-subtle text-secondary border">{t.trade}</span>
                          </td>

                          {/* Morning Baseline (Read-Only) */}
                          <td className="text-center bg-secondary bg-opacity-10">{getStatusBadge(mStatus)}</td>

                          {/* Night Roll Call Status */}
                          <td className="text-center bg-primary bg-opacity-10">
                            {isCompleted ? (
                              getStatusBadge(nStatus)
                            ) : (
                              <select
                                className="form-select form-select-sm fw-bold shadow-xs"
                                value={nStatus}
                                onChange={(e) => handleStatusChange(t.student_id, e.target.value)}
                                style={{
                                  borderColor: isChanged ? '#b42318' : 'var(--border-strong)',
                                  backgroundColor: isChanged ? 'var(--tint-danger)' : 'var(--bg-card)'
                                }}
                              >
                                {STATUS_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>

                          {/* Status Changed Visual Badge */}
                          <td className="text-center">
                            {isChanged ? (
                              <span
                                className="badge bg-danger text-white px-2 py-1 fw-bold shadow-xs"
                                title={`Morning: ${mStatus} -> Night: ${nStatus}`}
                              >
                                <i className="bi bi-exclamation-circle-fill me-1" />
                                YES
                              </span>
                            ) : (
                              <span className="badge bg-light text-muted border">NO</span>
                            )}
                          </td>

                          {/* Remarks */}
                          <td>
                            {isCompleted ? (
                              <span className="small text-muted">{rec.remarks || '-'}</span>
                            ) : (
                              <div className="position-relative">
                                <input
                                  type="text"
                                  className={`form-control form-control-sm ${
                                    isChanged && (!rec.remarks || !rec.remarks.trim()) ? 'border-danger bg-danger-subtle' : ''
                                  }`}
                                  placeholder={isChanged ? 'Remarks required for status change...' : 'Optional roll call remarks...'}
                                  value={rec.remarks || ''}
                                  onChange={(e) => handleRemarksChange(t.student_id, e.target.value)}
                                />
                                {isChanged && (!rec.remarks || !rec.remarks.trim()) && (
                                  <small className="text-danger d-block" style={{ fontSize: '0.68rem' }}>
                                    <i className="bi bi-exclamation-circle me-1" />
                                    Mandatory for status change
                                  </small>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── 7. Completion & Accountability Panel ─── */}
          <div className="card slaf-card shadow-sm border-0 mb-4">
            <div className="card-header bg-dark text-white p-3 d-flex justify-content-between align-items-center">
              <div className="fw-bold d-flex align-items-center gap-2">
                <i className="bi bi-shield-check text-success" />
                Night Parade Roll Call Verification & Completion — {selectedTrade === 'All' ? 'All Trades (Camp Overview)' : selectedTrade}
              </div>
                {isCompleted && (
                  <span className="badge bg-success px-2.5 py-1">
                    <i className="bi bi-lock-fill me-1" />
                    COMPLETED & LOCKED
                  </span>
                )}
              </div>
              <div className="card-body p-4">
                {isCompleted ? (
                  <div className="alert alert-success d-flex align-items-center gap-3 p-3 mb-3 rounded-3">
                    <i className="bi bi-patch-check-fill fs-2 text-success flex-shrink-0" />
                    <div>
                      <h6 className="fw-bold mb-1">NIGHT PARADE STATE COMPLETED & RECORDED</h6>
                      <p className="mb-0 small text-dark">
                        This Night Parade roll call was verified and completed on{' '}
                        <strong>{contextData?.completed_at ? new Date(contextData.completed_at).toLocaleString() : selectedDate}</strong>{' '}
                        by <strong>{contextData?.completed_by_name || 'Authorized Officer'}</strong>. All trainee records and strength reconciliation are locked.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="row g-3">
                    {/* General Duty NCO Remarks */}
                    <div className="col-12">
                      <label className="form-label fw-bold small text-muted">Duty Handover / Roll Call Remarks (Optional):</label>
                      <textarea
                        className="form-control form-control-sm"
                        rows="2"
                        placeholder="Enter overall evening roll call observations, duty handover notes..."
                        value={submitterRemarks}
                        onChange={(e) => setSubmitterRemarks(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <hr className="my-3" />

                {/* Action Buttons Row */}
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div className="small text-muted">
                    {liveStats.isComplete ? (
                      <span className="text-success fw-bold">
                        <i className="bi bi-check-circle-fill me-1" />
                        Accountability verified: {liveStats.accounted} of {liveStats.expected} trainees accounted for ({liveStats.changed} changed from morning).
                      </span>
                    ) : (
                      <span className="text-danger fw-bold">
                        <i className="bi bi-exclamation-triangle-fill me-1" />
                        Accountability incomplete: {liveStats.unverified} trainee(s) remain unverified.
                      </span>
                    )}
                  </div>

                  {!isCompleted && (
                    <div className="d-flex align-items-center gap-2">
                      <button
                        className={`btn btn-sm px-3 fw-bold shadow-xs d-inline-flex align-items-center gap-1.5 ${
                          hasUnsavedChanges ? 'btn-primary' : 'btn-outline-primary'
                        }`}
                        onClick={handleSaveNightParade}
                        disabled={saving || completing || !hasUnsavedChanges}
                        title={hasUnsavedChanges ? "Persist Night Parade status changes to database" : "No unsaved changes"}
                      >
                        {saving ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1" />
                            SAVING...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-floppy-fill" />
                            SAVE NIGHT PARADE
                          </>
                        )}
                      </button>
                      <button
                        className={`btn btn-sm px-4 fw-bold shadow-sm ${
                          liveStats.isComplete ? 'btn-success' : 'btn-secondary'
                        }`}
                        onClick={handleCompleteNightParade}
                        disabled={saving || completing || !morningAvailable || !liveStats.isComplete}
                        title={
                          liveStats.isComplete
                            ? 'Complete and lock Night Parade State'
                            : 'All expected trainees must be verified before completion'
                        }
                      >
                        {completing ? (
                          <span className="spinner-border spinner-border-sm me-1" />
                        ) : (
                          <i className="bi bi-check-circle-fill me-1" />
                        )}
                        COMPLETE NIGHT PARADE
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
        </div>
      )}

      {/* ─── 8. SUB-TAB 2: TRADE-WISE BREAKDOWN TABLE ─── */}
      {activeSubTab === 'summary' && (
        <div className="card slaf-card shadow-sm border-0 mb-4">
          <div className="card-header bg-dark text-white p-3 fw-bold d-flex justify-content-between align-items-center">
            <span>
              <i className="bi bi-grid-3x3 me-2 text-info" />
              Trade-wise Night Accountability & Strength Breakdown — {selectedDate}
            </span>
            <span className="badge bg-secondary">
              {summaryData?.trades_breakdown?.length || 0} Trade Units
            </span>
          </div>
          <div className="card-body p-0 table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
              <thead className="table-light text-nowrap">
                <tr>
                  <th>Trade</th>
                  <th className="text-center">Expected</th>
                  <th className="text-center bg-secondary bg-opacity-10">Morn On Parade</th>
                  <th className="text-center bg-primary bg-opacity-10 text-primary fw-bold">Night On Parade</th>
                  <th className="text-center text-danger fw-bold">Changed</th>
                  <th className="text-center">Hospital</th>
                  <th className="text-center">Sick Report</th>
                  <th className="text-center">Leave</th>
                  <th className="text-center text-danger">AWOL</th>
                  <th className="text-center">Other Duties</th>
                  <th className="text-center">Night Status</th>
                </tr>
              </thead>
              <tbody>
                {!summaryData?.trades_breakdown || summaryData.trades_breakdown.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="text-center py-4 text-muted">
                      No trade breakdown available.
                    </td>
                  </tr>
                ) : (
                  summaryData.trades_breakdown.map((tb) => (
                    <tr key={tb.trade}>
                      <td className="fw-bold text-dark">{tb.trade}</td>
                      <td className="text-center font-monospace fw-bold">{tb.total_strength}</td>
                      <td className="text-center bg-secondary bg-opacity-10">{tb.morning_on_parade}</td>
                      <td className="text-center bg-primary bg-opacity-10 text-primary fw-bold">{tb.on_parade}</td>
                      <td className="text-center">
                        {tb.changed_count > 0 ? (
                          <span className="badge bg-danger text-white">{tb.changed_count}</span>
                        ) : (
                          <span className="text-muted">0</span>
                        )}
                      </td>
                      <td className="text-center font-monospace">{tb.in_hospital}</td>
                      <td className="text-center font-monospace">{tb.sick_report}</td>
                      <td className="text-center font-monospace">{tb.on_leave}</td>
                      <td className="text-center font-monospace text-danger fw-bold">{tb.awol}</td>
                      <td className="text-center font-monospace">{tb.other}</td>
                      <td className="text-center">
                        <span
                          className={`badge ${
                            tb.submission_status === 'COMPLETED'
                              ? 'bg-success'
                              : tb.submission_status === 'IN_PROGRESS'
                              ? 'bg-primary'
                              : 'bg-secondary'
                          }`}
                        >
                          {tb.submission_status || 'DRAFT'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── 9. SUB-TAB 3: MORNING -> NIGHT TRANSITIONS MATRIX ─── */}
      {activeSubTab === 'transitions' && (
        <div className="card slaf-card shadow-sm border-0 mb-4">
          <div className="card-header bg-dark text-white p-3 fw-bold d-flex justify-content-between align-items-center">
            <span>
              <i className="bi bi-arrow-left-right me-2 text-warning" />
              Morning Baseline $\rightarrow$ Night Roll Call Status Transitions Matrix
            </span>
            <span className="badge bg-secondary">
              {summaryData?.status_transitions?.length || 0} Transition Types
            </span>
          </div>
          <div className="card-body p-0 table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
              <thead className="table-light">
                <tr>
                  <th style={{ width: '220px' }}>Morning Baseline Status</th>
                  <th style={{ width: '40px' }} className="text-center">$\rightarrow$</th>
                  <th style={{ width: '220px' }}>Night Roll Call Status</th>
                  <th className="text-center" style={{ width: '120px' }}>Count</th>
                  <th>Operational Description & Accountability Significance</th>
                </tr>
              </thead>
              <tbody>
                {!summaryData?.status_transitions || summaryData.status_transitions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4 text-muted">
                      No status transitions recorded for this date.
                    </td>
                  </tr>
                ) : (
                  summaryData.status_transitions.map((tr, i) => (
                    <tr key={i} style={{ backgroundColor: tr.from_status !== tr.to_status ? 'var(--tint-danger)' : undefined }}>
                      <td>{getStatusBadge(tr.from_status)}</td>
                      <td className="text-center text-muted font-monospace">
                        <i className="bi bi-arrow-right" />
                      </td>
                      <td>{getStatusBadge(tr.to_status)}</td>
                      <td className="text-center">
                        <span className="badge bg-dark px-3 py-1 font-monospace fs-7">{tr.count}</span>
                      </td>
                      <td className="small text-muted">
                        {tr.from_status === tr.to_status ? (
                          <span className="text-success">
                            <i className="bi bi-check-circle me-1" />
                            Status maintained throughout the day without variation.
                          </span>
                        ) : (
                          <span className="text-danger fw-semibold">
                            <i className="bi bi-exclamation-circle me-1" />
                            Evening change detected: verified accountability transition during night muster.
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── 10. SUB-TAB 4: CHANGED TRAINEES NOMINAL ROLL ─── */}
      {activeSubTab === 'changes' && (
        <div className="card slaf-card shadow-sm border-0 mb-4">
          <div className="card-header bg-danger text-white p-3 fw-bold d-flex justify-content-between align-items-center">
            <span>
              <i className="bi bi-person-exclamation me-2" />
              Trainees with Status Changes from Morning Baseline — {selectedDate}
            </span>
            <span className="badge bg-white text-danger fw-bold">{liveStats.changed} Changed</span>
          </div>
          <div className="card-body p-0 table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
              <thead className="table-light text-nowrap">
                <tr>
                  <th>#</th>
                  <th>Service No</th>
                  <th>Rank & Name</th>
                  <th>Trade</th>
                  <th>Course / Batch</th>
                  <th className="text-center">Morning Baseline</th>
                  <th className="text-center">Night Roll Call</th>
                  <th>Remarks / Justification</th>
                </tr>
              </thead>
              <tbody>
                {traineeList
                  .filter((t) => {
                    const rec = traineeRecords[t.student_id]
                    const m = rec?.morning_status || t.morning_status || 'Present'
                    const n = rec?.night_status || 'Present'
                    return m !== n
                  })
                  .map((t, idx) => {
                    const rec = traineeRecords[t.student_id] || {}
                    const m = rec.morning_status || t.morning_status || 'Present'
                    const n = rec.night_status || 'Present'
                    return (
                      <tr key={t.student_id} style={{ backgroundColor: 'var(--tint-danger)' }}>
                        <td className="text-muted fw-bold">{idx + 1}</td>
                        <td className="font-monospace fw-bold text-primary">{t.service_number}</td>
                        <td className="fw-semibold text-dark">
                          {t.rank} {t.full_name}
                        </td>
                        <td>
                          <span className="badge bg-secondary-subtle text-secondary">{t.trade}</span>
                        </td>
                        <td>{t.course_name || 'N/A'} ({t.batch || '-'})</td>
                        <td className="text-center">{getStatusBadge(m)}</td>
                        <td className="text-center">{getStatusBadge(n)}</td>
                        <td>
                          <span className="text-danger fw-semibold">{rec.remarks || 'No remarks entered'}</span>
                        </td>
                      </tr>
                    )
                  })}
                {liveStats.changed === 0 && (
                  <tr>
                    <td colSpan="8" className="text-center py-5 text-muted">
                      <i className="bi bi-check-circle-fill text-success fs-2 d-block mb-2" />
                      Zero status changes: All trainees match their Morning Parade State baseline.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── 11. CLASSICAL NIGHT PARADE REPORT MODAL ─── */}
      <ClassicalReportModal
        show={showNightReportModal}
        onClose={() => setShowNightReportModal(false)}
        title={`NIGHT PARADE STATE & ROLL CALL REPORT — ${selectedDate}`}
        endpoint="/api/v1/parade/night/report"
        params={{
          parade_date: selectedDate,
          trade: selectedTrade !== 'All' ? selectedTrade : ''
        }}
        defaultOrientation="landscape"
      />
    </div>
  )
}

export default NightParadeTab
