import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import { ClassicalReportModal } from '../../components/ClassicalReportModal'

export const PersonalOccurrenceReporting = ({ initialTraineeId = null }) => {
  const { hasPermission } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Trainee Filter State
  const [selectedTraineeId, setSelectedTraineeId] = useState(initialTraineeId || searchParams.get('trainee_id') || '')

  // Occurrences Data State
  const [occurrences, setOccurrences] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters State
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('ALL') // ALL, ACHIEVEMENT, MISCONDUCT_OFFENSE
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Add / Edit Modal State
  const [showModal, setShowModal] = useState(false)
  const [editingOccurrence, setEditingOccurrence] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Service Number Search State inside Modal
  const [searchServiceNumber, setSearchServiceNumber] = useState('')
  const [searchingPerson, setSearchingPerson] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [retrievedPerson, setRetrievedPerson] = useState(null)
  const [lastSearchedSN, setLastSearchedSN] = useState('')

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [deletingTitle, setDeletingTitle] = useState('')
  const [showReportModal, setShowReportModal] = useState(false)

  // Form State
  const defaultForm = {
    trainee_id: '',
    occurrence_type: 'ACHIEVEMENT',
    occurrence_date: new Date().toISOString().split('T')[0],
    title: '',
    description: '',
    remarks: ''
  }
  const [form, setForm] = useState(defaultForm)

  // Fetch Occurrences
  const fetchOccurrences = async () => {
    setLoading(true)
    try {
      const params = {}
      if (selectedTraineeId) params.trainee_id = selectedTraineeId
      if (filterType && filterType !== 'ALL') params.occurrence_type = filterType
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      if (searchQuery.trim()) params.search = searchQuery.trim()

      const res = await axios.get('/api/v1/personal-occurrences', { params })
      setOccurrences(res.data.items || [])
    } catch (err) {
      console.error('Failed to load personal occurrences', err)
      if (err.response?.status === 403) {
        toast.error('Access Denied: You do not have permission to view Personal Occurrence Reporting.')
      } else {
        toast.error('Failed to load personal occurrence history.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOccurrences()
  }, [selectedTraineeId, filterType, dateFrom, dateTo])

  // Service Number lookup handler
  const handleSearchPerson = async (snOverride) => {
    const querySN = (snOverride !== undefined ? snOverride : searchServiceNumber).trim()
    if (!querySN) {
      setSearchError('Please enter a Service Number to search.')
      return
    }

    if (querySN.toUpperCase() === lastSearchedSN.toUpperCase() && retrievedPerson) {
      return // Avoid repeated identical request
    }

    setSearchingPerson(true)
    setSearchError('')
    try {
      const res = await axios.get(`/api/v1/students/lookup/${encodeURIComponent(querySN)}`)
      const person = res.data
      setRetrievedPerson(person)
      setLastSearchedSN(querySN)
      setForm(prev => ({ ...prev, trainee_id: person.id }))
      setSearchError('')
    } catch (err) {
      console.error('Service number lookup error', err)
      setRetrievedPerson(null)
      setForm(prev => ({ ...prev, trainee_id: '' }))
      if (err.response?.status === 404) {
        setSearchError('No service person found for the entered Service Number. Please verify the Service Number.')
      } else if (err.response?.data?.detail) {
        setSearchError(err.response.data.detail)
      } else {
        setSearchError('Failed to search service person. Please verify connection and try again.')
      }
    } finally {
      setSearchingPerson(false)
    }
  }

  // Open Create Modal
  const handleOpenCreate = async () => {
    setEditingOccurrence(null)
    setSearchError('')
    setLastSearchedSN('')
    
    // If opened from a specific student page (initialTraineeId or selectedTraineeId)
    const targetStudentId = initialTraineeId || selectedTraineeId
    if (targetStudentId) {
      try {
        const res = await axios.get(`/api/v1/students/${targetStudentId}`)
        const person = res.data
        setRetrievedPerson(person)
        setSearchServiceNumber(person.service_number || '')
        setLastSearchedSN(person.service_number || '')
        setForm({
          ...defaultForm,
          trainee_id: person.id
        })
      } catch (err) {
        setRetrievedPerson(null)
        setSearchServiceNumber('')
        setForm(defaultForm)
      }
    } else {
      setRetrievedPerson(null)
      setSearchServiceNumber('')
      setForm(defaultForm)
    }
    
    setShowModal(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (occ) => {
    setEditingOccurrence(occ)
    setSearchError('')
    setSearchServiceNumber(occ.trainee_service_number || '')
    setRetrievedPerson({
      id: occ.trainee_id,
      service_number: occ.trainee_service_number,
      rank: occ.trainee_rank,
      full_name: occ.trainee_full_name,
      trade: occ.trainee_trade,
      batch: occ.trainee_batch
    })
    setForm({
      trainee_id: occ.trainee_id,
      occurrence_type: occ.occurrence_type,
      occurrence_date: occ.occurrence_date,
      title: occ.title || '',
      description: occ.description || '',
      remarks: occ.remarks || ''
    })
    setShowModal(true)
  }

  // Submit Form (Create / Update)
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.trainee_id) {
      toast.warning('Please enter and verify a valid Service Number first.')
      return
    }
    if (!form.title.trim()) {
      toast.warning('Occurrence title is required.')
      return
    }
    if (!form.description.trim()) {
      toast.warning('Detailed description is required.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        trainee_id: form.trainee_id,
        occurrence_type: form.occurrence_type,
        occurrence_date: form.occurrence_date,
        title: form.title.trim(),
        description: form.description.trim(),
        remarks: form.remarks ? form.remarks.trim() : null
      }

      if (editingOccurrence) {
        await axios.put(`/api/v1/personal-occurrences/${editingOccurrence.id}`, payload)
        toast.success('Personal occurrence record updated successfully!')
      } else {
        await axios.post(`/api/v1/personal-occurrences`, payload)
        toast.success('Personal occurrence recorded successfully!')
      }

      setShowModal(false)
      fetchOccurrences()
    } catch (err) {
      console.error('Error saving occurrence', err)
      toast.error(err.response?.data?.detail || 'Failed to save occurrence record.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Delete
  const handleOpenDelete = (occ) => {
    setDeletingId(occ.id)
    setDeletingTitle(occ.title)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingId) return
    try {
      await axios.delete(`/api/v1/personal-occurrences/${deletingId}`)
      toast.success('Personal occurrence record deleted successfully.')
      setShowDeleteModal(false)
      fetchOccurrences()
    } catch (err) {
      console.error('Failed to delete occurrence', err)
      toast.error(err.response?.data?.detail || 'Failed to delete occurrence record.')
    }
  }

  const handleResetFilters = () => {
    setSelectedTraineeId('')
    setFilterType('ALL')
    setDateFrom('')
    setDateTo('')
    setSearchQuery('')
  }

  const formatDateDDMMYYYY = (dateStr) => {
    if (!dateStr) return 'N/A'
    const parts = dateStr.split('-')
    if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`
    return dateStr
  }

  return (
    <div className="fade-in-slide">
      {/* Header Banner */}
      <div className="page-header">
        <div>
          <span className="page-eyebrow">Trainees · Restricted</span>
          <h2 className="page-title">Personal occurrences</h2>
          <p className="page-subtitle">Commendations, disciplinary and medical records for trainees.</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowReportModal(true)}>
            <i className="bi bi-printer me-1"></i> Print dossier
          </button>
          {hasPermission('personal_occurrence:write') && (
            <button className="btn btn-primary btn-sm" onClick={handleOpenCreate}>
              <i className="bi bi-plus-lg me-1"></i> Add Occurrence
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card slaf-card p-3 mb-4 shadow-sm">
        <div className="row g-2 align-items-end">
          {/* Occurrence Type Filter */}
          <div className="col-md-3 col-lg-2">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.7rem' }}>OCCURRENCE TYPE</label>
            <select
              className="form-select form-select-sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              <option value="ACHIEVEMENT">🟢 Achievements</option>
              <option value="MISCONDUCT_OFFENSE">🔴 Misconduct / Offenses</option>
            </select>
          </div>

          {/* Date From */}
          <div className="col-6 col-md-2">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.7rem' }}>DATE FROM</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          {/* Date To */}
          <div className="col-6 col-md-2">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.7rem' }}>DATE TO</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          {/* Search Box */}
          <div className="col-md-4 col-lg-4">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.7rem' }}>SEARCH BY SERVICE NO / TITLE / NAME</label>
            <div className="input-group input-group-sm">
              <input
                type="text"
                className="form-control"
                placeholder="Search Service No, Name, Title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchOccurrences()}
              />
              <button className="btn btn-outline-secondary" type="button" onClick={fetchOccurrences} title="Search">
                <i className="bi bi-search"></i>
              </button>
            </div>
          </div>

          {/* Reset Filters */}
          <div className="col-md-1">
            <button className="btn btn-outline-secondary btn-sm w-100 fw-semibold" onClick={handleResetFilters} title="Reset Filters">
              <i className="bi bi-x-circle me-1"></i>Reset
            </button>
          </div>
        </div>
      </div>

      {/* Occurrences List / Timeline Grid */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary me-2"></div>
          <span className="fw-semibold text-secondary">Loading personal occurrence records...</span>
        </div>
      ) : occurrences.length === 0 ? (
        <div className="card slaf-card p-5 text-center shadow-sm">
          <i className="bi bi-journal-x display-4 text-muted mb-2"></i>
          <h5 className="fw-bold text-dark">No Personal Occurrence Records Found</h5>
          <p className="text-muted small mb-0">No achievement or misconduct entries match the selected filters.</p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {occurrences.map(occ => {
            const isAchievement = occ.occurrence_type === 'ACHIEVEMENT'
            return (
              <div
                key={occ.id}
                className={`card slaf-card shadow-sm border-0 border-start border-4 ${
                  isAchievement ? 'border-success' : 'border-danger'
                }`}
              >
                <div className={`card-header py-2.5 px-3 d-flex justify-content-between align-items-center ${
                  isAchievement ? 'bg-success-subtle text-success-emphasis' : 'bg-danger-subtle text-danger-emphasis'
                }`}>
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ fontSize: '1.2rem' }}>
                      {isAchievement ? '🟢' : '🔴'}
                    </span>
                    <strong className="fw-extrabold text-uppercase" style={{ fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                      {isAchievement ? 'ACHIEVEMENTS' : 'MISCONDUCT / OFFENSES'}
                    </strong>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-white text-dark border fw-bold">
                      <i className="bi bi-calendar-event me-1 text-primary"></i>
                      {formatDateDDMMYYYY(occ.occurrence_date)}
                    </span>
                  </div>
                </div>

                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h5 className="fw-bold text-dark mb-1">{occ.title}</h5>
                      <p className="text-muted small mb-2">
                        Trainee: <strong className="text-dark cursor-pointer" onClick={() => navigate(`/students/${occ.trainee_id}`)}>{occ.trainee_service_number} - {occ.trainee_rank} {occ.trainee_full_name}</strong>
                        {occ.trainee_trade && <span className="ms-2 badge bg-secondary-subtle text-dark border">{occ.trainee_trade}</span>}
                        {occ.trainee_batch && <span className="ms-1 badge bg-light text-dark border">Batch {occ.trainee_batch}</span>}
                      </p>
                    </div>
                    
                    {/* Action buttons if permitted */}
                    <div className="d-flex gap-1">
                      {hasPermission('personal_occurrence:write') && (
                        <button className="btn btn-outline-secondary btn-sm" onClick={() => handleOpenEdit(occ)} title="Edit Occurrence">
                          <i className="bi bi-pencil me-1"></i>Edit
                        </button>
                      )}
                      {hasPermission('personal_occurrence:delete') && (
                        <button className="btn btn-outline-danger btn-sm" onClick={() => handleOpenDelete(occ)} title="Delete Record">
                          <i className="bi bi-trash me-1"></i>Delete
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-light rounded border mb-2">
                    <p className="mb-0 text-dark small white-space-pre-wrap">{occ.description}</p>
                  </div>

                  {occ.remarks && (
                    <div className="p-2.5 bg-warning-subtle text-dark rounded border border-warning mb-2" style={{ fontSize: '0.8rem' }}>
                      <strong>Remarks:</strong> {occ.remarks}
                    </div>
                  )}

                  <div className="d-flex justify-content-between align-items-center text-muted pt-2 border-top" style={{ fontSize: '0.725rem' }}>
                    <span>
                      <i className="bi bi-person-check me-1"></i>Recorded By: <strong>{occ.creator_name || 'System Admin'}</strong>
                    </span>
                    <span>
                      <i className="bi bi-clock me-1"></i>Recorded Date: {new Date(occ.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }} tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content slaf-card border-0 shadow-lg">
              <div className="modal-header bg-primary text-white py-3">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-journal-plus fs-5"></i>
                  <h5 className="modal-title fw-bold">
                    {editingOccurrence ? 'Edit Personal Occurrence Record' : 'Add Personal Occurrence Record'}
                  </h5>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    {/* Service Number Search Section (When creating new occurrence) */}
                    {!editingOccurrence && (
                      <div className="col-12">
                        <label className="form-label fw-bold small text-muted">
                          SERVICE NUMBER*
                        </label>
                        <div className="input-group">
                          <span className="input-group-text bg-light fw-bold text-secondary">
                            <i className="bi bi-person-vcard me-1"></i> Service No:
                          </span>
                          <input
                            type="text"
                            className={`form-control ${searchError ? 'is-invalid' : retrievedPerson ? 'is-valid' : ''}`}
                            placeholder="Enter Service Number (e.g. 51837)..."
                            value={searchServiceNumber}
                            onChange={(e) => {
                              setSearchServiceNumber(e.target.value)
                              setSearchError('')
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleSearchPerson()
                              }
                            }}
                            disabled={searchingPerson}
                            autoFocus
                          />
                          <button
                            type="button"
                            className="btn btn-primary fw-bold px-3 d-flex align-items-center gap-1.5"
                            onClick={() => handleSearchPerson()}
                            disabled={searchingPerson || !searchServiceNumber.trim()}
                          >
                            {searchingPerson ? (
                              <>
                                <span className="spinner-border spinner-border-sm" role="status"></span>
                                <span>Searching...</span>
                              </>
                            ) : (
                              <>
                                <i className="bi bi-search"></i>
                                <span>Search / Find Person</span>
                              </>
                            )}
                          </button>
                        </div>
                        {searchError && (
                          <div className="alert alert-danger d-flex align-items-center gap-2 mt-2 py-2 px-3 small mb-0">
                            <i className="bi bi-exclamation-triangle-fill flex-shrink-0 fs-6"></i>
                            <div>{searchError}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Verified Service Person Details (Read-Only) */}
                    {retrievedPerson && (
                      <div className="col-12">
                        <div className="card bg-primary-subtle border-primary-subtle p-3 rounded-3 shadow-xs">
                          <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom border-primary-subtle">
                            <span className="fw-bold text-primary small text-uppercase">
                              <i className="bi bi-check-circle-fill text-success me-1"></i> Service Person Details (Read-Only)
                            </span>
                            <span className="badge bg-primary text-white">{retrievedPerson.status || 'Active'}</span>
                          </div>
                          <div className="row g-2 small">
                            <div className="col-md-4 col-6">
                              <span className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Service Number:</span>
                              <strong className="text-dark fs-6">{retrievedPerson.service_number}</strong>
                            </div>
                            <div className="col-md-4 col-6">
                              <span className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Rank:</span>
                              <strong className="text-dark">{retrievedPerson.rank || 'AC'}</strong>
                            </div>
                            <div className="col-md-4 col-12">
                              <span className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Name:</span>
                              <strong className="text-dark">{retrievedPerson.full_name || retrievedPerson.initials || 'N/A'}</strong>
                            </div>
                            <div className="col-md-4 col-6">
                              <span className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Trade:</span>
                              <span className="text-dark fw-semibold">{retrievedPerson.trade || 'N/A'}</span>
                            </div>
                            <div className="col-md-4 col-6">
                              <span className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Batch / Intake:</span>
                              <span className="text-dark fw-semibold">{retrievedPerson.batch || 'N/A'}</span>
                            </div>
                            <div className="col-md-4 col-12">
                              <span className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Course:</span>
                              <span className="text-dark fw-semibold">{retrievedPerson.course_name || 'Unassigned'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Instruction when no person is selected yet */}
                    {!retrievedPerson && !editingOccurrence && (
                      <div className="col-12">
                        <div className="alert alert-info py-2 px-3 small d-flex align-items-center gap-2 mb-0">
                          <i className="bi bi-info-circle-fill fs-6 flex-shrink-0"></i>
                          <div>
                            Please enter the <strong>Service Number</strong> above and click <strong>Search / Find Person</strong>. The occurrence details form below will be activated once a valid service person is retrieved.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Occurrence Type Select */}
                    <div className="col-md-6">
                      <label className="form-label fw-bold small text-muted">OCCURRENCE CATEGORY*</label>
                      <select
                        className="form-select"
                        value={form.occurrence_type}
                        onChange={(e) => setForm({ ...form, occurrence_type: e.target.value })}
                        required
                        disabled={!form.trainee_id || submitting}
                      >
                        <option value="ACHIEVEMENT">🟢 Achievements</option>
                        <option value="MISCONDUCT_OFFENSE">🔴 Misconduct / Offenses</option>
                      </select>
                    </div>

                    {/* Occurrence Date */}
                    <div className="col-md-6">
                      <label className="form-label fw-bold small text-muted">OCCURRENCE DATE*</label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.occurrence_date}
                        onChange={(e) => setForm({ ...form, occurrence_date: e.target.value })}
                        required
                        disabled={!form.trainee_id || submitting}
                      />
                    </div>

                    {/* Title */}
                    <div className="col-12">
                      <label className="form-label fw-bold small text-muted">OCCURRENCE TITLE / SUBJECT*</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Outstanding Academic Performance or Repeated Late Attendance"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        required
                        disabled={!form.trainee_id || submitting}
                      />
                    </div>

                    {/* Description */}
                    <div className="col-12">
                      <label className="form-label fw-bold small text-muted">DETAILED DESCRIPTION*</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        placeholder="Enter full details of the achievement or misconduct incident..."
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        required
                        disabled={!form.trainee_id || submitting}
                      ></textarea>
                    </div>

                    {/* Remarks */}
                    <div className="col-12">
                      <label className="form-label fw-bold small text-muted">REMARKS / ACTION TAKEN (OPTIONAL)</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        placeholder="Optional supervisory remarks, award details, or disciplinary action..."
                        value={form.remarks}
                        onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                        disabled={!form.trainee_id || submitting}
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light py-2">
                  <button type="button" className="btn btn-secondary btn-sm fw-semibold" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm fw-bold shadow-sm" disabled={!form.trainee_id || submitting}>
                    {submitting ? 'Saving...' : 'Save Occurrence'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1070 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content slaf-card border-0 shadow-lg">
              <div className="modal-header bg-danger text-white py-3">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-exclamation-triangle-fill fs-5"></i>
                  <h5 className="modal-title fw-bold">Confirm Delete Record</h5>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowDeleteModal(false)}></button>
              </div>

              <div className="modal-body p-4 text-center">
                <p className="mb-2 text-dark fs-6">
                  Are you sure you want to delete this personal occurrence record?
                </p>
                <strong className="text-danger d-block mb-3">"{deletingTitle}"</strong>
                <p className="text-muted small mb-0">
                  This record will be soft-deleted in accordance with SLAF record-retention policy and logged in system audit trails.
                </p>
              </div>

              <div className="modal-footer bg-light py-2">
                <button type="button" className="btn btn-secondary btn-sm fw-semibold" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger btn-sm fw-bold shadow-sm" onClick={handleConfirmDelete}>
                  Yes, Delete Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Classical Formal Trainee Personal Occurrence & Conduct Report Modal */}
      <ClassicalReportModal
        show={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="OFFICIAL TRAINEE PERSONAL OCCURRENCE & CONDUCT DOSSIER"
        endpoint="/api/v1/reports/occurrences"
        params={{
          trainee_id: selectedTraineeId,
          occurrence_type: filterType,
          date_from: dateFrom,
          date_to: dateTo
        }}
        defaultOrientation="landscape"
      />
    </div>
  )
}

export default PersonalOccurrenceReporting

