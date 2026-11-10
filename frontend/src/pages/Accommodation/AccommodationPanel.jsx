import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title
} from 'chart.js'
import { Bar, Pie } from 'react-chartjs-2'
import { ClassicalReportModal } from '../../components/ClassicalReportModal'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

export const AccommodationPanel = () => {
  const { hasPermission } = useAuth()
  const { subview = 'dashboard' } = useParams()
  const navigate = useNavigate()

  // ── Master Data States ────────────────────────────────────
  const [dashboardStats, setDashboardStats] = useState(null)
  const [buildings, setBuildings] = useState([])
  const [billets, setBillets] = useState([])
  const [bunkBeds, setBunkBeds] = useState([])
  const [availablePositions, setAvailablePositions] = useState([])
  const [activeAllocations, setActiveAllocations] = useState([])
  const [historyLogs, setHistoryLogs] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  // ── Filter & Search States ────────────────────────────────
  const [selectedBuildingId, setSelectedBuildingId] = useState('')
  const [selectedBilletId, setSelectedBilletId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [tradeFilter, setTradeFilter] = useState('All')

  // ── Form Modals States ────────────────────────────────────
  const [showBuildingModal, setShowBuildingModal] = useState(false)
  const [showBilletModal, setShowBilletModal] = useState(false)
  const [showBunkModal, setShowBunkModal] = useState(false)
  const [showBulkBunkModal, setShowBulkBunkModal] = useState(false)
  const [showAllocateModal, setShowAllocateModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showVacateModal, setShowVacateModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)

  // ── Form Inputs ───────────────────────────────────────────
  const [buildingForm, setBuildingForm] = useState({ name: '', type: 'Airmen', capacity: 40 })
  const [billetForm, setBilletForm] = useState({ building_id: '', name: '', block: '', location: '', description: '', bunk_bed_count: 10 })
  const [bunkForm, setBunkForm] = useState({ billet_id: '', bunk_no: '', status: 'Active' })
  const [bulkBunkForm, setBulkBunkForm] = useState({ billet_id: '', prefix: 'Bunk-', count: 10, start_number: 1 })
  const [allocateForm, setAllocateForm] = useState({ student_id: '', bed_position_id: '', remarks: '' })
  const [transferForm, setTransferForm] = useState({ student_id: '', new_bed_position_id: '', remarks: '' })
  const [vacateForm, setVacateForm] = useState({ allocation_id: '', vacate_reason: 'Course Completed', remarks: '' })

  const [selectedAllocationForAction, setSelectedAllocationForAction] = useState(null)
  const [selectedPositionForAllocation, setSelectedPositionForAllocation] = useState(null)

  // ── Data Fetching ────────────────────────────────────────
  const fetchAllData = useCallback(async () => {
    setLoading(true)
    try {
      const [dashRes, bldgRes, bilRes, bunkRes, posRes, allocRes, histRes, studRes] = await Promise.all([
        axios.get('/api/v1/accommodation/dashboard'),
        axios.get('/api/v1/accommodation/buildings'),
        axios.get('/api/v1/accommodation/billets'),
        axios.get('/api/v1/accommodation/bunks'),
        axios.get('/api/v1/accommodation/positions/available'),
        axios.get('/api/v1/accommodation/allocations'),
        axios.get('/api/v1/accommodation/history'),
        axios.get('/api/v1/students', { params: { limit: 500 } })
      ])

      setDashboardStats(dashRes.data)
      setBuildings(bldgRes.data)
      setBillets(bilRes.data)
      setBunkBeds(bunkRes.data)
      setAvailablePositions(posRes.data)
      setActiveAllocations(allocRes.data)
      setHistoryLogs(histRes.data)
      setStudents(studRes.data.items || studRes.data || [])
    } catch {
      toast.error('Failed to load accommodation records')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  // ── Handlers: Buildings & Billets ────────────────────────
  const handleCreateBuilding = async (e) => {
    e.preventDefault()
    try {
      await axios.post('/api/v1/accommodation/buildings', buildingForm)
      toast.success(`Building '${buildingForm.name}' created successfully`)
      setShowBuildingModal(false)
      setBuildingForm({ name: '', type: 'Airmen', capacity: 40 })
      fetchAllData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create building')
    }
  }

  const handleCreateBillet = async (e) => {
    e.preventDefault()
    if (!billetForm.building_id) {
      toast.warning('Please select a building')
      return
    }
    try {
      await axios.post('/api/v1/accommodation/billets', billetForm)
      toast.success(`Billet '${billetForm.name}' created with 2-tier bunk capacity`)
      setShowBilletModal(false)
      setBilletForm({ building_id: '', name: '', block: '', location: '', description: '', bunk_bed_count: 10 })
      fetchAllData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create billet')
    }
  }

  // ── Handlers: Bunk Beds ──────────────────────────────────
  const handleCreateBunkBed = async (e) => {
    e.preventDefault()
    if (!bunkForm.billet_id || !bunkForm.bunk_no.trim()) {
      toast.warning('Please select a billet and enter bunk number')
      return
    }
    try {
      await axios.post('/api/v1/accommodation/bunks', bunkForm)
      toast.success(`Bunk bed '${bunkForm.bunk_no}' created (TOP and BOTTOM positions automatically generated)`)
      setShowBunkModal(false)
      setBunkForm({ billet_id: '', bunk_no: '', status: 'Active' })
      fetchAllData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create bunk bed')
    }
  }

  const handleBulkBunkBedSubmit = async (e) => {
    e.preventDefault()
    if (!bulkBunkForm.billet_id) {
      toast.warning('Please select a billet')
      return
    }
    try {
      await axios.post('/api/v1/accommodation/bunks/bulk', bulkBunkForm)
      toast.success(`Bulk generated ${bulkBunkForm.count} bunk beds (${bulkBunkForm.count * 2} sleeping positions)`)
      setShowBulkBunkModal(false)
      fetchAllData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Bulk bunk creation failed')
    }
  }

  // ── Handlers: Allocations, Transfers & Vacates ────────────
  const handleAllocateSubmit = async (e) => {
    e.preventDefault()
    if (!allocateForm.student_id || !allocateForm.bed_position_id) {
      toast.warning('Please select both a trainee and a bed position')
      return
    }
    try {
      await axios.post('/api/v1/accommodation/allocate', allocateForm)
      toast.success('Bed position allocated successfully')
      setShowAllocateModal(false)
      setAllocateForm({ student_id: '', bed_position_id: '', remarks: '' })
      setSelectedPositionForAllocation(null)
      fetchAllData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Allocation failed')
    }
  }

  const handleTransferSubmit = async (e) => {
    e.preventDefault()
    if (!transferForm.student_id || !transferForm.new_bed_position_id) {
      toast.warning('Please select destination bed position')
      return
    }
    try {
      await axios.post('/api/v1/accommodation/transfer', transferForm)
      toast.success('Trainee transferred to new bed position')
      setShowTransferModal(false)
      setSelectedAllocationForAction(null)
      setTransferForm({ student_id: '', new_bed_position_id: '', remarks: '' })
      fetchAllData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Transfer failed')
    }
  }

  const handleVacateSubmit = async (e) => {
    e.preventDefault()
    if (!vacateForm.allocation_id) return
    try {
      await axios.post(`/api/v1/accommodation/vacate/${vacateForm.allocation_id}`, {
        vacate_reason: vacateForm.vacate_reason,
        remarks: vacateForm.remarks
      })
      toast.success('Bed position vacated successfully')
      setShowVacateModal(false)
      setSelectedAllocationForAction(null)
      setVacateForm({ allocation_id: '', vacate_reason: 'Course Completed', remarks: '' })
      fetchAllData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Vacate failed')
    }
  }

  // ── Helper Utilities ─────────────────────────────────────
  const handleOpenBuildingModal = () => {
    setBuildingForm({ name: '', type: 'Airmen', capacity: 40 })
    setShowBuildingModal(true)
  }

  const handleOpenBilletModal = () => {
    setBilletForm({ building_id: '', name: '', block: '', location: '', description: '', bunk_bed_count: 10 })
    setShowBilletModal(true)
  }

  const handleOpenBunkModal = () => {
    setBunkForm({ billet_id: selectedBilletId || '', bunk_no: '', status: 'Active' })
    setShowBunkModal(true)
  }

  const handleOpenBulkBunkModal = () => {
    setBulkBunkForm({ billet_id: selectedBilletId || '', prefix: 'Bunk-', count: 10, start_number: 1 })
    setShowBulkBunkModal(true)
  }

  const openAllocateModalForPosition = (pos) => {
    setSelectedPositionForAllocation(pos)
    setAllocateForm({ student_id: '', bed_position_id: pos.id, remarks: '' })
    setShowAllocateModal(true)
  }

  const openTransferModalForAllocation = (alloc) => {
    setSelectedAllocationForAction(alloc)
    setTransferForm({ student_id: alloc.student_id, new_bed_position_id: '', remarks: '' })
    setShowTransferModal(true)
  }

  const openVacateModalForAllocation = (alloc) => {
    setSelectedAllocationForAction(alloc)
    setVacateForm({ allocation_id: alloc.id, vacate_reason: 'Course Completed', remarks: '' })
    setShowVacateModal(true)
  }

  // Filtered lists
  const filteredBunks = bunkBeds
    .filter(b => {
      if (selectedBilletId && b.billet_id !== selectedBilletId) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchBunk = b.bunk_no.toLowerCase().includes(q)
        const matchPos = (b.positions || []).some(p => 
          p.position_code.toLowerCase().includes(q) || 
          (p.student_name && p.student_name.toLowerCase().includes(q)) ||
          (p.student_service_number && p.student_service_number.toLowerCase().includes(q))
        )
        return matchBunk || matchPos
      }
      return true
    })
    .sort((a, b) => (a.bunk_no || '').localeCompare(b.bunk_no || '', undefined, { numeric: true, sensitivity: 'base' }))

  const filteredAllocations = activeAllocations.filter(a => {
    if (tradeFilter !== 'All' && a.student_trade !== tradeFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        (a.student_name && a.student_name.toLowerCase().includes(q)) ||
        (a.student_service_number && a.student_service_number.toLowerCase().includes(q)) ||
        (a.position_code && a.position_code.toLowerCase().includes(q)) ||
        (a.billet_name && a.billet_name.toLowerCase().includes(q))
      )
    }
    return true
  })

  if (loading && !dashboardStats) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
        <div className="mt-2 text-muted">Loading Trainees Accommodation Management System...</div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════
  // SUBVIEW RENDERERS
  // ═══════════════════════════════════════════════════════════

  // ── SUBVIEW 1: DASHBOARD (Default Landing) ─────────────────
  const renderDashboardView = () => {
    const stats = dashboardStats || {
      total_buildings: 0, total_billets: 0, total_bunk_beds: 0,
      total_sleeping_positions: 0, occupied_positions: 0, available_positions: 0,
      occupancy_percentage: 0.0, active_trainees_count: 0
    }

    const pieData = {
      labels: ['Occupied Positions', 'Available Positions'],
      datasets: [{
        data: [stats.occupied_positions, stats.available_positions],
        backgroundColor: ['#1b3f73', '#9fb7d6'],
        borderWidth: 0
      }]
    }

    const billetChartData = {
      labels: billets.map(b => b.name),
      datasets: [
        { label: 'Occupied', data: billets.map(b => b.current_occupancy), backgroundColor: '#1b3f73', borderRadius: 3 },
        { label: 'Available', data: billets.map(b => Math.max(0, b.capacity - b.current_occupancy)), backgroundColor: '#9fb7d6', borderRadius: 3 }
      ]
    }

    return (
      <div>
        <div className="page-header">
          <div>
            <span className="page-eyebrow">Accommodation</span>
            <h2 className="page-title">Billets & bed positions</h2>
            <p className="page-subtitle">Capacity, occupancy and quick access to allocation tools.</p>
          </div>
        </div>

        {/* KPI Tiles Row */}
        <div className="row g-3 mb-4">
          {[
            { label: 'Total Billets', val: stats.total_billets, icon: 'bi-building', bg: 'var(--tint-primary)', color: '#2c5ea8' },
            { label: 'Total Bunk Beds', val: stats.total_bunk_beds, icon: 'bi-layout-three-columns', bg: 'var(--tint-plum)', color: '#6e5a8a' },
            { label: 'Sleeping Positions (2/Bunk)', val: stats.total_sleeping_positions, icon: 'bi-door-closed', bg: 'var(--tint-primary)', color: '#2f6f86' },
            { label: 'Occupied Positions', val: stats.occupied_positions, icon: 'bi-person-fill-check', bg: 'var(--tint-warning)', color: '#b26a00' },
            { label: 'Available Positions', val: stats.available_positions, icon: 'bi-check-circle', bg: 'var(--tint-success)', color: '#1f7a4d' },
            { label: 'Occupancy Rate', val: `${stats.occupancy_percentage}%`, icon: 'bi-pie-chart', bg: 'var(--tint-plum)', color: '#6e5a8a' },
          ].map(kpi => (
            <div key={kpi.label} className="col-6 col-md-4 col-xl-2">
              <div className="stat-tile">
                <div className="d-flex justify-content-between align-items-start gap-2">
                  <span className="stat-label">{kpi.label}</span>
                  <i className={`bi ${kpi.icon} text-muted`} />
                </div>
                <div className="stat-value">{kpi.val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Action Navigation Grid */}
        <div className="section-card mb-4">
          <div className="section-card-header">
            <h3 className="section-card-title">Quick actions</h3>
          </div>
          <div className="section-card-body">
          <div className="row g-3">
            {[
              { title: 'Billet Management', desc: 'Create & view billets', icon: 'bi-building', path: '/accommodation/billets', color: '#2c5ea8' },
              { title: 'Bunk Bed Register', desc: 'Manage 2-tier bunk units', icon: 'bi-layout-three-columns', path: '/accommodation/bunks', color: '#6e5a8a' },
              { title: 'Allocate Bed', desc: 'Assign trainee to TOP/BOTTOM', icon: 'bi-door-closed', path: '/accommodation/allocate', color: '#1f7a4d' },
              { title: 'Trainees Directory', desc: 'View accommodated trainees', icon: 'bi-people', path: '/accommodation/trainees', color: '#b26a00' },
              { title: 'Transfer / Release', desc: 'Transfer or vacate positions', icon: 'bi-arrow-left-right', path: '/accommodation/transfers', color: '#2f6f86' },
              { title: 'Visual Bunk Map', desc: 'Physical 2-tier bunk cards', icon: 'bi-geo-alt', path: '/accommodation/map', color: '#6e5a8a' },
            ].map(act => (
              <div key={act.title} className="col-6 col-md-4 col-xl-2">
                <button
                  type="button"
                  className="module-tile"
                  onClick={() => navigate(act.path)}
                >
                  <span className="module-tile-icon mb-3"><i className={`bi ${act.icon}`} /></span>
                  <span className="fw-semibold" style={{ fontSize: '0.88rem' }}>{act.title}</span>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>{act.desc}</span>
                </button>
              </div>
            ))}
          </div>
          </div>
        </div>

        {/* Charts & Overview */}
        <div className="row g-4 mb-4">
          <div className="col-lg-8">
            <div className="card slaf-card p-4 h-100">
              <h5 className="fw-bold text-primary mb-3">
                <i className="bi bi-bar-chart-line me-2" />
                Billet Capacity Utilization (Sleeping Positions)
              </h5>
              {billets.length > 0 ? (
                <div style={{ height: '280px' }}>
                  <Bar data={billetChartData} options={{ responsive: true, maintainAspectRatio: false }} />
                </div>
              ) : (
                <div className="text-center py-5 text-muted">No billets registered yet.</div>
              )}
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card slaf-card p-4 h-100">
              <h5 className="fw-bold text-primary mb-3">
                <i className="bi bi-pie-chart me-2" />
                Overall Occupancy Ratio
              </h5>
              <div style={{ height: '220px' }}>
                <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
              <div className="mt-3 text-center" style={{ fontSize: '0.85rem' }}>
                <span className="me-3 text-primary fw-semibold">• Occupied: {stats.occupied_positions}</span>
                <span className="text-success fw-semibold">• Available: {stats.available_positions}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── SUBVIEW 2: BILLETS MANAGEMENT ────────────────────────
  const renderBilletsView = () => (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold text-primary mb-1">Billet Management</h4>
          <p className="text-muted mb-0" style={{ fontSize: '0.88rem' }}>
            Manage billets and their calculated 2-tier bunk bed sleeping capacity
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-outline-dark btn-sm fw-semibold shadow-xs" onClick={() => setShowReportModal(true)}>
            <i className="bi bi-printer me-1 text-primary" />Print Billeting Register
          </button>
          {hasPermission('room:write') && (
            <>
              <button className="btn btn-outline-primary btn-sm" onClick={handleOpenBuildingModal}>
                <i className="bi bi-building-add me-1" />New Building
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleOpenBilletModal}>
                <i className="bi bi-plus-lg me-1" />Create New Billet
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card slaf-card p-0">
        <div className="table-responsive">
          <table className="table slaf-table mb-0">
            <thead>
              <tr>
                <th>Billet Name</th>
                <th>Building</th>
                <th>Block / Location</th>
                <th className="text-center">Bunk Beds</th>
                <th className="text-center">Sleeping Positions (Bunks×2)</th>
                <th className="text-center">Occupied</th>
                <th className="text-center">Available</th>
                <th className="text-center">Occupancy Rate</th>
              </tr>
            </thead>
            <tbody>
              {billets.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    No billets created yet. Click 'Create New Billet' to register one.
                  </td>
                </tr>
              ) : (
                billets.map(b => {
                  const bunksCount = b.bunk_bed_count || 0
                  const positionsCount = bunksCount * 2
                  const occ = b.current_occupancy || 0
                  const avail = Math.max(0, positionsCount - occ)
                  const rate = positionsCount > 0 ? ((occ / positionsCount) * 100).toFixed(1) : 0
                  return (
                    <tr key={b.id}>
                      <td className="fw-bold text-primary">{b.name}</td>
                      <td>{b.building_name || '—'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{b.block ? `${b.block} · ` : ''}{b.location || '—'}</td>
                      <td className="text-center fw-bold">{bunksCount} Bunks</td>
                      <td className="text-center fw-bold text-primary">{positionsCount} Positions</td>
                      <td className="text-center text-danger fw-semibold">{occ}</td>
                      <td className="text-center text-success fw-semibold">{avail}</td>
                      <td className="text-center">
                        <div className="d-flex align-items-center gap-2 justify-content-center">
                          <div className="progress flex-grow-1" style={{ height: 6, minWidth: 60 }}>
                            <div className="progress-bar bg-primary" style={{ width: `${rate}%` }} />
                          </div>
                          <span className="fw-semibold" style={{ fontSize: '0.78rem' }}>{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  // ── SUBVIEW 3: BUNK BED MANAGEMENT ────────────────────────
  const renderBunksView = () => (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold text-primary mb-1">Bunk Bed Management</h4>
          <p className="text-muted mb-0" style={{ fontSize: '0.88rem' }}>
            Every bunk bed unit contains exactly <strong>2 sleeping positions: TOP and BOTTOM</strong>
          </p>
        </div>
        {hasPermission('room:write') && (
          <div className="d-flex gap-2">
            <button className="btn btn-outline-primary btn-sm" onClick={handleOpenBulkBunkModal}>
              <i className="bi bi-layers me-1" />Bulk Create Bunk Beds
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleOpenBunkModal}>
              <i className="bi bi-plus-lg me-1" />Add Single Bunk Bed
            </button>
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="card slaf-card p-3 mb-4">
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label mb-1 fw-semibold small">Filter by Billet</label>
            <select 
              className="form-select form-select-sm" 
              value={selectedBilletId} 
              onChange={e => setSelectedBilletId(e.target.value)}
            >
              <option value="">All Billets</option>
              {billets.map(b => <option key={b.id} value={b.id}>{b.name} ({b.building_name})</option>)}
            </select>
          </div>
          <div className="col-md-5">
            <label className="form-label mb-1 fw-semibold small">Search Bunk / Trainee</label>
            <input 
              type="text" 
              className="form-control form-control-sm" 
              placeholder="Filter bunk number, position code, or trainee name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="col-md-3 d-flex align-items-end">
            <span className="badge bg-primary-subtle text-primary p-2 w-100 text-center" style={{ fontSize: '0.82rem' }}>
              Showing {filteredBunks.length} Bunk Beds ({filteredBunks.length * 2} Positions)
            </span>
          </div>
        </div>
      </div>

      {/* Bunks Grid (2-tier display) */}
      <div className="row g-3">
        {filteredBunks.length === 0 ? (
          <div className="col-12 text-center py-5 text-muted">
            No bunk beds found for the selected filter.
          </div>
        ) : (
          filteredBunks.map(bunk => {
            const topPos = (bunk.positions || []).find(p => p.position_type === 'TOP') || { position_type: 'TOP', position_code: `${bunk.bunk_no}-TOP`, status: 'Available' }
            const bottomPos = (bunk.positions || []).find(p => p.position_type === 'BOTTOM') || { position_type: 'BOTTOM', position_code: `${bunk.bunk_no}-BOTTOM`, status: 'Available' }

            return (
              <div key={bunk.id} className="col-md-6 col-lg-4">
                <div className="card slaf-card p-0 border" style={{ borderColor: 'var(--border-color)' }}>
                  {/* Bunk Header */}
                  <div className="card-header bg-app d-flex justify-content-between align-items-center py-2 px-3">
                    <span className="fw-bold text-primary">
                      <i className="bi bi-layout-three-columns me-1" />
                      Bunk Unit: {bunk.bunk_no}
                    </span>
                    <span className="badge bg-secondary" style={{ fontSize: '0.7rem' }}>
                      2 Positions
                    </span>
                  </div>

                  {/* 2-Tier Stack */}
                  <div className="p-3">
                    {/* TOP Position Card */}
                    <div 
                      className="p-2 mb-2 rounded border" 
                      style={{ 
                        background: topPos.status === 'Occupied' ? 'var(--tint-primary)' : 'var(--tint-success)',
                        borderColor: topPos.status === 'Occupied' ? 'var(--tint-primary-border)' : 'var(--tint-success-border)' 
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="fw-bold" style={{ fontSize: '0.8rem', color: 'var(--color-text-main)' }}>
                          <i className="bi bi-arrow-up-circle me-1 text-primary" />TOP: {topPos.position_code}
                        </span>
                        <span 
                          className="badge" 
                          style={{ 
                            background: topPos.status === 'Occupied' ? '#2c5ea8' : '#1f7a4d',
                            fontSize: '0.68rem'
                          }}
                        >
                          {topPos.status.toUpperCase()}
                        </span>
                      </div>
                      {topPos.status === 'Occupied' ? (
                        <div className="d-flex justify-content-between align-items-center">
                          <div style={{ fontSize: '0.78rem' }}>
                            <strong className="text-dark d-block">{topPos.student_service_number} · {topPos.student_rank}</strong>
                            <span className="text-muted">{topPos.student_name}</span>
                          </div>
                          {topPos.parade_status && (
                            <span className="badge bg-warning-subtle text-dark border" style={{ fontSize: '0.65rem' }}>
                              {topPos.parade_status}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted" style={{ fontSize: '0.75rem' }}>Vacant Position</span>
                          {hasPermission('room:write') && (
                            <button 
                              className="btn btn-link btn-sm p-0 text-primary fw-semibold" 
                              style={{ fontSize: '0.75rem' }}
                              onClick={() => openAllocateModalForPosition(topPos)}
                            >
                              + Assign Trainee
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* BOTTOM Position Card */}
                    <div 
                      className="p-2 rounded border" 
                      style={{ 
                        background: bottomPos.status === 'Occupied' ? 'var(--tint-primary)' : 'var(--tint-success)',
                        borderColor: bottomPos.status === 'Occupied' ? 'var(--tint-primary-border)' : 'var(--tint-success-border)' 
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="fw-bold" style={{ fontSize: '0.8rem', color: 'var(--color-text-main)' }}>
                          <i className="bi bi-arrow-down-circle me-1 text-success" />BOTTOM: {bottomPos.position_code}
                        </span>
                        <span 
                          className="badge" 
                          style={{ 
                            background: bottomPos.status === 'Occupied' ? '#2c5ea8' : '#1f7a4d',
                            fontSize: '0.68rem'
                          }}
                        >
                          {bottomPos.status.toUpperCase()}
                        </span>
                      </div>
                      {bottomPos.status === 'Occupied' ? (
                        <div className="d-flex justify-content-between align-items-center">
                          <div style={{ fontSize: '0.78rem' }}>
                            <strong className="text-dark d-block">{bottomPos.student_service_number} · {bottomPos.student_rank}</strong>
                            <span className="text-muted">{bottomPos.student_name}</span>
                          </div>
                          {bottomPos.parade_status && (
                            <span className="badge bg-warning-subtle text-dark border" style={{ fontSize: '0.65rem' }}>
                              {bottomPos.parade_status}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted" style={{ fontSize: '0.75rem' }}>Vacant Position</span>
                          {hasPermission('room:write') && (
                            <button 
                              className="btn btn-link btn-sm p-0 text-primary fw-semibold" 
                              style={{ fontSize: '0.75rem' }}
                              onClick={() => openAllocateModalForPosition(bottomPos)}
                            >
                              + Assign Trainee
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )

  // ── SUBVIEW 4: BED ALLOCATION WIZARD ──────────────────────
  const renderAllocateView = () => (
    <div className="row justify-content-center">
      <div className="col-lg-8">
        <div className="card slaf-card p-4">
          <h4 className="fw-bold text-primary mb-2">
            <i className="bi bi-door-closed me-2" />
            Trainee Bed Position Allocation Wizard
          </h4>
          <p className="text-muted mb-4" style={{ fontSize: '0.88rem' }}>
            Assign a trainee from the Master Student Records to an available TOP or BOTTOM bunk position.
          </p>

          <form onSubmit={handleAllocateSubmit} className="row g-3">
            {/* Step 1: Select Billet */}
            <div className="col-md-6">
              <label className="form-label fw-semibold">1. Filter by Billet (Optional)</label>
              <select 
                className="form-select" 
                value={selectedBilletId} 
                onChange={e => { setSelectedBilletId(e.target.value); setAllocateForm(prev => ({ ...prev, bed_position_id: '' })) }}
              >
                <option value="">— All Billets —</option>
                {billets.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.building_name || 'Building'})
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Select Available Bed Position */}
            <div className="col-md-6">
              <label className="form-label fw-semibold">2. Select Available Bed Position *</label>
              <select 
                className="form-select"
                value={allocateForm.bed_position_id}
                onChange={e => {
                  const posId = e.target.value;
                  setAllocateForm(prev => ({ ...prev, bed_position_id: posId }));
                  const targetPos = availablePositions.find(p => p.id === posId);
                  if (targetPos && targetPos.billet_id && !selectedBilletId) {
                    setSelectedBilletId(targetPos.billet_id);
                  }
                }}
                required
              >
                <option value="">— Select TOP/BOTTOM Position —</option>
                {availablePositions
                  .filter(p => !selectedBilletId || p.billet_id === selectedBilletId)
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.position_code} ({p.position_type} Position){p.billet_name ? ` — Billet: ${p.billet_name}` : ''}
                    </option>
                  ))
                }
              </select>
              {availablePositions.filter(p => !selectedBilletId || p.billet_id === selectedBilletId).length === 0 && (
                <small className="text-danger mt-1 d-block" style={{ fontSize: '0.78rem' }}>
                  <i className="bi bi-exclamation-circle me-1" />
                  No available bed positions in selected filter. Create bunk beds in Bunk Management first.
                </small>
              )}
            </div>

            {/* Step 3: Select Trainee */}
            <div className="col-12">
              <label className="form-label fw-semibold">3. Select Trainee (Master Records) *</label>
              <select 
                className="form-select"
                value={allocateForm.student_id}
                onChange={e => setAllocateForm(prev => ({ ...prev, student_id: e.target.value }))}
                required
              >
                <option value="">— Search & Select Trainee (Service No · Name · Rank) —</option>
                {students
                  .filter(s => s.status === 'Active' && !activeAllocations.some(a => a.student_id === s.id))
                  .map(s => (
                    <option key={s.id} value={s.id}>
                      {s.service_number} — {s.rank} {s.full_name} ({s.trade || 'No Trade'})
                    </option>
                  ))
                }
              </select>
              <small className="text-muted mt-1 d-block">
                Only active trainees without existing active accommodation are listed.
              </small>
            </div>

            {/* Remarks */}
            <div className="col-12">
              <label className="form-label fw-semibold">Allocation Remarks (Optional)</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Initial placement, intake batch note..."
                value={allocateForm.remarks}
                onChange={e => setAllocateForm(prev => ({ ...prev, remarks: e.target.value }))}
              />
            </div>

            <div className="col-12 d-flex justify-content-end gap-2 mt-4">
              <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/accommodation')}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary px-4 fw-semibold">
                <i className="bi bi-check-circle me-1" />
                Confirm Bed Allocation
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )

  // ── SUBVIEW 5: TRAINEES ACCOMMODATION DIRECTORY ────────────
  const renderTraineesView = () => (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold text-primary mb-1">Trainee Accommodation Directory</h4>
          <p className="text-muted mb-0" style={{ fontSize: '0.88rem' }}>
            List of currently accommodated SLAF trainees with live Daily Parade Status
          </p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-dark btn-sm fw-semibold shadow-xs" onClick={() => setShowReportModal(true)}>
            <i className="bi bi-printer me-1 text-primary" />Print Billeting Report
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/accommodation/allocate')}>
            <i className="bi bi-plus-lg me-1" />Allocate New Bed
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card slaf-card p-3 mb-4">
        <div className="row g-3">
          <div className="col-md-4">
            <input 
              type="text" 
              className="form-control form-control-sm" 
              placeholder="Search Service No, Trainee Name, Billet..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <select 
              className="form-select form-select-sm" 
              value={tradeFilter}
              onChange={e => setTradeFilter(e.target.value)}
            >
              <option value="All">All Trades</option>
              {Array.from(new Set(activeAllocations.map(a => a.student_trade).filter(Boolean))).map(tr => (
                <option key={tr} value={tr}>{tr}</option>
              ))}
            </select>
          </div>
          <div className="col-md-5 text-end align-self-center">
            <span className="badge bg-secondary" style={{ fontSize: '0.82rem' }}>
              Total Active Accommodated Trainees: {filteredAllocations.length}
            </span>
          </div>
        </div>
      </div>

      {/* Trainees Directory Table */}
      <div className="card slaf-card p-0">
        <div className="table-responsive">
          <table className="table slaf-table mb-0">
            <thead>
              <tr>
                <th>Service No.</th>
                <th>Rank & Name</th>
                <th>Trade</th>
                <th>Billet & Position</th>
                <th>Position Type</th>
                <th>Parade Status</th>
                <th>Assigned Date</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAllocations.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    No active accommodation records found matching search.
                  </td>
                </tr>
              ) : (
                filteredAllocations.map(alloc => (
                  <tr key={alloc.id}>
                    <td className="fw-bold text-primary">{alloc.student_service_number}</td>
                    <td>
                      <div className="fw-semibold">{alloc.student_name}</div>
                      <span className="badge bg-secondary-subtle text-dark" style={{ fontSize: '0.68rem' }}>{alloc.student_rank}</span>
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'var(--tint-primary)', color: '#2c5ea8', fontSize: '0.75rem' }}>
                        {alloc.student_trade || '—'}
                      </span>
                    </td>
                    <td>
                      <div className="fw-bold text-dark">{alloc.position_code || '—'}</div>
                      <div className="text-muted" style={{ fontSize: '0.73rem' }}>{alloc.billet_name} ({alloc.building_name})</div>
                    </td>
                    <td>
                      <span className={`badge ${alloc.position_type === 'TOP' ? 'bg-primary' : 'bg-success'}`} style={{ fontSize: '0.7rem' }}>
                        {alloc.position_type || 'BED'}
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-warning-subtle text-dark border" style={{ fontSize: '0.73rem' }}>
                        {alloc.parade_status || 'Present'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#5b6574' }}>
                      {alloc.allocated_at ? new Date(alloc.allocated_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="text-end">
                      {hasPermission('room:write') && (
                        <div className="btn-group">
                          <button 
                            className="btn btn-outline-primary btn-sm" 
                            title="Transfer Bed"
                            onClick={() => openTransferModalForAllocation(alloc)}
                          >
                            <i className="bi bi-arrow-left-right me-1" />Transfer
                          </button>
                          <button 
                            className="btn btn-outline-danger btn-sm" 
                            title="Vacate Bed"
                            onClick={() => openVacateModalForAllocation(alloc)}
                          >
                            <i className="bi bi-box-arrow-right me-1" />Release
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  // ── SUBVIEW 6: TRANSFERS & RELEASES ───────────────────────
  const renderTransfersView = () => (
    <div>
      <div className="mb-4">
        <h4 className="fw-bold text-primary mb-1">Accommodation Transfer & Release</h4>
        <p className="text-muted mb-0" style={{ fontSize: '0.88rem' }}>
          Transfer trainees between bunk positions or vacate bed positions when courses complete
        </p>
      </div>

      <div className="row g-4">
        {/* Active Assignments List for Action */}
        <div className="col-lg-7">
          <div className="card slaf-card p-4">
            <h5 className="fw-bold text-primary mb-3">Select Trainee to Transfer or Release</h5>
            <div className="list-group list-group-flush" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {activeAllocations.map(alloc => (
                <div key={alloc.id} className="list-group-item p-3 border rounded mb-2 d-flex justify-content-between align-items-center">
                  <div>
                    <strong className="text-primary d-block">{alloc.student_service_number} — {alloc.student_name}</strong>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                      Current: <strong>{alloc.position_code}</strong> ({alloc.billet_name})
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-outline-primary" onClick={() => openTransferModalForAllocation(alloc)}>
                      <i className="bi bi-arrow-left-right me-1" />Transfer
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => openVacateModalForAllocation(alloc)}>
                      <i className="bi bi-box-arrow-right me-1" />Release
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Transfer Action Box */}
        <div className="col-lg-5">
          {selectedAllocationForAction ? (
            <div className="card slaf-card p-4 border-primary border-2">
              <h5 className="fw-bold text-primary mb-3">
                Transfer: {selectedAllocationForAction.student_name}
              </h5>
              <div className="alert alert-info py-2" style={{ fontSize: '0.82rem' }}>
                Currently in position: <strong>{selectedAllocationForAction.position_code}</strong> ({selectedAllocationForAction.billet_name})
              </div>

              <form onSubmit={handleTransferSubmit} className="d-flex flex-column gap-3">
                <div>
                  <label className="form-label fw-semibold small">New Destination Bed Position *</label>
                  <select 
                    className="form-select"
                    value={transferForm.new_bed_position_id}
                    onChange={e => setTransferForm(prev => ({ ...prev, new_bed_position_id: e.target.value }))}
                    required
                  >
                    <option value="">— Select Available Target Position —</option>
                    {availablePositions.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.position_code} ({p.position_type} Position){p.billet_name ? ` — Billet: ${p.billet_name}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label fw-semibold small">Transfer Reason / Remarks</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="Billet maintenance, squadron re-alignment..."
                    value={transferForm.remarks}
                    onChange={e => setTransferForm(prev => ({ ...prev, remarks: e.target.value }))}
                  />
                </div>

                <div className="d-flex gap-2 mt-2">
                  <button type="button" className="btn btn-outline-secondary flex-grow-1" onClick={() => setSelectedAllocationForAction(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary flex-grow-1 fw-semibold">
                    Confirm Transfer
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="card slaf-card p-5 text-center text-muted">
              <i className="bi bi-arrow-left-right" style={{ fontSize: '3rem', opacity: 0.4 }} />
              <div className="mt-2 fw-semibold">Select a trainee from the list on the left</div>
              <div style={{ fontSize: '0.82rem' }}>Choose transfer or release to perform accommodation changes.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // ── SUBVIEW 7: ACCOMMODATION HISTORY ──────────────────────
  const renderHistoryView = () => (
    <div>
      <div className="mb-4">
        <h4 className="fw-bold text-primary mb-1">Accommodation History & Audit Log</h4>
        <p className="text-muted mb-0" style={{ fontSize: '0.88rem' }}>
          Historical record of all past bed allocations, transfers, and releases
        </p>
      </div>

      <div className="card slaf-card p-0">
        <div className="table-responsive">
          <table className="table slaf-table mb-0">
            <thead>
              <tr>
                <th>Service No.</th>
                <th>Trainee Name</th>
                <th>Position</th>
                <th>Billet</th>
                <th>Allocated Date</th>
                <th>Released Date</th>
                <th>Release Reason</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {historyLogs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    No historical accommodation logs recorded yet.
                  </td>
                </tr>
              ) : (
                historyLogs.map(h => (
                  <tr key={h.id}>
                    <td className="fw-bold text-primary">{h.student_service_number || '—'}</td>
                    <td>{h.student_name || '—'}</td>
                    <td><span className="badge bg-secondary">{h.position_code || '—'}</span></td>
                    <td>{h.billet_name || '—'}</td>
                    <td style={{ fontSize: '0.82rem' }}>{h.allocated_at ? new Date(h.allocated_at).toLocaleDateString() : '—'}</td>
                    <td style={{ fontSize: '0.82rem', color: '#b42318' }}>{h.vacated_at ? new Date(h.vacated_at).toLocaleDateString() : '—'}</td>
                    <td>
                      <span className="badge bg-danger-subtle text-danger" style={{ fontSize: '0.73rem' }}>
                        {h.vacate_reason || '—'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#5b6574' }}>{h.remarks || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  // ── SUBVIEW 8: REPORTS & ANALYTICS ────────────────────────
  const renderReportsView = () => (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold text-primary mb-1">Accommodation Reports & Capacity Breakdown</h4>
          <p className="text-muted mb-0" style={{ fontSize: '0.88rem' }}>
            Official strength and utilization reports for SLAF management
          </p>
        </div>
        <button className="btn btn-outline-dark btn-sm fw-semibold shadow-xs" onClick={() => setShowReportModal(true)}>
          <i className="bi bi-printer me-1 text-primary" />Print Official Billeting Report
        </button>
      </div>

      <div className="row g-3">
        {billets.map(b => (
          <div key={b.id} className="col-md-6 col-lg-4">
            <div className="card slaf-card p-4 h-100 border">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <h5 className="fw-bold text-primary mb-0">{b.name}</h5>
                <span className="badge bg-secondary">{b.building_name}</span>
              </div>
              <div className="row text-center g-2 my-3">
                <div className="col-4">
                  <div className="p-2 rounded bg-light">
                    <div className="fw-bold">{b.bunk_bed_count * 2}</div>
                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>Positions</div>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2 rounded bg-primary-subtle text-primary">
                    <div className="fw-bold">{b.current_occupancy}</div>
                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>Occupied</div>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2 rounded bg-success-subtle text-success">
                    <div className="fw-bold">{Math.max(0, (b.bunk_bed_count * 2) - b.current_occupancy)}</div>
                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>Available</div>
                  </div>
                </div>
              </div>
              <div className="progress" style={{ height: 8 }}>
                <div 
                  className="progress-bar bg-primary" 
                  style={{ width: `${(b.bunk_bed_count * 2) > 0 ? (b.current_occupancy / (b.bunk_bed_count * 2)) * 100 : 0}%` }} 
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // ── SUBVIEW 9: VISUAL BUNK MAP ────────────────────────────
  const renderMapView = () => (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold text-primary mb-1">Visual Bunk Bed Placement Map</h4>
          <p className="text-muted mb-0" style={{ fontSize: '0.88rem' }}>
            Physical 2-tier bunk bed stack cards view with live parade state badges
          </p>
        </div>
      </div>
      {renderBunksView()}
    </div>
  )

  // ═══════════════════════════════════════════════════════════
  // MAIN RENDER WITH SUBVIEW SWITCHING
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="fade-in-slide">
      {/* Dynamic Subview Routing */}
      {subview === 'dashboard' && renderDashboardView()}
      {subview === 'billets' && renderBilletsView()}
      {subview === 'bunks' && renderBunksView()}
      {subview === 'allocate' && renderAllocateView()}
      {subview === 'trainees' && renderTraineesView()}
      {subview === 'transfers' && renderTransfersView()}
      {subview === 'history' && renderHistoryView()}
      {subview === 'reports' && renderReportsView()}
      {subview === 'map' && renderMapView()}

      {/* ═══════════════════════════════════════════════════════
          MODAL DIALOGS FOR CREATION & ACTIONS
      ═══════════════════════════════════════════════════════ */}

      {/* ── Building Creation Modal ── */}
      {showBuildingModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold text-primary">
                  <i className="bi bi-building-add me-2" />Add Building Block
                </h5>
                <button className="btn-close" onClick={() => setShowBuildingModal(false)} />
              </div>
              <form onSubmit={handleCreateBuilding}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Building Name *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Training Block Alpha (T1)"
                      value={buildingForm.name}
                      onChange={e => setBuildingForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Building Type *</label>
                    <select 
                      className="form-select"
                      value={buildingForm.type}
                      onChange={e => setBuildingForm(prev => ({ ...prev, type: e.target.value }))}
                    >
                      <option value="Airmen">Airmen Block</option>
                      <option value="Airwomen">Airwomen Block</option>
                      <option value="Officers">Officers Block</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Planned Capacity *</label>
                    <input 
                      type="number" 
                      className="form-control"
                      value={buildingForm.capacity}
                      onChange={e => setBuildingForm(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer border-0 d-flex flex-column-reverse flex-sm-row justify-content-end gap-2">
                  <button type="button" className="btn btn-outline-secondary w-100 w-sm-auto" onClick={() => setShowBuildingModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary w-100 w-sm-auto">Save Building</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Billet Creation Modal ── */}
      {showBilletModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold text-primary">
                  <i className="bi bi-building me-2" />Create New Billet
                </h5>
                <button className="btn-close" onClick={() => setShowBilletModal(false)} />
              </div>
              <form onSubmit={handleCreateBillet}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Building *</label>
                    <select 
                      className="form-select"
                      value={billetForm.building_id}
                      onChange={e => setBilletForm(prev => ({ ...prev, building_id: e.target.value }))}
                      required
                    >
                      <option value="">— Select Building —</option>
                      {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Billet Name / No *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Billet B-01"
                      value={billetForm.name}
                      onChange={e => setBilletForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Block</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Block A"
                        value={billetForm.block}
                        onChange={e => setBilletForm(prev => ({ ...prev, block: e.target.value }))}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Location</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Ground Floor"
                        value={billetForm.location}
                        onChange={e => setBilletForm(prev => ({ ...prev, location: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Initial Bunk Beds Count</label>
                    <input 
                      type="number" 
                      className="form-control"
                      value={billetForm.bunk_bed_count}
                      onChange={e => setBilletForm(prev => ({ ...prev, bunk_bed_count: parseInt(e.target.value) || 0 }))}
                    />
                    <small className="text-muted">
                      Sleeping capacity will be automatically calculated as {billetForm.bunk_bed_count * 2} positions.
                    </small>
                  </div>
                </div>
                <div className="modal-footer border-0 d-flex flex-column-reverse flex-sm-row justify-content-end gap-2">
                  <button type="button" className="btn btn-outline-secondary w-100 w-sm-auto" onClick={() => setShowBilletModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary w-100 w-sm-auto">Create Billet</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Single Bunk Bed Creation Modal ── */}
      {showBunkModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold text-primary">
                  <i className="bi bi-layout-three-columns me-2" />Add Single Bunk Bed
                </h5>
                <button className="btn-close" onClick={() => setShowBunkModal(false)} />
              </div>
              <form onSubmit={handleCreateBunkBed}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Billet *</label>
                    <select 
                      className="form-select"
                      value={bunkForm.billet_id}
                      onChange={e => setBunkForm(prev => ({ ...prev, billet_id: e.target.value }))}
                      required
                    >
                      <option value="">— Select Billet —</option>
                      {billets.map(b => <option key={b.id} value={b.id}>{b.name} ({b.building_name})</option>)}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Bunk Number / Identifier *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. B-01-05"
                      value={bunkForm.bunk_no}
                      onChange={e => setBunkForm(prev => ({ ...prev, bunk_no: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="alert alert-info py-2" style={{ fontSize: '0.82rem' }}>
                    <i className="bi bi-info-circle me-1" />
                    <strong>Automatic 2-Tier Creation:</strong> The system will automatically create <strong>{bunkForm.bunk_no || 'Bunk'}-TOP</strong> and <strong>{bunkForm.bunk_no || 'Bunk'}-BOTTOM</strong> positions.
                  </div>
                </div>
                <div className="modal-footer border-0 d-flex flex-column-reverse flex-sm-row justify-content-end gap-2">
                  <button type="button" className="btn btn-outline-secondary w-100 w-sm-auto" onClick={() => setShowBunkModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary w-100 w-sm-auto">Create Bunk Bed</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Bunk Bed Creation Modal ── */}
      {showBulkBunkModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold text-primary">
                  <i className="bi bi-layers me-2" />Bulk Generate Bunk Beds
                </h5>
                <button className="btn-close" onClick={() => setShowBulkBunkModal(false)} />
              </div>
              <form onSubmit={handleBulkBunkBedSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Target Billet *</label>
                    <select 
                      className="form-select"
                      value={bulkBunkForm.billet_id}
                      onChange={e => setBulkBunkForm(prev => ({ ...prev, billet_id: e.target.value }))}
                      required
                    >
                      <option value="">— Select Billet —</option>
                      {billets.map(b => <option key={b.id} value={b.id}>{b.name} ({b.building_name})</option>)}
                    </select>
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Bunk Prefix</label>
                      <input 
                        type="text" 
                        className="form-control"
                        value={bulkBunkForm.prefix}
                        onChange={e => setBulkBunkForm(prev => ({ ...prev, prefix: e.target.value }))}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Count (Bunks)</label>
                      <input 
                        type="number" 
                        className="form-control"
                        value={bulkBunkForm.count}
                        onChange={e => setBulkBunkForm(prev => ({ ...prev, count: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                  <div className="alert alert-success py-2" style={{ fontSize: '0.82rem' }}>
                    Generating <strong>{bulkBunkForm.count} bunk beds</strong> will automatically create <strong>{bulkBunkForm.count * 2} sleeping positions</strong> (TOP & BOTTOM).
                  </div>
                </div>
                <div className="modal-footer border-0 d-flex flex-column-reverse flex-sm-row justify-content-end gap-2">
                  <button type="button" className="btn btn-outline-secondary w-100 w-sm-auto" onClick={() => setShowBulkBunkModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary w-100 w-sm-auto">Generate Bunk Units</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Allocation Modal (Direct from Bunk Cards) ── */}
      {showAllocateModal && selectedPositionForAllocation && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold text-primary">
                  <i className="bi bi-door-closed me-2" />Assign Trainee to {selectedPositionForAllocation.position_code}
                </h5>
                <button className="btn-close" onClick={() => setShowAllocateModal(false)} />
              </div>
              <form onSubmit={handleAllocateSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Select Trainee *</label>
                    <select 
                      className="form-select"
                      value={allocateForm.student_id}
                      onChange={e => setAllocateForm(prev => ({ ...prev, student_id: e.target.value }))}
                      required
                    >
                      <option value="">— Search & Select Trainee —</option>
                      {students
                        .filter(s => s.status === 'Active' && !activeAllocations.some(a => a.student_id === s.id))
                        .map(s => (
                          <option key={s.id} value={s.id}>
                            {s.service_number} — {s.rank} {s.full_name} ({s.trade || 'No Trade'})
                          </option>
                        ))
                      }
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Remarks</label>
                    <input 
                      type="text" 
                      className="form-control"
                      placeholder="Remarks..."
                      value={allocateForm.remarks}
                      onChange={e => setAllocateForm(prev => ({ ...prev, remarks: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="modal-footer border-0 d-flex flex-column-reverse flex-sm-row justify-content-end gap-2">
                  <button type="button" className="btn btn-outline-secondary w-100 w-sm-auto" onClick={() => setShowAllocateModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary w-100 w-sm-auto">Confirm Placement</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Vacate Modal ── */}
      {showVacateModal && selectedAllocationForAction && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold text-danger">
                  <i className="bi bi-box-arrow-right me-2" />Release Bed Position
                </h5>
                <button className="btn-close" onClick={() => setShowVacateModal(false)} />
              </div>
              <form onSubmit={handleVacateSubmit}>
                <div className="modal-body">
                  <div className="alert alert-warning py-2" style={{ fontSize: '0.85rem' }}>
                    Releasing bed position <strong>{selectedAllocationForAction.position_code}</strong> currently occupied by <strong>{selectedAllocationForAction.student_name}</strong> ({selectedAllocationForAction.student_service_number}).
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Release Reason *</label>
                    <select 
                      className="form-select"
                      value={vacateForm.vacate_reason}
                      onChange={e => setVacateForm(prev => ({ ...prev, vacate_reason: e.target.value }))}
                      required
                    >
                      <option value="Course Completed">Course Completed / Passed Out</option>
                      <option value="Posting Out">Posting Out</option>
                      <option value="Medical Discharge">Medical Discharge</option>
                      <option value="Billet Maintenance">Billet Maintenance</option>
                      <option value="Administrative">Administrative Request</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Remarks</label>
                    <input 
                      type="text" 
                      className="form-control"
                      placeholder="Additional notes for history log..."
                      value={vacateForm.remarks}
                      onChange={e => setVacateForm(prev => ({ ...prev, remarks: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="modal-footer border-0 d-flex flex-column-reverse flex-sm-row justify-content-end gap-2">
                  <button type="button" className="btn btn-outline-secondary w-100 w-sm-auto" onClick={() => setShowVacateModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-danger w-100 w-sm-auto">Confirm Release</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Classical Formal Trainee Billeting & Accommodation Report Modal */}
      <ClassicalReportModal
        show={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="OFFICIAL TRAINEE BILLETING & BUNK ACCOMMODATION REGISTER"
        endpoint="/api/v1/reports/accommodation"
        params={{
          billet_id: selectedBilletId,
          trade: tradeFilter !== 'All' ? tradeFilter : ''
        }}
        defaultOrientation="portrait"
      />
    </div>
  )
}

export default AccommodationPanel

