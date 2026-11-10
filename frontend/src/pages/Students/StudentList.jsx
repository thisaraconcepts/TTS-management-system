import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import { ClassicalReportModal } from '../../components/ClassicalReportModal'

export const StudentList = () => {
  const { hasPermission } = useAuth()
  const [students, setStudents] = useState([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [rank, setRank] = useState('')
  const [trade, setTrade] = useState('')
  const [status, setStatus] = useState('')
  const [statuses, setStatuses] = useState([])
  const [ranks, setRanks] = useState([])
  const [trades, setTrades] = useState([])
  const [skip, setSkip] = useState(0)
  const [limit] = useState(10)
  const [loading, setLoading] = useState(true)
  const [showReportModal, setShowReportModal] = useState(false)

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/v1/students', {
        params: { search, rank, trade, status, skip, limit }
      })
      setStudents(res.data.items)
      setTotal(res.data.total)
    } catch (err) {
      toast.error('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [search, rank, trade, status, skip])

  useEffect(() => {
    const loadStatuses = async () => {
      try {
        const res = await axios.get('/api/v1/students/statuses')
        if (res.data && res.data.length > 0) {
          setStatuses(res.data)
        }
      } catch (err) {
        console.error('Failed to load student status types from DB', err)
      }
    }
    loadStatuses()

    const loadRanks = async () => {
      try {
        const res = await axios.get('/api/v1/students/ranks')
        if (res.data && res.data.length > 0) {
          setRanks(res.data)
        }
      } catch (err) {
        console.error('Failed to load student ranks from DB', err)
      }
    }
    loadRanks()

    const loadTrades = async () => {
      try {
        const res = await axios.get('/api/v1/students/trades')
        if (res.data && res.data.length > 0) {
          setTrades(res.data)
        }
      } catch (err) {
        console.error('Failed to load student trades from DB', err)
      }
    }
    loadTrades()
  }, [])

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to soft-delete this student record?')) return
    try {
      await axios.delete(`/api/v1/students/${id}`)
      toast.success('Student record deleted successfully')
      fetchStudents()
    } catch (err) {
      toast.error('Failed to delete student')
    }
  }

  // Export search results to CSV
  const exportToCSV = () => {
    if (students.length === 0) return
    const headers = ['Service Number', 'Rank', 'Initials', 'Full Name', 'NIC', 'Trade', 'Status']
    const rows = students.map(s => [
      s.service_number,
      s.rank,
      s.initials,
      s.full_name,
      s.nic,
      s.trade,
      s.status
    ])

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `slaf_trainees_export.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="fade-in-slide">
      <div className="page-header">
        <div>
          <span className="page-eyebrow">Trainees</span>
          <h2 className="page-title">Trainee directory</h2>
          <p className="page-subtitle">Every trainee on the school's books — search, filter and open a record.</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5" onClick={() => setShowReportModal(true)}>
            <i className="bi bi-printer"></i> Print directory
          </button>
          {hasPermission('personal_occurrence:read') && (
            <Link to="/students/occurrences" className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5">
              <i className="bi bi-shield-exclamation"></i> Personal occurrences
            </Link>
          )}
          {hasPermission('student:write') && (
            <Link to="/students/new" className="btn btn-primary btn-sm d-flex align-items-center gap-1.5">
              <i className="bi bi-plus-circle"></i> Add Trainee
            </Link>
          )}
        </div>

      </div>

      {/* Filter and Search Card */}
      <div className="card slaf-card p-3 mb-4">
        <div className="row g-2">
          <div className="col-12 col-md-4">
            <input
              type="text"
              className="form-control"
              placeholder="Search by Service No, Name, NIC..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSkip(0); }}
            />
          </div>
          <div className="col-6 col-md-2">
            <select className="form-select" value={rank} onChange={(e) => { setRank(e.target.value); setSkip(0); }}>
              <option value="">All Ranks</option>
              {ranks.map(r => (
                <option key={r.id} value={r.label}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-3">
            <select className="form-select" value={trade} onChange={(e) => { setTrade(e.target.value); setSkip(0); }}>
              <option value="">All Trades</option>
              {trades.map(t => (
                <option key={t.id} value={t.label}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-3">
            <select className="form-select" value={status} onChange={(e) => { setStatus(e.target.value); setSkip(0); }}>
              <option value="">All Statuses</option>
              {statuses.map(st => (
                <option key={st.id || st.code} value={st.label}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Trainees Grid/Table */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading trainees...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop & Tablet Table (>= 768px) */}
          <div className="card slaf-card p-0 mb-4 d-none d-md-block shadow-sm">
            <div className="table-responsive">
              <table className="table slaf-table mb-0">
                <thead>
                  <tr>
                    <th>Service Number</th>
                    <th>Rank & Name</th>
                    <th>NIC</th>
                    <th>Trade</th>
                    <th>Course Status</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5 text-muted">No student profiles found matching filters.</td>
                    </tr>
                  ) : (
                    students.map((s) => (
                      <tr key={s.id}>
                        <td className="fw-semibold text-primary">{s.service_number}</td>
                        <td>
                          <div className="d-flex align-items-center gap-2.5">
                            <div className="d-inline-flex bg-primary-subtle text-primary rounded-circle align-items-center justify-content-center flex-shrink-0" style={{ width: '36px', height: '36px' }}>
                              <i className="bi bi-person-fill fs-6"></i>
                            </div>
                            <div>
                              <span className="fw-bold text-dark d-block text-capitalize" style={{ fontSize: '0.925rem', lineHeight: '1.25' }}>
                                {s.full_name || s.initials}
                              </span>
                              <div className="d-flex align-items-center gap-1.5 mt-1">
                                <span className="badge bg-secondary-subtle text-dark border border-secondary-subtle px-2 py-0.5 fw-semibold" style={{ fontSize: '0.725rem' }}>
                                  {s.rank}
                                </span>
                                {s.initials && (
                                  <span className="text-muted fw-medium" style={{ fontSize: '0.775rem' }}>
                                    • {s.initials}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>{s.nic}</td>
                        <td>{s.trade}</td>
                        <td>{s.course_name || 'Unassigned'}</td>
                        <td>
                          <span className={`slaf-badge ${s.status.toLowerCase().replace(' ', '-')}`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="d-inline-flex gap-1">
                            <Link to={`/students/${s.id}`} className="btn btn-outline-primary btn-sm px-2.5" title="View Profile">
                              <i className="bi bi-eye"></i>
                            </Link>
                            {hasPermission('personal_occurrence:read') && (
                              <Link to={`/students/occurrences?trainee_id=${s.id}`} className="btn btn-outline-danger btn-sm px-2.5" title="Personal Occurrence Reporting">
                                <i className="bi bi-shield-exclamation"></i>
                              </Link>
                            )}
                            {hasPermission('student:write') && (
                              <>
                                <Link to={`/students/${s.id}/edit`} className="btn btn-outline-secondary btn-sm px-2.5" title="Edit Profile">
                                  <i className="bi bi-pencil"></i>
                                </Link>
                                <button className="btn btn-outline-danger btn-sm px-2.5" onClick={() => handleDelete(s.id)} title="Delete Profile">
                                  <i className="bi bi-trash"></i>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Record Cards (< 768px) */}
          <div className="d-md-none mb-4">
            {students.length === 0 ? (
              <div className="card slaf-card p-5 text-center text-muted">
                <i className="bi bi-people fs-1 opacity-50 mb-2"></i>
                <p className="mb-0">No student profiles found matching filters.</p>
              </div>
            ) : (
              students.map((s) => (
                <div key={s.id} className="mobile-record-card">
                  <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                    <span className="fw-bold text-primary fs-6">{s.service_number}</span>
                    <span className={`slaf-badge ${s.status.toLowerCase().replace(' ', '-')}`}>
                      {s.status}
                    </span>
                  </div>

                  <div className="d-flex align-items-center gap-2.5 mb-3">
                    <div className="d-inline-flex bg-primary-subtle text-primary rounded-circle align-items-center justify-content-center flex-shrink-0" style={{ width: '42px', height: '42px' }}>
                      <i className="bi bi-person-fill fs-5"></i>
                    </div>
                    <div>
                      <h6 className="fw-bold text-dark mb-0 text-capitalize">{s.full_name || s.initials}</h6>
                      <div className="d-flex align-items-center gap-1.5 mt-0.5">
                        <span className="badge bg-secondary-subtle text-dark border px-2 py-0.5 fw-semibold" style={{ fontSize: '0.7rem' }}>
                          {s.rank}
                        </span>
                        {s.initials && <small className="text-muted">({s.initials})</small>}
                      </div>
                    </div>
                  </div>

                  <div className="row g-2 small mb-3">
                    <div className="col-6">
                      <span className="text-muted d-block" style={{ fontSize: '0.72rem' }}>Trade</span>
                      <strong className="text-dark">{s.trade || '—'}</strong>
                    </div>
                    <div className="col-6">
                      <span className="text-muted d-block" style={{ fontSize: '0.72rem' }}>Course / Batch</span>
                      <span className="text-dark fw-semibold">{s.course_name || 'Unassigned'}</span>
                    </div>
                    {s.nic && (
                      <div className="col-12">
                        <span className="text-muted d-block" style={{ fontSize: '0.72rem' }}>NIC</span>
                        <span className="text-muted font-monospace">{s.nic}</span>
                      </div>
                    )}
                  </div>

                  <div className="d-flex gap-2 pt-2 border-top">
                    <Link to={`/students/${s.id}`} className="btn btn-outline-primary btn-sm flex-grow-1 d-flex align-items-center justify-content-center gap-1">
                      <i className="bi bi-eye"></i> View
                    </Link>
                    {hasPermission('personal_occurrence:read') && (
                      <Link to={`/students/occurrences?trainee_id=${s.id}`} className="btn btn-outline-danger btn-sm flex-grow-1 d-flex align-items-center justify-content-center gap-1" title="POR">
                        <i className="bi bi-shield-exclamation"></i> POR
                      </Link>
                    )}
                    {hasPermission('student:write') && (
                      <>
                        <Link to={`/students/${s.id}/edit`} className="btn btn-outline-secondary btn-sm px-3" title="Edit">
                          <i className="bi bi-pencil"></i>
                        </Link>
                        <button className="btn btn-outline-danger btn-sm px-3" onClick={() => handleDelete(s.id)} title="Delete">
                          <i className="bi bi-trash"></i>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Pagination controls */}
      {total > limit && (
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2 mt-3">
          <span className="text-muted small">
            Showing {skip + 1} - {Math.min(skip + limit, total)} of {total} trainees
          </span>
          <div className="d-flex gap-2 w-100 w-sm-auto justify-content-center">
            <button
              className="btn btn-outline-primary btn-sm px-3 flex-grow-1 flex-sm-grow-0"
              onClick={() => setSkip(prev => Math.max(0, prev - limit))}
              disabled={skip === 0}
            >
              Previous
            </button>
            <button
              className="btn btn-outline-primary btn-sm px-3 flex-grow-1 flex-sm-grow-0"
              onClick={() => setSkip(prev => prev + limit)}
              disabled={skip + limit >= total}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Classical Formal Student Personal Dossier Directory Modal */}
      <ClassicalReportModal
        show={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="OFFICIAL TRAINEE PERSONAL DOSSIER & MASTER DIRECTORY"
        endpoint="/api/v1/reports/students"
        params={{
          trade: trade,
          rank: rank,
          status: status,
          search: search
        }}
        defaultOrientation="portrait"
      />
    </div>
  )
}
export default StudentList

