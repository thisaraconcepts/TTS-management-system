import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import { ClassicalReportModal } from '../../components/ClassicalReportModal'
import { NightParadeTab } from './NightParadeTab'

// ─── Status badge config (Text + Accessible Icons + Colors) ────────
const SUBMISSION_STATUS_CONFIG = {
  NOT_SUBMITTED: { label: 'NOT SUBMITTED', color: '#b42318', bg: 'var(--tint-danger)', border: 'var(--tint-danger-border)', icon: 'bi-exclamation-octagon-fill' },
  DRAFT: { label: 'DRAFT (NOT SUBMITTED)', color: '#5b6574', bg: 'var(--bg-subtle)', border: 'var(--border-strong)', icon: 'bi-pencil-square' },
  SUBMITTED: { label: 'SUBMITTED', color: '#b26a00', bg: 'var(--tint-warning)', border: 'var(--tint-warning-border)', icon: 'bi-send-fill' },
  PENDING_APPROVAL: { label: 'PENDING APPROVAL', color: '#b26a00', bg: 'var(--tint-warning)', border: 'var(--tint-warning-border)', icon: 'bi-hourglass-split' },
  APPROVED: { label: 'APPROVED', color: '#1f7a4d', bg: 'var(--tint-success)', border: 'var(--tint-success-border)', icon: 'bi-patch-check-fill' },
  RETURNED: { label: 'RETURNED FOR CORRECTION', color: '#b42318', bg: 'var(--tint-danger)', border: 'var(--tint-danger-border)', icon: 'bi-arrow-counterclockwise' },
  REJECTED: { label: 'REJECTED / RETURNED', color: '#b42318', bg: 'var(--tint-danger)', border: 'var(--tint-danger-border)', icon: 'bi-x-circle-fill' },
}

const StatusBadge = ({ status, isOverdue = false }) => {
  const norm = (status || 'NOT_SUBMITTED').toUpperCase().replace(/\s+/g, '_')
  const cfg = SUBMISSION_STATUS_CONFIG[norm] || SUBMISSION_STATUS_CONFIG.NOT_SUBMITTED
  return (
    <div className="d-inline-flex align-items-center gap-1">
      <span
        className="px-2 py-1 rounded fw-bold text-nowrap"
        style={{
          background: cfg.bg,
          color: cfg.color,
          fontSize: '0.76rem',
          border: `1px solid ${cfg.border}`,
          letterSpacing: '0.02em'
        }}
      >
        <i className={`bi ${cfg.icon} me-1`} />
        [{cfg.label}]
      </span>
      {isOverdue && (
        <span
          className="badge bg-danger text-white fw-bold"
          style={{ fontSize: '0.68rem', letterSpacing: '0.03em' }}
          title="Past submission deadline for this date"
        >
          <i className="bi bi-alarm me-1" />OVERDUE
        </span>
      )}
    </div>
  )
}

export const DailyParade = () => {
  const { hasPermission, user: currentUser } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  // ── Sync URL query parameters with active tab ──────────────────
  const searchParams = new URLSearchParams(location.search)
  const initialTab = searchParams.get('tab') || 'monitoring'

  const [activeTab, setActiveTab] = useState(initialTab)
  const [selectedDate, setSelectedDate] = useState(
    searchParams.get('date') || new Date().toISOString().substring(0, 10)
  )
  const [statuses, setStatuses] = useState([])
  const [trades, setTrades] = useState([]) // Loaded from DB trades table

  // Update tab in URL without reloading
  const handleTabChange = (newTab) => {
    setActiveTab(newTab)
    const p = new URLSearchParams(location.search)
    p.set('tab', newTab)
    navigate({ search: p.toString() }, { replace: true })
  }

  // ── TAB 1: Outstanding & Monitoring State ──────────────────────
  const [monitoringData, setMonitoringData] = useState(null)
  const [monitoringLoading, setMonitoringLoading] = useState(true)
  const [monitoringSubFilter, setMonitoringSubFilter] = useState('ALL') // ALL | OUTSTANDING | PENDING | APPROVED | RETURNED | MY_TRADES
  const [monitoringTradeFilter, setMonitoringTradeFilter] = useState('All')
  const [monitoringSearch, setMonitoringSearch] = useState('')

  // ── TAB 2: Record & Submit State ──────────────────────────────
  const [students, setStudents] = useState([])
  const [paradeRecords, setParadeRecords] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedTrade, setSelectedTrade] = useState(searchParams.get('trade') || 'All')
  const [officerOptions, setOfficerOptions] = useState([])
  const [submitterRemarks, setSubmitterRemarks] = useState('')
  const [tradeSubmissions, setTradeSubmissions] = useState({}) // trade -> submission info
  const [showSubmitPreviewModal, setShowSubmitPreviewModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showOutstandingReportModal, setShowOutstandingReportModal] = useState(false)

  // ── TAB 3: Pending Approvals (Officer I/C) ─────────────────────
  const [pendingApprovals, setPendingApprovals] = useState([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const [approvalDetail, setApprovalDetail] = useState(null)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approverRemarks, setApproverRemarks] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // ── TAB 4: Date Range Compliance Monitoring ───────────────────
  const [rangeStartDate, setRangeStartDate] = useState(
    new Date(Date.now() - 6 * 86400000).toISOString().substring(0, 10)
  )
  const [rangeEndDate, setRangeEndDate] = useState(new Date().toISOString().substring(0, 10))
  const [rangeTradeFilter, setRangeTradeFilter] = useState('All')
  const [dateRangeData, setDateRangeData] = useState(null)
  const [rangeLoading, setRangeLoading] = useState(false)

  // ── TAB 5: Submission History ──────────────────────────────────
  const [historyList, setHistoryList] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyDateFilter, setHistoryDateFilter] = useState('')
  const [historyStatusFilter, setHistoryStatusFilter] = useState('')
  const [expandedHistory, setExpandedHistory] = useState(null)

  // ── TAB 6: Officer I/C Management ──────────────────────────────
  const [officers, setOfficers] = useState([])
  const [officersLoading, setOfficersLoading] = useState(false)
  const [showOICModal, setShowOICModal] = useState(false)
  const [oicTrade, setOicTrade] = useState('')
  const [oicUserId, setOicUserId] = useState('')
  const [allUsers, setAllUsers] = useState([])
  const [savingOIC, setSavingOIC] = useState(false)

  // ── Initial Boot (Master Data) ─────────────────────────────────
  useEffect(() => {
    const fetchBootData = async () => {
      try {
        const [statusRes, tradeRes, oicRes] = await Promise.all([
          axios.get('/api/v1/parade/statuses'),
          axios.get('/api/v1/students/trades', { params: { active_only: true } }),
          axios.get('/api/v1/parade/officers')
        ])
        setStatuses(statusRes.data || [])
        setTrades(tradeRes.data || [])
        setOfficerOptions(oicRes.data || [])
      } catch {
        /* non-critical */
      }
    }
    fetchBootData()
  }, [])

  // Keep state synced if URL query params change externally
  useEffect(() => {
    const p = new URLSearchParams(location.search)
    const tabParam = p.get('tab')
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam)
    }
    const tradeParam = p.get('trade')
    if (tradeParam && tradeParam !== selectedTrade) {
      setSelectedTrade(tradeParam)
    }
  }, [location.search])

  // ── 1. Load Live Monitoring Data ───────────────────────────────
  const loadMonitoringData = useCallback(async () => {
    setMonitoringLoading(true)
    try {
      const res = await axios.get('/api/v1/parade/monitoring', {
        params: { parade_date: selectedDate }
      })
      setMonitoringData(res.data)
    } catch {
      toast.error('Failed to load parade state monitoring status')
    } finally {
      setMonitoringLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    if (activeTab === 'monitoring' || activeTab === 'outstanding') {
      loadMonitoringData()
    }
  }, [selectedDate, activeTab, loadMonitoringData])

  // ── 2. Load Record & Submit Tab Data ───────────────────────────
  const loadParadeData = useCallback(async () => {
    setLoading(true)
    try {
      const [studentsRes, paradeRes, subRes] = await Promise.all([
        axios.get('/api/v1/students', { params: { limit: 500 } }),
        axios.get('/api/v1/parade/status', { params: { parade_date: selectedDate } }),
        axios.get('/api/v1/parade/submissions', { params: { parade_date: selectedDate } })
      ])

      const activeTrainees = studentsRes.data.items || []
      setStudents(activeTrainees)

      const initialMap = {}
      activeTrainees.forEach((s) => {
        initialMap[s.id] = { status: 'Present', remarks: '' }
      })
      paradeRes.data.forEach((r) => {
        initialMap[r.student_id] = { status: r.status, remarks: r.remarks || '' }
      })
      setParadeRecords(initialMap)

      const submissionMap = {}
      subRes.data.forEach((s) => {
        submissionMap[s.trade] = s
      })
      setTradeSubmissions(submissionMap)
    } catch {
      toast.error('Failed to load parade records')
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    if (activeTab === 'record') {
      loadParadeData()
    }
  }, [selectedDate, activeTab, loadParadeData])

  // ── 3. Load Pending Approvals ──────────────────────────────────
  const loadPendingApprovals = useCallback(async () => {
    if (!hasPermission('parade:approve')) return
    setPendingLoading(true)
    try {
      const res = await axios.get('/api/v1/parade/submissions/pending')
      setPendingApprovals(res.data || [])
    } catch {
      toast.error('Failed to load pending approvals')
    } finally {
      setPendingLoading(false)
    }
  }, [hasPermission])

  useEffect(() => {
    if (activeTab === 'approvals') {
      loadPendingApprovals()
    }
  }, [activeTab, loadPendingApprovals])

  // ── 4. Load Date Range Monitoring ──────────────────────────────
  const loadDateRangeMonitoring = useCallback(async () => {
    setRangeLoading(true)
    try {
      const params = { start_date: rangeStartDate, end_date: rangeEndDate }
      if (rangeTradeFilter !== 'All') params.trade = rangeTradeFilter
      const res = await axios.get('/api/v1/parade/monitoring/date-range', { params })
      setDateRangeData(res.data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load date-range data')
    } finally {
      setRangeLoading(false)
    }
  }, [rangeStartDate, rangeEndDate, rangeTradeFilter])

  useEffect(() => {
    if (activeTab === 'daterange') {
      loadDateRangeMonitoring()
    }
  }, [activeTab, loadDateRangeMonitoring])

  // ── 5. Load History ────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const params = { limit: 100 }
      if (historyDateFilter) params.parade_date = historyDateFilter
      if (historyStatusFilter) params.status = historyStatusFilter
      const res = await axios.get('/api/v1/parade/submissions', { params })
      setHistoryList(res.data || [])
    } catch {
      toast.error('Failed to load history')
    } finally {
      setHistoryLoading(false)
    }
  }, [historyDateFilter, historyStatusFilter])

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory()
    }
  }, [activeTab, loadHistory])

  // ── 6. Load Officers ───────────────────────────────────────────
  const loadOfficers = useCallback(async () => {
    setOfficersLoading(true)
    try {
      const [officersRes, usersRes] = await Promise.all([
        axios.get('/api/v1/parade/officers'),
        axios.get('/api/v1/system/users', { params: { limit: 200 } }).catch(() => ({ data: { items: [] } }))
      ])
      setOfficers(officersRes.data || [])
      setAllUsers(usersRes.data.items || usersRes.data || [])
    } catch {
      toast.error('Failed to load officer assignments')
    } finally {
      setOfficersLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'officers') {
      loadOfficers()
    }
  }, [activeTab, loadOfficers])

  // ── Actions & Fast Redirects ───────────────────────────────────
  const handleDirectSubmitFromMonitoring = (tradeName, dateVal = selectedDate) => {
    setSelectedTrade(tradeName)
    setSelectedDate(dateVal)
    handleTabChange('record')
  }

  const handleStatusChange = (studentId, status) => {
    setParadeRecords((prev) => ({ ...prev, [studentId]: { ...prev[studentId], status } }))
  }

  const handleRemarksChange = (studentId, remarks) => {
    setParadeRecords((prev) => ({ ...prev, [studentId]: { ...prev[studentId], remarks } }))
  }

  const getRecordsForTrade = (trade) => {
    const tradeStudents = trade === 'All' ? students : students.filter((s) => s.trade === trade)
    return tradeStudents.map((s) => ({
      student_id: s.id,
      status: paradeRecords[s.id]?.status || 'Present',
      remarks: paradeRecords[s.id]?.remarks || ''
    }))
  }

  const handleSaveDraft = async () => {
    if (selectedTrade === 'All') {
      toast.warning('Please select a specific trade to save a draft')
      return
    }
    setSaving(true)
    try {
      await axios.post('/api/v1/parade/draft', {
        date: selectedDate,
        trade: selectedTrade,
        records: getRecordsForTrade(selectedTrade)
      })
      toast.success(`Draft saved for ${selectedTrade} — ${selectedDate}`)
      await loadParadeData()
      await loadMonitoringData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save draft')
    } finally {
      setSaving(false)
    }
  }

  const currentMonitoringItem = useMemo(() => {
    if (!monitoringData?.items) return null
    return monitoringData.items.find((i) => i.trade === selectedTrade)
  }, [monitoringData, selectedTrade])

  const handleOpenSubmitPreview = () => {
    if (selectedTrade === 'All') {
      toast.warning('Please select a specific trade to submit')
      return
    }
    setShowSubmitPreviewModal(true)
  }

  const handleConfirmSubmitForApproval = async () => {
    setSubmitting(true)
    try {
      const payload = {
        date: selectedDate,
        trade: selectedTrade,
        submitter_remarks: submitterRemarks,
        records: getRecordsForTrade(selectedTrade)
      }
      if (currentMonitoringItem?.course_id) {
        payload.course_id = currentMonitoringItem.course_id
      }
      if (currentMonitoringItem?.batch && currentMonitoringItem.batch !== 'N/A') {
        payload.batch = currentMonitoringItem.batch
      }
      const res = await axios.post('/api/v1/parade/submit', payload)
      toast.success(`Parade state submitted for approval — ${selectedTrade}`)
      toast.info(`Assigned Approval Authority: ${res.data.approving_officer || 'Assigned Instructor'}`)
      setSubmitterRemarks('')
      setShowSubmitPreviewModal(false)
      await loadParadeData()
      await loadMonitoringData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit parade state')
    } finally {
      setSubmitting(false)
    }
  }

  const openApprovalDetail = async (submissionId) => {
    if (!submissionId) {
      toast.warning('No active submission found for this unit')
      return
    }
    try {
      const res = await axios.get(`/api/v1/parade/submissions/${submissionId}`)
      setApprovalDetail(res.data)
      setApproverRemarks('')
      setRejectionReason('')
      setShowApprovalModal(true)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load submission details')
    }
  }

  const handleApprove = async () => {
    if (!approvalDetail) return
    setActionLoading(true)
    try {
      await axios.post(`/api/v1/parade/submissions/${approvalDetail.id}/approve`, {
        remarks: approverRemarks
      })
      toast.success(`Parade State APPROVED as Official Strength — ${approvalDetail.trade} (${approvalDetail.date})`)
      setShowApprovalModal(false)
      await loadPendingApprovals()
      await loadMonitoringData()
      await loadParadeData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Approval failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectOrReturn = async () => {
    if (!approvalDetail) return
    if (!rejectionReason.trim()) {
      toast.warning('Return/Rejection reason is mandatory')
      return
    }
    setActionLoading(true)
    try {
      await axios.post(`/api/v1/parade/submissions/${approvalDetail.id}/return`, {
        rejection_reason: rejectionReason,
        remarks: approverRemarks
      })
      toast.warning(`Parade State RETURNED FOR CORRECTION — ${approvalDetail.trade} (${approvalDetail.date})`)
      setShowApprovalModal(false)
      await loadPendingApprovals()
      await loadMonitoringData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Return action failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAssignOIC = async () => {
    if (!oicTrade || !oicUserId) {
      toast.warning('Please select both a trade and a user')
      return
    }
    setSavingOIC(true)
    try {
      await axios.post('/api/v1/parade/officers', { trade: oicTrade, user_id: oicUserId })
      toast.success(`Officer I/C assigned for ${oicTrade}`)
      setShowOICModal(false)
      setOicTrade('')
      setOicUserId('')
      await loadOfficers()
      const oicRes = await axios.get('/api/v1/parade/officers')
      setOfficerOptions(oicRes.data || [])
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to assign Officer I/C')
    } finally {
      setSavingOIC(false)
    }
  }

  const handleRemoveOIC = async (oicId, trade) => {
    if (!window.confirm(`Remove Officer I/C assignment for ${trade}?`)) return
    try {
      await axios.delete(`/api/v1/parade/officers/${oicId}`)
      toast.success('Officer I/C assignment removed')
      await loadOfficers()
    } catch {
      toast.error('Failed to remove assignment')
    }
  }

  // ── Derived Data for Monitoring Tab ───────────────────────────
  const filteredMonitoringItems = useMemo(() => {
    if (!monitoringData?.items) return []
    let list = monitoringData.items

    // Filter by Sub-category pills
    if (monitoringSubFilter === 'OUTSTANDING') {
      list = list.filter((i) => i.status_code === 'NOT_SUBMITTED' || i.status_code === 'RETURNED')
    } else if (monitoringSubFilter === 'PENDING') {
      list = list.filter((i) => i.status_code === 'PENDING_APPROVAL')
    } else if (monitoringSubFilter === 'APPROVED') {
      list = list.filter((i) => i.status_code === 'APPROVED')
    } else if (monitoringSubFilter === 'RETURNED') {
      list = list.filter((i) => i.status_code === 'RETURNED')
    } else if (monitoringSubFilter === 'MY_TRADES') {
      const myTradeNames = officerOptions
        .filter((o) => o.user_id === currentUser?.id)
        .map((o) => o.trade.toLowerCase())
      list = list.filter((i) => myTradeNames.includes(i.trade.toLowerCase()) || i.submitted_by === currentUser?.id)
    }

    // Filter by trade dropdown
    if (monitoringTradeFilter !== 'All') {
      list = list.filter((i) => i.trade.toLowerCase() === monitoringTradeFilter.toLowerCase())
    }

    // Filter by keyword search
    if (monitoringSearch.trim()) {
      const q = monitoringSearch.toLowerCase()
      list = list.filter(
        (i) =>
          i.trade.toLowerCase().includes(q) ||
          (i.course_name && i.course_name.toLowerCase().includes(q)) ||
          (i.batch && i.batch.toLowerCase().includes(q)) ||
          (i.submitted_by_name && i.submitted_by_name.toLowerCase().includes(q)) ||
          (i.approving_officer_name && i.approving_officer_name.toLowerCase().includes(q))
      )
    }

    return list
  }, [monitoringData, monitoringSubFilter, monitoringTradeFilter, monitoringSearch, officerOptions, currentUser])

  const displayStudents = selectedTrade === 'All' ? students : students.filter((s) => s.trade === selectedTrade)
  const currentTradeSubmission = selectedTrade !== 'All' ? tradeSubmissions[selectedTrade] : null
  const canSubmit = currentTradeSubmission?.status !== 'SUBMITTED' && currentTradeSubmission?.status !== 'APPROVED'

  const officersForTrade =
    selectedTrade !== 'All' ? officerOptions.filter((o) => o.trade === selectedTrade) : officerOptions

  const getStatusColor = (status) => {
    const map = {
      Present: '#1f7a4d',
      AWOL: '#b42318',
      Hospital: '#6e5a8a',
      Leave: '#2c5ea8',
      'Sick Report': '#b26a00',
      'Temporary Duty': '#2f6f86',
      'Course Visit': '#2f6f86',
      'Detached Duty': '#6e5a8a'
    }
    return map[status] || '#5b6574'
  }

  // Quick date change helper (-1 day, Today, +1 day)
  const shiftDate = (days) => {
    const cur = new Date(selectedDate)
    cur.setDate(cur.getDate() + days)
    setSelectedDate(cur.toISOString().substring(0, 10))
  }

  return (
    <div className="fade-in-slide">
      {/* ─── Page Header with Date Navigator ─── */}
      <div className="page-header">
        <div>
          <span className="page-eyebrow">Parade State</span>
          <h2 className="page-title">Daily parade & strength</h2>
          <p className="page-subtitle">
            Track submissions, approve parade states and keep the official daily strength.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          {/* Quick Date Stepper */}
          <div className="btn-group shadow-xs">
            <button className="btn btn-outline-secondary btn-sm" onClick={() => shiftDate(-1)} title="Previous Day">
              <i className="bi bi-chevron-left" />
            </button>
            <button
              className="btn btn-outline-secondary btn-sm fw-semibold"
              onClick={() => setSelectedDate(new Date().toISOString().substring(0, 10))}
              title="Reset to Operational Today"
            >
              Today
            </button>
            <button className="btn btn-outline-secondary btn-sm" onClick={() => shiftDate(1)} title="Next Day">
              <i className="bi bi-chevron-right" />
            </button>
          </div>

          <input
            type="date"
            className="form-control form-control-sm shadow-xs fw-semibold"
            style={{ width: '160px' }}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />

          <button
            className="btn btn-outline-primary btn-sm fw-semibold shadow-xs"
            onClick={() => setShowOutstandingReportModal(true)}
            title="Generate Official Classical Outstanding Parade State Report"
          >
            <i className="bi bi-file-earmark-pdf me-1" />
            Outstanding Report
          </button>

          <button
            className="btn btn-outline-dark btn-sm fw-semibold shadow-xs"
            onClick={() => setShowReportModal(true)}
            title="Print Official Daily Strength Register"
          >
            <i className="bi bi-printer me-1" />
            Strength Register
          </button>
        </div>
      </div>

      {/* ─── Top-Level Navigation Tabs ─── */}
      <ul className="nav nav-tabs nav-tabs-responsive mb-4">
        {[
          {
            key: 'monitoring',
            icon: 'bi-speedometer2',
            label: 'Outstanding & Monitoring',
            badge: monitoringData?.summary?.not_submitted ? `${monitoringData.summary.not_submitted} Due` : null,
            badgeColor: 'bg-danger'
          },
          {
            key: 'record',
            icon: 'bi-clipboard2-check',
            label: 'Submit Parade State'
          },
          {
            key: 'night',
            icon: 'bi-moon-stars-fill',
            label: 'Night Parade / Roll Call'
          },
          {
            key: 'approvals',
            icon: 'bi-shield-check',
            label: 'Pending Approvals',
            badge: pendingApprovals.length > 0 ? String(pendingApprovals.length) : null,
            badgeColor: 'bg-warning text-dark',
            show: hasPermission('parade:approve')
          },
          {
            key: 'daterange',
            icon: 'bi-calendar3-range',
            label: 'Date-Range Tracking'
          },
          {
            key: 'history',
            icon: 'bi-clock-history',
            label: 'Submission History'
          },

        ]
          .filter((t) => t.show !== false)
          .map((tab) => (
            <li key={tab.key} className="nav-item">
              <button
                className={`nav-link d-flex align-items-center gap-2 ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => handleTabChange(tab.key)}
              >
                <i className={`bi ${tab.icon}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`badge ${tab.badgeColor} rounded-pill px-2 py-0.5`} style={{ fontSize: '0.7rem' }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            </li>
          ))}
      </ul>

      {/* ═══════════════════════════════════════════════════════
          TAB 1: OUTSTANDING & SUBMISSION MONITORING
      ═══════════════════════════════════════════════════════ */}
      {(activeTab === 'monitoring' || activeTab === 'outstanding') && (
        <div>
          {/* ── Live KPI Summary Cards ── */}
          {monitoringData?.summary && (
            <div className="row g-3 mb-4">
              <div className="col-6 col-md-4 col-xl-2">
                <div
                  className="card slaf-card p-3 text-center h-100 cursor-pointer shadow-xs"
                  style={{
                    borderTop: '4px solid #2c5ea8',
                    background: monitoringSubFilter === 'ALL' ? 'var(--tint-primary)' : 'var(--bg-card)'
                  }}
                  onClick={() => setMonitoringSubFilter('ALL')}
                >
                  <div className="text-muted small fw-semibold text-uppercase">Total Required</div>
                  <div className="fw-bold text-primary display-6 my-1">{monitoringData.summary.total_required}</div>
                  <div className="small text-muted">Active Trade Units</div>
                </div>
              </div>

              <div className="col-6 col-md-4 col-xl-2">
                <div
                  className="card slaf-card p-3 text-center h-100 cursor-pointer shadow-xs"
                  style={{
                    borderTop: '4px solid #b42318',
                    background: monitoringSubFilter === 'OUTSTANDING' ? 'var(--tint-danger)' : 'var(--bg-card)'
                  }}
                  onClick={() => setMonitoringSubFilter('OUTSTANDING')}
                >
                  <div className="text-muted small fw-semibold text-uppercase">Not Submitted</div>
                  <div className="fw-bold text-danger display-6 my-1">{monitoringData.summary.not_submitted}</div>
                  <div className="small text-danger fw-semibold">Action Required</div>
                </div>
              </div>

              <div className="col-6 col-md-4 col-xl-2">
                <div
                  className="card slaf-card p-3 text-center h-100 cursor-pointer shadow-xs"
                  style={{
                    borderTop: '4px solid #b26a00',
                    background: monitoringSubFilter === 'PENDING' ? 'var(--tint-warning)' : 'var(--bg-card)'
                  }}
                  onClick={() => setMonitoringSubFilter('PENDING')}
                >
                  <div className="text-muted small fw-semibold text-uppercase">Pending Approval</div>
                  <div className="fw-bold text-warning display-6 my-1">{monitoringData.summary.pending_approval}</div>
                  <div className="small text-muted">Awaiting  Instructor </div>
                </div>
              </div>

              <div className="col-6 col-md-4 col-xl-2">
                <div
                  className="card slaf-card p-3 text-center h-100 cursor-pointer shadow-xs"
                  style={{
                    borderTop: '4px solid #1f7a4d',
                    background: monitoringSubFilter === 'APPROVED' ? 'var(--tint-success)' : 'var(--bg-card)'
                  }}
                  onClick={() => setMonitoringSubFilter('APPROVED')}
                >
                  <div className="text-muted small fw-semibold text-uppercase">Approved</div>
                  <div className="fw-bold text-success display-6 my-1">{monitoringData.summary.approved}</div>
                  <div className="small text-success fw-semibold">Official Daily Strength</div>
                </div>
              </div>

              <div className="col-6 col-md-4 col-xl-2">
                <div
                  className="card slaf-card p-3 text-center h-100 cursor-pointer shadow-xs"
                  style={{
                    borderTop: '4px solid #b42318',
                    background: monitoringSubFilter === 'RETURNED' ? 'var(--tint-danger)' : 'var(--bg-card)'
                  }}
                  onClick={() => setMonitoringSubFilter('RETURNED')}
                >
                  <div className="text-muted small fw-semibold text-uppercase">Returned</div>
                  <div className="fw-bold text-danger display-6 my-1">{monitoringData.summary.returned}</div>
                  <div className="small text-muted">Correction Required</div>
                </div>
              </div>

              <div className="col-6 col-md-4 col-xl-2">
                <div
                  className="card slaf-card p-3 text-center h-100 shadow-xs"
                  style={{ borderTop: '4px solid #6e5a8a', background: 'var(--tint-plum)' }}
                >
                  <div className="text-muted small fw-semibold text-uppercase">Overdue / Delays</div>
                  <div className="fw-bold display-6 my-1" style={{ color: '#6e5a8a' }}>
                    {monitoringData.summary.overdue}
                  </div>
                  <div className="small text-muted">Deadline: 08:00 hrs</div>
                </div>
              </div>
            </div>
          )}

          {/* ── Sub-Filter Pills & Search Bar ── */}
          <div className="card slaf-card p-3 mb-3">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span className="fw-semibold text-muted small me-1">
                  <i className="bi bi-funnel me-1" />Filter View:
                </span>
                {[
                  { key: 'ALL', label: `All Required (${monitoringData?.summary?.total_required ?? 0})` },
                  { key: 'OUTSTANDING', label: `Outstanding (${monitoringData?.summary?.not_submitted ?? 0})` },
                  { key: 'PENDING', label: `Pending Approval (${monitoringData?.summary?.pending_approval ?? 0})` },
                  { key: 'APPROVED', label: `Approved (${monitoringData?.summary?.approved ?? 0})` },
                  { key: 'RETURNED', label: `Returned (${monitoringData?.summary?.returned ?? 0})` },
                  { key: 'MY_TRADES', label: 'My Scope' }
                ].map((pill) => (
                  <button
                    key={pill.key}
                    className={`btn btn-sm ${monitoringSubFilter === pill.key ? 'btn-primary' : 'btn-outline-secondary'
                      } fw-semibold`}
                    style={{ fontSize: '0.8rem', padding: '4px 12px' }}
                    onClick={() => setMonitoringSubFilter(pill.key)}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              <div className="d-flex align-items-center gap-2 flex-wrap">
                <select
                  className="form-select form-select-sm"
                  style={{ width: '180px' }}
                  value={monitoringTradeFilter}
                  onChange={(e) => setMonitoringTradeFilter(e.target.value)}
                >
                  <option value="All">All Trades</option>
                  {trades.map((t) => (
                    <option key={t.id} value={t.label}>
                      {t.label}
                    </option>
                  ))}
                </select>

                <div className="input-group input-group-sm" style={{ width: '220px' }}>
                  <span className="input-group-text bg-white">
                    <i className="bi bi-search text-muted" />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search trade/course/user..."
                    value={monitoringSearch}
                    onChange={(e) => setMonitoringSearch(e.target.value)}
                  />
                </div>

                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={loadMonitoringData}
                  title="Refresh status from database"
                >
                  <i className="bi bi-arrow-clockwise" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Monitoring Table ── */}
          {monitoringLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
              <div className="text-muted mt-2 small">Analyzing parade submission states...</div>
            </div>
          ) : filteredMonitoringItems.length === 0 ? (
            <div className="card slaf-card p-5 text-center text-muted">
              <i className="bi bi-clipboard2-check" style={{ fontSize: '3rem', opacity: 0.3 }} />
              <h6 className="mt-3 fw-bold">No Records Match the Selected Filter</h6>
              <p className="small mb-0">Try selecting a different filter pill or reset the trade filter.</p>
            </div>
          ) : (
            <div className="card slaf-card p-0 mb-4 shadow-sm">
              <div className="table-responsive">
                <table className="table slaf-table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '60px' }} className="text-center">S/No</th>
                      <th style={{ minWidth: '180px' }}>Trade & Course</th>
                      <th style={{ width: '100px' }} className="text-center">Batch</th>
                      <th style={{ width: '90px' }} className="text-center">Strength</th>
                      <th style={{ minWidth: '190px' }}>Submission & Approval Status</th>
                      <th style={{ minWidth: '170px' }}>Submitted By</th>
                      <th style={{ minWidth: '190px' }}>Assigned Instructor (Approver)</th>
                      <th style={{ minWidth: '160px' }} className="text-end">Required Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMonitoringItems.map((item) => {
                      const isUnsubmitted = item.status_code === 'NOT_SUBMITTED'
                      const isPending = item.status_code === 'PENDING_APPROVAL'
                      const isApproved = item.status_code === 'APPROVED'
                      const isReturned = item.status_code === 'RETURNED'
                      const isUnassignedInst = item.instructor_status === 'NOT_ASSIGNED'

                      return (
                        <tr
                          key={item.trade}
                          style={{
                            background: isReturned
                              ? 'var(--tint-danger)'
                              : isPending
                                ? 'var(--tint-warning)'
                                : isApproved
                                  ? 'var(--tint-success)'
                                  : 'transparent'
                          }}
                        >
                          <td className="text-center fw-bold text-muted">{item.s_no}</td>
                          <td>
                            <div className="fw-bold text-dark" style={{ fontSize: '0.9rem' }}>
                              <i className="bi bi-airplane-engines me-1 text-primary" />
                              {item.trade}
                            </div>
                            <div className="text-muted small mt-0.5" style={{ fontSize: '0.75rem' }}>
                              {item.course_name ? `${item.course_code || ''} · ${item.course_name}` : 'General Trade Group'}
                            </div>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-secondary-subtle text-dark border" style={{ fontSize: '0.73rem' }}>
                              {item.batch || 'N/A'}
                            </span>
                          </td>
                          <td className="text-center">
                            <span className="fw-bold text-dark" style={{ fontSize: '0.9rem' }}>
                              {item.total_trainees}
                            </span>
                            <div className="text-muted" style={{ fontSize: '0.68rem' }}>Personnel</div>
                          </td>
                          <td>
                            <StatusBadge status={item.status_code} isOverdue={item.is_overdue} />
                            {isReturned && item.rejection_reason && (
                              <div className="text-danger small mt-1" style={{ fontSize: '0.75rem' }}>
                                <i className="bi bi-info-circle me-1" />
                                <strong>Remarks:</strong> {item.rejection_reason}
                              </div>
                            )}
                          </td>
                          <td>
                            {item.submitted_by_name ? (
                              <div>
                                <div className="fw-semibold text-dark" style={{ fontSize: '0.82rem' }}>
                                  {item.submitted_by_name}
                                </div>
                                <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                                  {item.submitted_at ? new Date(item.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted small">—</span>
                            )}
                          </td>
                          <td>
                            {item.status_code === 'APPROVED' && item.approving_officer_name ? (
                              <div>
                                <div className="fw-semibold text-success" style={{ fontSize: '0.82rem' }}>
                                  <i className="bi bi-patch-check-fill me-1" />
                                  {item.approving_officer_name}
                                </div>
                                <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                                  {item.reviewed_at ? new Date(item.reviewed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Approved'}
                                </div>
                              </div>
                            ) : isUnassignedInst ? (
                              <span className="badge bg-warning-subtle text-danger border" style={{ fontSize: '0.72rem' }}>
                                <i className="bi bi-exclamation-triangle-fill me-1" />
                                INSTRUCTOR NOT ASSIGNED
                              </span>
                            ) : item.assigned_instructor_name ? (
                              <div>
                                <div className="fw-semibold text-dark" style={{ fontSize: '0.82rem' }}>
                                  <i className="bi bi-person-badge me-1 text-primary" />
                                  {item.assigned_instructor_name}
                                </div>
                                <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                                  {item.status_code === 'PENDING_APPROVAL' ? 'Awaiting Instructor Review' : 'Assigned from Course/Batch'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted small">—</span>
                            )}
                          </td>
                          <td className="text-end">
                            {isUnsubmitted && (
                              <button
                                className="btn btn-primary btn-sm fw-semibold shadow-xs"
                                style={{ fontSize: '0.78rem' }}
                                onClick={() => handleDirectSubmitFromMonitoring(item.trade)}
                              >
                                <i className="bi bi-pencil-square me-1" />
                                Submit Parade
                              </button>
                            )}
                            {isReturned && (
                              <button
                                className="btn btn-danger btn-sm fw-semibold shadow-xs"
                                style={{ fontSize: '0.78rem' }}
                                onClick={() => handleDirectSubmitFromMonitoring(item.trade)}
                              >
                                <i className="bi bi-arrow-repeat me-1" />
                                Correct & Resubmit
                              </button>
                            )}
                            {isPending && (
                              <div className="d-inline-flex gap-1">
                                {hasPermission('parade:approve') ? (
                                  <button
                                    className="btn btn-warning btn-sm fw-semibold shadow-xs text-dark"
                                    style={{ fontSize: '0.78rem' }}
                                    onClick={() => openApprovalDetail(item.submission_id)}
                                  >
                                    <i className="bi bi-shield-check me-1" />
                                    Review & Approve
                                  </button>
                                ) : (
                                  <button
                                    className="btn btn-outline-secondary btn-sm fw-semibold"
                                    style={{ fontSize: '0.78rem' }}
                                    onClick={() => handleDirectSubmitFromMonitoring(item.trade)}
                                  >
                                    <i className="bi bi-eye me-1" />
                                    View
                                  </button>
                                )}
                              </div>
                            )}
                            {isApproved && (
                              <button
                                className="btn btn-outline-success btn-sm fw-semibold"
                                style={{ fontSize: '0.78rem' }}
                                onClick={() => handleDirectSubmitFromMonitoring(item.trade)}
                              >
                                <i className="bi bi-check2-circle me-1" />
                                View Strength
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 2: RECORD & SUBMIT PARADE STATE
      ═══════════════════════════════════════════════════════ */}
      {activeTab === 'record' && (
        <div>
          {/* Trade Filter Bar & Quick State */}
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <div>
                <label className="form-label mb-1 fw-semibold" style={{ fontSize: '0.82rem' }}>
                  <i className="bi bi-funnel me-1" />Target Trade *
                </label>
                <select
                  className="form-select form-select-sm"
                  style={{ width: '220px' }}
                  value={selectedTrade}
                  onChange={(e) => {
                    setSelectedTrade(e.target.value)
                    setSelectedOfficerId('')
                  }}
                >
                  <option value="All">All Trades (Overview)</option>
                  {trades.map((t) => (
                    <option key={t.id} value={t.label}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {selectedTrade !== 'All' && currentTradeSubmission && (
                <div className="mt-auto">
                  <label className="form-label mb-1 fw-semibold text-muted" style={{ fontSize: '0.82rem' }}>
                    Submission Status
                  </label>
                  <div>
                    <StatusBadge status={currentTradeSubmission.status} />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Trainee Strength Summary Pills */}
            {!loading && (
              <div className="d-flex gap-2 flex-wrap">
                {[
                  { label: 'Total', count: displayStudents.length, color: '#2c5ea8' },
                  {
                    label: 'Present',
                    count: displayStudents.filter(
                      (s) => (paradeRecords[s.id]?.status || 'Present') === 'Present'
                    ).length,
                    color: '#1f7a4d'
                  },
                  {
                    label: 'Absent',
                    count: displayStudents.filter(
                      (s) => (paradeRecords[s.id]?.status || 'Present') !== 'Present'
                    ).length,
                    color: '#b42318'
                  }
                ].map((pill) => (
                  <div
                    key={pill.label}
                    className="rounded px-3 py-1 text-center"
                    style={{ background: `${pill.color}15`, border: `1px solid ${pill.color}30` }}
                  >
                    <div className="fw-bold" style={{ color: pill.color, fontSize: '1.1rem' }}>
                      {pill.count}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: pill.color }}>{pill.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Returned / Rejected Banner with Revision Prompt */}
          {currentTradeSubmission?.status === 'REJECTED' && (
            <div className="alert alert-danger d-flex align-items-start gap-3 mb-3 border-danger shadow-xs">
              <i className="bi bi-arrow-counterclockwise mt-1 fs-4" />
              <div>
                <h6 className="fw-bold mb-1">Parade State Returned for Correction</h6>
                <div style={{ fontSize: '0.88rem' }}>
                  <strong>Officer Remarks:</strong>{' '}
                  <em>{currentTradeSubmission.rejection_reason || 'Please correct trainee records and resubmit.'}</em>
                </div>
                <div className="small text-muted mt-1">
                  Revise the records below and click <strong>Submit</strong> to send the corrected parade state back to Officer I/C.
                </div>
              </div>
            </div>
          )}

          {/* Approved Banner */}
          {currentTradeSubmission?.status === 'APPROVED' && (
            <div className="alert alert-success d-flex align-items-center gap-3 mb-3 border-success shadow-xs">
              <i className="bi bi-patch-check-fill fs-3 text-success" />
              <div>
                <h6 className="fw-bold mb-0">Official Approved Daily Strength</h6>
                <div style={{ fontSize: '0.85rem' }}>
                  Approved by {currentTradeSubmission.officer_name || 'Officer I/C'} on{' '}
                  {currentTradeSubmission.reviewed_at
                    ? new Date(currentTradeSubmission.reviewed_at).toLocaleString()
                    : '—'}
                  {currentTradeSubmission.approver_remarks && ` — "${currentTradeSubmission.approver_remarks}"`}
                </div>
              </div>
            </div>
          )}

          {/* Awaiting Approval Banner */}
          {currentTradeSubmission?.status === 'SUBMITTED' && (
            <div className="alert alert-warning d-flex align-items-center gap-3 mb-3 border-warning shadow-xs">
              <i className="bi bi-hourglass-split fs-4 text-warning" />
              <div>
                <h6 className="fw-bold mb-0">Awaiting Officer I/C Approval</h6>
                <div style={{ fontSize: '0.85rem' }}>
                  Submitted to <strong>{currentTradeSubmission.officer_name || 'Designated Officer'}</strong> at{' '}
                  {currentTradeSubmission.submitted_at
                    ? new Date(currentTradeSubmission.submitted_at).toLocaleString()
                    : '—'}
                  . This record does not contribute to the official daily strength until approved.
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
            </div>
          ) : (
            <>
              {/* Trainee Parade Roster Table */}
              <div className="card slaf-card p-0 mb-4 shadow-sm">
                <div className="table-responsive">
                  <table className="table slaf-table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '130px' }}>Service No.</th>
                        <th>Rank & Trainee Full Name</th>
                        <th style={{ width: '120px' }}>Trade</th>
                        <th style={{ width: '200px' }}>Parade Status</th>
                        <th>Remarks / Authority (Log)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayStudents.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center py-5 text-muted">
                            No active trainees found{selectedTrade !== 'All' ? ` for trade: ${selectedTrade}` : ''}.
                          </td>
                        </tr>
                      ) : (
                        displayStudents.map((student) => {
                          const record = paradeRecords[student.id] || { status: 'Present', remarks: '' }
                          const statusColor = getStatusColor(record.status)
                          const isLocked =
                            currentTradeSubmission?.status === 'SUBMITTED' ||
                            currentTradeSubmission?.status === 'APPROVED'

                          return (
                            <tr key={student.id} style={isLocked ? { opacity: 0.85 } : {}}>
                              <td className="fw-semibold text-primary">{student.service_number}</td>
                              <td>
                                <div className="fw-bold text-dark" style={{ fontSize: '0.88rem' }}>
                                  {student.full_name}
                                </div>
                                <div className="d-flex align-items-center gap-1 mt-1">
                                  <span className="badge bg-secondary-subtle text-dark border" style={{ fontSize: '0.7rem' }}>
                                    {student.rank}
                                  </span>
                                  {student.batch && (
                                    <span className="text-muted" style={{ fontSize: '0.73rem' }}>
                                      • Batch {student.batch}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <span className="badge" style={{ background: 'var(--tint-primary)', color: '#2c5ea8', fontSize: '0.73rem' }}>
                                  {student.trade || '—'}
                                </span>
                              </td>
                              <td>
                                <select
                                  className="form-select form-select-sm"
                                  value={record.status}
                                  onChange={(e) => handleStatusChange(student.id, e.target.value)}
                                  disabled={!hasPermission('parade:write') || isLocked}
                                  style={{ borderColor: `${statusColor}60`, color: statusColor, fontWeight: 600 }}
                                >
                                  {statuses.map((st) => (
                                    <option key={st.id || st.code} value={st.label}>
                                      {st.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  placeholder="Duty orders, sick report reference..."
                                  value={record.remarks}
                                  onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                                  disabled={!hasPermission('parade:write') || isLocked}
                                />
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Submission Routing Box */}
              {hasPermission('parade:write') && selectedTrade !== 'All' && canSubmit && (
                <div
                  className="card slaf-card p-4 shadow-sm"
                  style={{
                    border: '1px solid var(--tint-primary-border)',
                    background: 'var(--tint-primary)'
                  }}
                >
                  <h6 className="fw-bold text-primary mb-3">
                    <i className="bi bi-send-check me-2" />
                    Submit Parade State for Instructor Approval — {selectedTrade}
                  </h6>
                  <div className="row g-3">
                    <div className="col-md-5">
                      <label className="form-label fw-semibold" style={{ fontSize: '0.82rem' }}>
                        <i className="bi bi-person-badge me-1 text-primary" />Assigned Instructor (Approval Authority)
                      </label>
                      {currentMonitoringItem?.instructor_status === 'NOT_ASSIGNED' ? (
                        <div className="p-2.5 bg-white rounded border border-warning d-flex align-items-center justify-content-between">
                          <div>
                            <div className="fw-bold text-danger small">
                              <i className="bi bi-exclamation-triangle-fill me-1" />
                              INSTRUCTOR NOT ASSIGNED
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                              Academic Batch has no assigned instructor
                            </div>
                          </div>
                          <span className="badge bg-warning-subtle text-dark border" style={{ fontSize: '0.68rem' }}>UNASSIGNED</span>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-white rounded border d-flex align-items-center justify-content-between">
                          <div>
                            <div className="fw-bold text-dark small">
                              <i className="bi bi-person-check-fill text-success me-1" />
                              {currentMonitoringItem?.assigned_instructor_name || 'Academic Course/Batch Instructor'}
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                              Auto-derived from {currentMonitoringItem?.batch ? `Batch ${currentMonitoringItem.batch}` : 'Course Registration'}
                            </div>
                          </div>
                          <span className="badge bg-success-subtle text-success border" style={{ fontSize: '0.68rem' }}>
                            <i className="bi bi-link-45deg me-1" />AUTO-ASSIGNED
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="col-md-5">
                      <label className="form-label fw-semibold" style={{ fontSize: '0.82rem' }}>
                        <i className="bi bi-chat-left-text me-1" />Submission Remarks / Notes
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g., Trainees on detached duty at SLAF Base Katunayake..."
                        value={submitterRemarks}
                        onChange={(e) => setSubmitterRemarks(e.target.value)}
                      />
                    </div>
                    <div className="col-md-2 d-flex flex-column justify-content-end gap-2">
                      <button
                        className="btn btn-outline-secondary btn-sm fw-semibold"
                        onClick={handleSaveDraft}
                        disabled={saving}
                      >
                        {saving ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-floppy me-1" />}
                        Save Draft
                      </button>
                      <button
                        className="btn btn-primary btn-sm fw-semibold"
                        onClick={handleOpenSubmitPreview}
                        disabled={submitting}
                      >
                        {submitting ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-eye me-1" />}
                        Submit for Approval
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Submission Preview Modal */}
          {showSubmitPreviewModal && (
            <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.6)', zIndex: 1055 }}>
              <div className="modal-dialog modal-lg modal-dialog-scrollable">
                <div className="modal-content border-0 shadow-lg">
                  <div className="modal-header bg-primary text-white">
                    <div>
                      <h5 className="modal-title fw-bold text-white mb-0">
                        <i className="bi bi-clipboard-check me-2" />
                        Parade State Submission Verification
                      </h5>
                      <div className="text-white-50 small">Verify strength breakdown before routing to Officer I/C</div>
                    </div>
                    <button
                      type="button"
                      className="btn-close btn-close-white"
                      onClick={() => setShowSubmitPreviewModal(false)}
                    />
                  </div>

                  <div className="modal-body p-4">
                    <div
                      className="card slaf-card bg-body-tertiary p-3 mb-3"
                      style={{ borderLeft: '4px solid var(--bs-primary)' }}
                    >
                      <div className="row g-2 text-center text-sm-start" style={{ fontSize: '0.88rem' }}>
                        <div className="col-sm-4">
                          <span className="text-muted d-block small">DATE</span>
                          <strong className="text-dark">{selectedDate}</strong>
                        </div>
                        <div className="col-sm-4">
                          <span className="text-muted d-block small">TRADE</span>
                          <strong className="text-primary">{selectedTrade}</strong>
                        </div>
                        <div className="col-sm-4">
                          <span className="text-muted d-block small">APPROVAL AUTHORITY</span>
                          <strong className="text-dark">
                            {currentMonitoringItem?.assigned_instructor_name || 'Assigned Instructor (Academic Batch)'}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {submitterRemarks && (
                      <div className="alert alert-warning py-2 mb-3 small">
                        <i className="bi bi-chat-left-quote me-2" />
                        <strong>Remarks:</strong> {submitterRemarks}
                      </div>
                    )}

                    {/* Summary pills */}
                    {(() => {
                      const records = getRecordsForTrade(selectedTrade)
                      const present = records.filter((r) => r.status === 'Present').length
                      const absent = records.length - present
                      return (
                        <div className="row g-2 mb-3 text-center">
                          <div className="col-4">
                            <div className="p-2 rounded bg-primary-subtle text-primary border">
                              <div className="fw-bold fs-5">{records.length}</div>
                              <div className="small">Total Strength</div>
                            </div>
                          </div>
                          <div className="col-4">
                            <div className="p-2 rounded bg-success-subtle text-success border">
                              <div className="fw-bold fs-5">{present}</div>
                              <div className="small">Present</div>
                            </div>
                          </div>
                          <div className="col-4">
                            <div className="p-2 rounded bg-danger-subtle text-danger border">
                              <div className="fw-bold fs-5">{absent}</div>
                              <div className="small">Non-Present</div>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  <div className="modal-footer bg-light">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowSubmitPreviewModal(false)}
                    >
                      Back to Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-success px-4 fw-semibold"
                      onClick={handleConfirmSubmitForApproval}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <span className="spinner-border spinner-border-sm me-2" />
                      ) : (
                        <i className="bi bi-check-circle-fill me-2" />
                      )}
                      Confirm & Submit for Approval
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 3: PENDING APPROVALS (OFFICER I/C QUEUE)
      ═══════════════════════════════════════════════════════ */}
      {activeTab === 'approvals' && hasPermission('parade:approve') && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h5 className="fw-bold mb-1">Instructor Approval Queue</h5>
              <p className="text-muted mb-0 small">
                Submitted daily parade states awaiting your official authorization
              </p>
            </div>
            <button className="btn btn-outline-primary btn-sm" onClick={loadPendingApprovals}>
              <i className="bi bi-arrow-clockwise me-1" />
              Refresh Queue
            </button>
          </div>

          {pendingLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" />
            </div>
          ) : pendingApprovals.length === 0 ? (
            <div className="card slaf-card p-5 text-center text-muted">
              <i className="bi bi-inbox fs-1 text-muted" />
              <h6 className="mt-3 fw-bold">No Parade States Awaiting Approval</h6>
              <p className="small mb-0">All submitted parade states have been reviewed.</p>
            </div>
          ) : (
            <div className="row g-3">
              {pendingApprovals.map((sub) => (
                <div key={sub.id} className="col-12">
                  <div className="card slaf-card p-0 shadow-sm" style={{ borderLeft: '5px solid #b26a00' }}>
                    <div className="card-body p-4">
                      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                        <div className="d-flex gap-4 flex-wrap">
                          <div>
                            <div className="text-muted small">TARGET DATE</div>
                            <div className="fw-bold">{sub.date}</div>
                          </div>
                          <div>
                            <div className="text-muted small">TRADE</div>
                            <div className="fw-bold text-primary">{sub.trade}</div>
                          </div>
                          <div>
                            <div className="text-muted small">SUBMITTED BY</div>
                            <div className="fw-bold">{sub.submitter_name || '—'}</div>
                          </div>
                          <div>
                            <div className="text-muted small">SUBMITTED AT</div>
                            <div className="fw-bold">
                              {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : '—'}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted small">STRENGTH BREAKDOWN</div>
                            <div>
                              <span className="fw-bold text-success">{sub.present_count}</span>
                              <span className="text-muted">/{sub.total_strength} Present</span>
                            </div>
                          </div>
                        </div>
                        <button
                          className="btn btn-primary btn-sm fw-semibold shadow-xs"
                          onClick={() => openApprovalDetail(sub.id)}
                        >
                          <i className="bi bi-shield-check me-1" />
                          Review & Take Action
                        </button>
                      </div>
                      {sub.submitter_remarks && (
                        <div className="mt-3 p-2 rounded bg-warning-subtle text-dark border small">
                          <i className="bi bi-chat-left-quote me-1 text-warning" />
                          <strong>Submitter Remarks:</strong> {sub.submitter_remarks}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 4: DATE-RANGE COMPLIANCE MONITORING
      ═══════════════════════════════════════════════════════ */}
      {activeTab === 'daterange' && (
        <div>
          <div className="card slaf-card p-4 mb-4 shadow-sm">
            <div className="row g-3 align-items-end">
              <div className="col-md-3">
                <label className="form-label fw-semibold small">From Date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={rangeStartDate}
                  onChange={(e) => setRangeStartDate(e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold small">To Date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={rangeEndDate}
                  onChange={(e) => setRangeEndDate(e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold small">Trade</label>
                <select
                  className="form-select form-select-sm"
                  value={rangeTradeFilter}
                  onChange={(e) => setRangeTradeFilter(e.target.value)}
                >
                  <option value="All">All Trades</option>
                  {trades.map((t) => (
                    <option key={t.id} value={t.label}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3 d-flex gap-2">
                <button
                  className="btn btn-primary btn-sm fw-semibold w-100"
                  onClick={loadDateRangeMonitoring}
                  disabled={rangeLoading}
                >
                  {rangeLoading ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-search me-1" />}
                  Analyze Range
                </button>
              </div>
            </div>
          </div>

          {rangeLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" />
            </div>
          ) : dateRangeData?.items ? (
            <div className="card slaf-card p-0 shadow-sm">
              <div className="table-responsive">
                <table className="table slaf-table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Trade</th>
                      <th>Submission & Approval Status</th>
                      <th>Overdue Status</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dateRangeData.items.map((item, idx) => (
                      <tr key={`${item.date}-${item.trade}-${idx}`}>
                        <td className="fw-semibold">{item.date}</td>
                        <td className="fw-bold text-primary">{item.trade}</td>
                        <td>
                          <StatusBadge status={item.status_code} isOverdue={item.is_overdue} />
                        </td>
                        <td>
                          {item.is_overdue ? (
                            <span className="text-danger small fw-semibold">
                              <i className="bi bi-clock-history me-1" />Still Not Submitted / Overdue
                            </span>
                          ) : (
                            <span className="text-muted small">OK</span>
                          )}
                        </td>
                        <td className="text-end">
                          <button
                            className="btn btn-outline-primary btn-sm"
                            style={{ fontSize: '0.75rem' }}
                            onClick={() => handleDirectSubmitFromMonitoring(item.trade, item.date)}
                          >
                            <i className="bi bi-arrow-right-circle me-1" />
                            Open Record
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 5: SUBMISSION HISTORY
      ═══════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div>
          <div className="d-flex justify-content-between align-items-end mb-4 flex-wrap gap-3">
            <div>
              <h5 className="fw-bold mb-1">Parade Submission History & Audit</h5>
              <p className="text-muted mb-0 small">Archived records of all approved and historical parade states</p>
            </div>
            <div className="d-flex gap-2 flex-wrap align-items-end">
              <div>
                <label className="form-label mb-1 small">Filter Date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={historyDateFilter}
                  onChange={(e) => setHistoryDateFilter(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label mb-1 small">Filter Status</label>
                <select
                  className="form-select form-select-sm"
                  style={{ width: '150px' }}
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  {['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <button className="btn btn-outline-primary btn-sm" onClick={loadHistory}>
                <i className="bi bi-search me-1" />Search
              </button>
            </div>
          </div>

          {historyLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" />
            </div>
          ) : historyList.length === 0 ? (
            <div className="card slaf-card p-5 text-center text-muted">
              <i className="bi bi-journal-x fs-1 text-muted" />
              <div className="mt-2 fw-semibold">No submissions found.</div>
            </div>
          ) : (
            <div className="card slaf-card p-0 shadow-sm">
              <div className="table-responsive">
                <table className="table slaf-table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Trade</th>
                      <th>Status</th>
                      <th>Submitted By</th>
                      <th>Approving Officer</th>
                      <th>Strength</th>
                      <th>Reviewed At</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyList.map((sub) => (
                      <React.Fragment key={sub.id}>
                        <tr>
                          <td className="fw-semibold">{sub.date}</td>
                          <td>
                            <span className="badge bg-primary-subtle text-primary">{sub.trade}</span>
                          </td>
                          <td>
                            <StatusBadge status={sub.status} />
                          </td>
                          <td className="small">{sub.submitter_name || '—'}</td>
                          <td className="small">{sub.officer_name || '—'}</td>
                          <td className="small">
                            <span className="text-success fw-bold">{sub.present_count ?? '—'}</span>
                            <span className="text-muted">/{sub.total_strength ?? '—'}</span>
                          </td>
                          <td className="small text-muted">
                            {sub.reviewed_at ? new Date(sub.reviewed_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="text-end">
                            <button
                              className="btn btn-outline-secondary btn-sm"
                              style={{ fontSize: '0.75rem' }}
                              onClick={() => setExpandedHistory(expandedHistory === sub.id ? null : sub.id)}
                            >
                              <i className={`bi ${expandedHistory === sub.id ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
                            </button>
                          </td>
                        </tr>
                        {expandedHistory === sub.id && (
                          <tr>
                            <td colSpan="8" style={{ background: 'var(--bg-subtle)' }}>
                              <div className="p-3">
                                <div className="row g-3 small">
                                  {sub.submitter_remarks && (
                                    <div className="col-md-6">
                                      <div className="text-muted fw-bold">SUBMITTER REMARKS</div>
                                      <div>{sub.submitter_remarks}</div>
                                    </div>
                                  )}
                                  {sub.approver_remarks && (
                                    <div className="col-md-6">
                                      <div className="text-muted fw-bold">APPROVER ENDORSEMENT</div>
                                      <div className="text-success fw-semibold">{sub.approver_remarks}</div>
                                    </div>
                                  )}
                                  {sub.rejection_reason && (
                                    <div className="col-12">
                                      <div className="text-muted fw-bold">REJECTION REASON</div>
                                      <div className="text-danger fw-semibold">{sub.rejection_reason}</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 6: OFFICER I/C APPOINTMENTS SETUP
      ═══════════════════════════════════════════════════════ */}
      {activeTab === 'officers' && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h5 className="fw-bold mb-1">Instructor Appointments & Routing</h5>
              <p className="text-muted mb-0 small">
                Designate responsible Officers I/C per trade to review and authorize daily parade states
              </p>
            </div>
            {hasPermission('parade:manage_officers') && (
              <button className="btn btn-primary btn-sm fw-semibold" onClick={() => setShowOICModal(true)}>
                <i className="bi bi-person-plus me-1" />
                Assign Instructor
              </button>
            )}
          </div>

          {officersLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" />
            </div>
          ) : officers.length === 0 ? (
            <div className="card slaf-card p-5 text-center text-muted">
              <i className="bi bi-person-badge fs-1 text-muted" />
              <div className="mt-2 fw-semibold">No Instructor assignments found</div>
            </div>
          ) : (
            <div className="row g-3">
              {officers.map((oic) => (
                <div key={oic.id} className="col-md-6 col-lg-4">
                  <div className="card slaf-card h-100 shadow-sm">
                    <div className="card-body p-4">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center fw-bold bg-primary text-white"
                          style={{ width: 44, height: 44 }}
                        >
                          {(oic.officer_name || 'O').charAt(0).toUpperCase()}
                        </div>
                        <span className="badge bg-success-subtle text-success border">Active</span>
                      </div>
                      <h6 className="fw-bold mb-1">{oic.officer_name || '—'}</h6>
                      <div className="text-muted small mb-2">
                        {oic.officer_rank} {oic.officer_service_number ? `(${oic.officer_service_number})` : ''}
                      </div>
                      <div className="mb-3">
                        <span className="badge bg-primary-subtle text-primary fw-bold">
                          <i className="bi bi-airplane-engines me-1" />
                          OIC: {oic.trade}
                        </span>
                      </div>
                      {hasPermission('parade:manage_officers') && (
                        <button
                          className="btn btn-outline-danger btn-sm w-100 mt-2"
                          onClick={() => handleRemoveOIC(oic.id, oic.trade)}
                        >
                          <i className="bi bi-person-dash me-1" />
                          Remove Assignment
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Assign OIC Modal */}
          {showOICModal && (
            <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
              <div className="modal-dialog">
                <div className="modal-content shadow-lg">
                  <div className="modal-header">
                    <h5 className="modal-title fw-bold">
                      <i className="bi bi-person-plus text-primary me-2" />Assign Officer I/C
                    </h5>
                    <button className="btn-close" onClick={() => setShowOICModal(false)} />
                  </div>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label fw-semibold small">Trade *</label>
                      <select className="form-select" value={oicTrade} onChange={(e) => setOicTrade(e.target.value)}>
                        <option value="">— Select Trade —</option>
                        {trades.map((t) => (
                          <option key={t.id} value={t.label}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold small">Instructor / User *</label>
                      <select className="form-select" value={oicUserId} onChange={(e) => setOicUserId(e.target.value)}>
                        <option value="">— Select User —</option>
                        {allUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.rank ? `${u.rank} ` : ''}
                            {u.full_name} ({u.username})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button className="btn btn-outline-secondary" onClick={() => setShowOICModal(false)}>
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary fw-semibold"
                      onClick={handleAssignOIC}
                      disabled={savingOIC || !oicTrade || !oicUserId}
                    >
                      {savingOIC ? <span className="spinner-border spinner-border-sm me-1" /> : 'Assign Officer I/C'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB: NIGHT PARADE STATE & NIGHT ROLL CALL
      ═══════════════════════════════════════════════════════ */}
      {activeTab === 'night' && (
        <NightParadeTab
          selectedDate={selectedDate}
          trades={trades}
          officerOptions={officerOptions}
        />
      )}

      {/* ── Global Approval & Return Modal ── */}
      {showApprovalModal && approvalDetail && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.6)', zIndex: 1055 }}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-dark text-white px-4 py-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
                <div className="flex-grow-1" style={{ minWidth: '220px' }}>
                  <h5 className="modal-title fw-bold text-white mb-0">
                    <i className="bi bi-shield-check text-warning me-2" />
                    Review & Approve Parade State — {approvalDetail.trade} ({approvalDetail.date})
                  </h5>
                  <div className="text-white-50 small mt-0.5">
                    Course: {approvalDetail.course_name || '—'} • Batch: {approvalDetail.batch || '—'} • Submitted by: {approvalDetail.submitter_name} • Total: {approvalDetail.total_strength}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-light border-0 flex-shrink-0 d-flex align-items-center justify-content-center"
                  onClick={() => setShowApprovalModal(false)}
                  style={{ width: '32px', height: '32px', borderRadius: '6px' }}
                >
                  <i className="bi bi-x-lg fs-6"></i>
                </button>
              </div>

              <div className="modal-body p-4">
                {approvalDetail.submitter_remarks && (
                  <div className="alert alert-warning py-2 mb-3 small">
                    <i className="bi bi-chat-left-quote me-1" />
                    <strong>Submitter Notes:</strong> {approvalDetail.submitter_remarks}
                  </div>
                )}

                <div className="table-responsive mb-4" style={{ maxHeight: '40vh', overflowY: 'auto' }}>
                  <table className="table table-sm table-hover align-middle mb-0">
                    <thead className="table-light sticky-top">
                      <tr>
                        <th>Service No.</th>
                        <th>Rank & Full Name</th>
                        <th>Status</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(approvalDetail.records || []).map((rec) => (
                        <tr key={rec.id}>
                          <td className="fw-semibold text-primary">{rec.student_service_number}</td>
                          <td>
                            <div className="fw-semibold" style={{ fontSize: '0.85rem' }}>
                              {rec.student_name}
                            </div>
                            <span className="badge bg-secondary-subtle text-dark" style={{ fontSize: '0.7rem' }}>
                              {rec.student_rank}
                            </span>
                          </td>
                          <td>
                            <span
                              className="fw-bold px-2 py-0.5 rounded"
                              style={{
                                color: getStatusColor(rec.status),
                                background: `${getStatusColor(rec.status)}15`,
                                fontSize: '0.8rem'
                              }}
                            >
                              {rec.status}
                            </span>
                          </td>
                          <td className="small text-muted">{rec.remarks || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label fw-semibold small">
                      <i className="bi bi-chat-left-text me-1" />Approver Endorsement Remarks (Optional)
                    </label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={2}
                      placeholder="Official remarks to be archived with approved parade state..."
                      value={approverRemarks}
                      onChange={(e) => setApproverRemarks(e.target.value)}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold text-danger small">
                      <i className="bi bi-exclamation-triangle me-1" />Return / Rejection Reason (Mandatory if returning for correction)
                    </label>
                    <textarea
                      className="form-control form-control-sm border-danger"
                      rows={2}
                      placeholder="State why this submission is returned for correction..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer bg-light border-top d-flex flex-wrap align-items-center justify-content-end gap-2">
                <button className="btn btn-outline-secondary btn-sm px-3" onClick={() => setShowApprovalModal(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-danger btn-sm fw-semibold px-3"
                  onClick={handleRejectOrReturn}
                  disabled={actionLoading || !rejectionReason.trim()}
                >
                  {actionLoading ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-arrow-counterclockwise me-1" />}
                  Return for Correction
                </button>
                <button
                  className="btn btn-success btn-sm px-4 fw-semibold shadow-sm"
                  onClick={handleApprove}
                  disabled={actionLoading}
                >
                  {actionLoading ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-check-lg me-1" />}
                  Approve as Official Daily Strength
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Classical Outstanding Parade State Report Modal */}
      <ClassicalReportModal
        show={showOutstandingReportModal}
        onClose={() => setShowOutstandingReportModal(false)}
        title={`OUTSTANDING & PENDING PARADE STATE REPORT — ${selectedDate}`}
        endpoint="/api/v1/parade/reports/outstanding"
        params={{
          parade_date: selectedDate,
          trade: selectedTrade !== 'All' ? selectedTrade : ''
        }}
        defaultOrientation="landscape"
      />

      {/* Classical Formal Daily Strength Register Report Modal */}
      <ClassicalReportModal
        show={showReportModal}
        onClose={() => setShowReportModal(false)}
        title={`DAILY PARADE STATE & STRENGTH REGISTER — ${selectedDate}`}
        endpoint="/api/v1/reports/parade-state"
        params={{
          parade_date: selectedDate,
          trade: selectedTrade !== 'All' ? selectedTrade : ''
        }}
        defaultOrientation="landscape"
      />
    </div>
  )
}

export default DailyParade
