import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'

const INITIAL_FORM_DATA = {
  service_number: '',
  initials: '',
  full_name: '',
  nic: '',
  dob: '',
  gender: 'Male',
  rank: 'AC',
  trade: 'Airframe',
  course_id: '',
  batch: '',
  joining_date: '',
  passing_out_date: '',
  status: 'Active',
  phone: '',
  email: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  blood_group: 'O+',
  medical_category: 'A4G4',
  religion: 'Buddhist',
  nationality: 'Sri Lankan',
  permanent_address: '',
  temporary_address: ''
}

export const StudentForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [courses, setCourses] = useState([])
  const [enrollmentOptions, setEnrollmentOptions] = useState([])
  const [courseSearch, setCourseSearch] = useState('')
  const [showCourseSelector, setShowCourseSelector] = useState(true)
  const [statuses, setStatuses] = useState([])
  const [ranks, setRanks] = useState([])
  const [trades, setTrades] = useState([])
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)
  
  const [photoFile, setPhotoFile] = useState(null)
  const [fileInputKey, setFileInputKey] = useState(Date.now())
  const [loading, setLoading] = useState(false)
  const [submitMode, setSubmitMode] = useState('save_and_view') // 'save_and_view' or 'save_and_new'

  useEffect(() => {
    // Load active course enrollment options from Academic Activity SSOT
    const loadEnrollmentOptions = async () => {
      try {
        const res = await axios.get('/api/v1/academic/courses/enrollment-options')
        setEnrollmentOptions(res.data)
        setCourses(res.data)
      } catch (err) {
        console.error('Failed to load course enrollment options', err)
      }
    }
    loadEnrollmentOptions()

    // Load student status types from DB
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

    // Load student ranks from DB
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

    // Load student trades from DB
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

    if (isEdit) {
      const loadStudent = async () => {
        try {
          const res = await axios.get(`/api/v1/students/${id}`)
          const data = res.data
          
          setFormData({
            service_number: data.service_number || '',
            initials: data.initials || '',
            full_name: data.full_name || '',
            nic: data.nic || '',
            dob: data.dob ? data.dob.substring(0, 10) : '',
            gender: data.gender || 'Male',
            rank: data.rank || 'Aircraftman',
            trade: data.trade || 'Airframe',
            course_id: data.course_id || '',
            batch: data.batch || '',
            joining_date: data.joining_date ? data.joining_date.substring(0, 10) : '',
            passing_out_date: data.passing_out_date ? data.passing_out_date.substring(0, 10) : '',
            status: data.status || 'Active',
            phone: data.phone || '',
            email: data.email || '',
            emergency_contact_name: data.emergency_contact_name || '',
            emergency_contact_phone: data.emergency_contact_phone || '',
            blood_group: data.blood_group || 'O+',
            medical_category: data.medical_category || 'A4G4',
            religion: data.religion || 'Buddhist',
            nationality: data.nationality || 'Sri Lankan',
            permanent_address: data.permanent_address || '',
            temporary_address: data.temporary_address || ''
          })
        } catch (err) {
          toast.error('Failed to load student details')
        }
      }
      loadStudent()
    }
  }, [id, isEdit])

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    const parts = dateStr.split('-')
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
    return dateStr
  }

  const selectedCourseOption = enrollmentOptions.find(
    opt => opt.course_id === formData.course_id && (!formData.batch || opt.batch_name === formData.batch || opt.course_code === formData.batch)
  ) || enrollmentOptions.find(opt => opt.course_id === formData.course_id)

  const handleSelectCourseOption = (option) => {
    setFormData(prev => ({
      ...prev,
      course_id: option.course_id,
      batch: option.batch_name || option.course_code || '',
      trade: option.trade_name && trades.some(t => t.label.toLowerCase() === option.trade_name.toLowerCase()) 
        ? trades.find(t => t.label.toLowerCase() === option.trade_name.toLowerCase()).label
        : (option.trade_name || prev.trade),
      joining_date: (!prev.joining_date && option.start_date) ? option.start_date : prev.joining_date,
      passing_out_date: (!prev.passing_out_date && option.end_date) ? option.end_date : prev.passing_out_date
    }))
    setShowCourseSelector(false)
    toast.info(`Assigned to ${option.course_code} - ${option.course_name} (${option.batch_name})`)
  }

  const handleClearCourseOption = () => {
    setFormData(prev => ({
      ...prev,
      course_id: '',
      batch: ''
    }))
    setShowCourseSelector(true)
  }

  const filteredEnrollmentOptions = enrollmentOptions.filter(opt => {
    const q = courseSearch.toLowerCase()
    return (
      (opt.course_code && opt.course_code.toLowerCase().includes(q)) ||
      (opt.course_name && opt.course_name.toLowerCase().includes(q)) ||
      (opt.course_full_title && opt.course_full_title.toLowerCase().includes(q)) ||
      (opt.trade_name && opt.trade_name.toLowerCase().includes(q)) ||
      (opt.batch_name && opt.batch_name.toLowerCase().includes(q)) ||
      (opt.instructor_name && opt.instructor_name.toLowerCase().includes(q))
    )
  })


  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e) => {
    setPhotoFile(e.target.files[0])
  }

  const handleResetForm = () => {
    if (window.confirm('Are you sure you want to clear all form inputs?')) {
      setFormData(INITIAL_FORM_DATA)
      setPhotoFile(null)
      setFileInputKey(Date.now())
    }
  }

  const handleSubmit = async (e, explicitMode = null) => {
    if (e && e.preventDefault) e.preventDefault()

    // Client-side mandatory validation
    if (!formData.service_number || !formData.service_number.trim()) {
      toast.warning('Please enter a valid Service Number')
      return
    }
    if (!formData.full_name || !formData.full_name.trim()) {
      toast.warning('Please enter the Trainee Full Name')
      return
    }

    const currentMode = explicitMode || submitMode
    setSubmitMode(currentMode)
    setLoading(true)
    try {
      let savedStudent = null
      
      // Sanitize payload: trim strings, convert empty strings back to null
      const payload = {}
      Object.keys(formData).forEach(key => {
        const val = formData[key]
        if (typeof val === 'string') {
          const trimmed = val.trim()
          payload[key] = trimmed === '' ? null : trimmed
        } else {
          payload[key] = (val === '' || val === null) ? null : val
        }
      })
      // Guarantee required non-null fields
      payload.service_number = formData.service_number.trim()
      payload.full_name = formData.full_name.trim()

      if (isEdit) {
        const res = await axios.put(`/api/v1/students/${id}`, payload)
        savedStudent = res.data
        toast.success('Trainee profile updated successfully')
      } else {
        const res = await axios.post('/api/v1/students', payload)
        savedStudent = res.data
        toast.success('Trainee registered successfully')
      }

      // If photo was chosen, upload photo
      if (photoFile && savedStudent) {
        const fileForm = new FormData()
        fileForm.append('file', photoFile)
        await axios.post(`/api/v1/students/${savedStudent.id}/photo`, fileForm)
        toast.success('Profile photo uploaded')
      }

      if (currentMode === 'save_and_new' && !isEdit) {
        // Keep batch and course context to expedite bulk trainee intake registration
        setFormData(prev => ({
          ...INITIAL_FORM_DATA,
          course_id: prev.course_id,
          batch: prev.batch,
          joining_date: prev.joining_date,
          rank: prev.rank,
          trade: prev.trade
        }))
        setPhotoFile(null)
        setFileInputKey(Date.now())
        window.scrollTo({ top: 0, behavior: 'smooth' })
        toast.info(`Ready to register next trainee for ${formData.batch || 'current batch'}`)
      } else {
        navigate(`/students/${savedStudent.id}`)
      }
    } catch (err) {
      console.error('Submission error:', err)
      const detail = err.response?.data?.detail
      let errorMsg = 'An error occurred during submission'
      if (Array.isArray(detail)) {
        errorMsg = detail.map(d => `${d.loc ? d.loc[d.loc.length - 1] + ': ' : ''}${d.msg}`).join(' | ')
      } else if (typeof detail === 'string') {
        errorMsg = detail
      } else if (err.message) {
        errorMsg = err.message
      }
      toast.error(errorMsg, { autoClose: 7000 })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fade-in-slide">
      <div className="page-header">
        <div>
          <span className="page-eyebrow">Trainees</span>
          <h2 className="page-title">{isEdit ? 'Edit trainee' : 'Register a new trainee'}</h2>
          <p className="page-subtitle">{isEdit ? `Updating the record for service number ${formData.service_number}` : 'Fields marked * are required.'}</p>
        </div>
        <div className="d-flex gap-2 w-100 w-sm-auto justify-content-start justify-content-sm-end">
          {!isEdit && (
            <button type="button" onClick={handleResetForm} className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5 flex-grow-1 flex-sm-grow-0 justify-content-center">
              <i className="bi bi-arrow-counterclockwise"></i> Clear Form
            </button>
          )}
          <Link to="/students" className="btn btn-outline-secondary btn-sm flex-grow-1 flex-sm-grow-0 text-center">
            Cancel
          </Link>
        </div>
      </div>

      <div className="card slaf-card p-4">
        <form onSubmit={handleSubmit}>
          {/* Section 1: Military details */}
          <h5 className="mb-3 display-font text-primary border-bottom pb-2">1. Service Particulars</h5>
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <label className="form-label fw-semibold">Service Number *</label>
              <input 
                type="text" 
                className="form-control" 
                name="service_number"
                value={formData.service_number}
                onChange={handleInputChange}
                required
                disabled={isEdit}
                placeholder="e.g. 51837"
              />
            </div>
            <div className="col-md-2">
              <label className="form-label fw-semibold">Initials *</label>
              <input 
                type="text" 
                className="form-control" 
                name="initials"
                value={formData.initials}
                onChange={handleInputChange}
                required
                placeholder="e.g. W A"
              />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold">Full Name *</label>
              <input 
                type="text" 
                className="form-control" 
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                required
                placeholder="e.g. Wasala Mudiyanselage Sanka"
              />
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">NIC Number *</label>
              <input 
                type="text" 
                className="form-control" 
                name="nic"
                value={formData.nic}
                onChange={handleInputChange}
                required
                placeholder="e.g. 199612345678"
              />
            </div>

            <div className="col-md-3">
              <label className="form-label fw-semibold">Rank *</label>
              <select className="form-select" name="rank" value={formData.rank} onChange={handleInputChange} required>
                {ranks.length > 0 ? (
                  ranks.map(r => (
                    <option key={r.id} value={r.label}>
                      {r.label}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="AC">AC</option>
                    <option value="LAC">LAC</option>
                    <option value="CPL">CPL</option>
                    <option value="SGT">SGT</option>
                    <option value="FSGT">FSGT</option>
                    <option value="WO">WO</option>
                  </>
                )}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">Trade *</label>
              <select className="form-select" name="trade" value={formData.trade} onChange={handleInputChange} required>
                {trades.length > 0 ? (
                  trades.map(t => (
                    <option key={t.id} value={t.label}>
                      {t.label}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Airframe">Airframe Fitters</option>
                    <option value="Avionics">Avionics Fitters</option>
                    <option value="Safety Equipment">Safety Equipment Fitters</option>
                  </>
                )}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">Enlistment / Joining Date</label>
              <input 
                type="date" 
                className="form-control" 
                name="joining_date"
                value={formData.joining_date}
                onChange={handleInputChange}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">Passing Out Date</label>
              <input 
                type="date" 
                className="form-control" 
                name="passing_out_date"
                value={formData.passing_out_date}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Section 1.1: Academic Course & Batch Enrollment */}
          <div className="card bg-light border p-3 mb-4 rounded-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div>
                <h6 className="fw-bold text-primary mb-0 display-font d-flex align-items-center gap-1.5">
                  <i className="bi bi-journal-bookmark-fill"></i> Course Enrollment (Academic Activity Master Records)
                </h6>
                <small className="text-muted">Trainees are enrolled into active courses/batches created via Academic Activity module.</small>
              </div>
              {formData.course_id && (
                <div className="d-flex gap-2">
                  <button 
                    type="button" 
                    className="btn btn-outline-primary btn-sm py-1 px-2.5 d-flex align-items-center gap-1"
                    onClick={() => setShowCourseSelector(!showCourseSelector)}
                  >
                    <i className={`bi bi-${showCourseSelector ? 'eye-slash' : 'pencil'}`}></i>
                    {showCourseSelector ? 'Hide Course List' : 'Change Course / Batch'}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-outline-danger btn-sm py-1 px-2.5 d-flex align-items-center gap-1"
                    onClick={handleClearCourseOption}
                  >
                    <i className="bi bi-x-circle"></i> Clear Assignment
                  </button>
                </div>
              )}
            </div>

            {/* Current Active Selection Summary Banner */}
            {formData.course_id ? (
              <div className="card bg-white border-primary border-2 p-3 shadow-xs mb-3">
                <div className="row g-3 align-items-center">
                  <div className="col-md-4 border-end">
                    <span className="text-muted d-block small text-uppercase fw-semibold" style={{ fontSize: '0.72rem' }}>Selected Course & Batch</span>
                    <h6 className="fw-bold text-primary mb-1">
                      {selectedCourseOption?.course_full_title || `${formData.batch} Course`}
                    </h6>
                    <div className="d-flex gap-1.5 flex-wrap align-items-center">
                      <span className="badge bg-primary-subtle text-primary border">Batch: {formData.batch || selectedCourseOption?.batch_name || 'N/A'}</span>
                      <span className="badge bg-secondary-subtle text-dark border">Trade: {selectedCourseOption?.trade_name || formData.trade}</span>
                      <span className="badge bg-info-subtle text-info border">{selectedCourseOption?.course_type || 'Basic'}</span>
                    </div>
                  </div>
                  <div className="col-md-4 border-end">
                    <span className="text-muted d-block small text-uppercase fw-semibold" style={{ fontSize: '0.72rem' }}>Assigned Instructor & Classroom</span>
                    <strong className="text-dark d-block">
                      <i className="bi bi-person-badge me-1 text-primary"></i>
                      {selectedCourseOption?.instructor_name && selectedCourseOption.instructor_name !== 'Unassigned'
                        ? `${selectedCourseOption.instructor_rank || ''} ${selectedCourseOption.instructor_name}`
                        : 'Assigned Academic Staff'}
                    </strong>
                    <small className="text-muted">
                      <i className="bi bi-door-open me-1"></i>
                      Classroom: {selectedCourseOption?.classroom_name || 'Unassigned'}
                    </small>
                  </div>
                  <div className="col-md-4">
                    <span className="text-muted d-block small text-uppercase fw-semibold" style={{ fontSize: '0.72rem' }}>Duration & Academic Timeline</span>
                    <small className="fw-semibold text-dark d-block">
                      {selectedCourseOption?.duration_weeks ? `${selectedCourseOption.duration_weeks} Weeks` : 'Course Schedule'}
                      {selectedCourseOption?.intake_capacity ? ` (Cap: ${selectedCourseOption.intake_capacity})` : ''}
                    </small>
                    <small className="text-muted">
                      {formatDate(selectedCourseOption?.start_date)} &mdash; {formatDate(selectedCourseOption?.end_date)}
                    </small>
                  </div>
                </div>
              </div>
            ) : (
              !showCourseSelector && (
                <div className="alert alert-light border d-flex justify-content-between align-items-center py-2 px-3 mb-2">
                  <span className="text-muted"><i className="bi bi-info-circle me-1"></i> No course assigned yet. Trainee will be registered without a course.</span>
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => setShowCourseSelector(true)}>
                    Select Course & Batch
                  </button>
                </div>
              )
            )}

            {/* Course & Batch Selection Table */}
            {showCourseSelector && (
              <div className="mt-2">
                <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                  <div className="input-group input-group-sm" style={{ maxWidth: '400px' }}>
                    <span className="input-group-text bg-white"><i className="bi bi-search text-muted"></i></span>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Search Course (e.g. 2/2026, Account Assistant)..." 
                      value={courseSearch}
                      onChange={(e) => setCourseSearch(e.target.value)}
                    />
                    {courseSearch && (
                      <button className="btn btn-outline-secondary" type="button" onClick={() => setCourseSearch('')}>
                        <i className="bi bi-x"></i>
                      </button>
                    )}
                  </div>
                  <small className="text-muted">
                    {filteredEnrollmentOptions.length} available course/batch {filteredEnrollmentOptions.length === 1 ? 'option' : 'options'}
                  </small>
                </div>

                {enrollmentOptions.length === 0 ? (
                  <div className="alert alert-warning d-flex align-items-center gap-2 py-3 px-3 mb-0">
                    <i className="bi bi-exclamation-triangle-fill fs-5"></i>
                    <div>
                      <strong>No active courses/batches are currently available for enrollment.</strong>
                      <div className="small text-muted mt-0.5">
                        Courses and batches must be created first by an authorized instructor through the <strong>Academic Activity</strong> module.
                      </div>
                    </div>
                  </div>
                ) : filteredEnrollmentOptions.length === 0 ? (
                  <div className="text-center py-4 text-muted bg-white border rounded">
                    <i className="bi bi-search fs-4 d-block mb-1"></i>
                    No active course/batch matching "{courseSearch}".
                  </div>
                ) : (
                  <div className="table-responsive bg-white border rounded" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    <table className="table table-hover table-sm align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                      <thead className="table-light sticky-top">
                        <tr>
                          <th>Course</th>
                          <th>Trade</th>
                          <th>Batch</th>
                          <th>Instructor</th>
                          <th>Classroom</th>
                          <th>Start Date</th>
                          <th>End Date</th>
                          <th>Status</th>
                          <th className="text-end">Enrollment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEnrollmentOptions.map((opt, idx) => {
                          const isSelected = formData.course_id === opt.course_id && (formData.batch === opt.batch_name || !opt.batch_id)
                          return (
                            <tr key={`${opt.course_id}-${opt.batch_id || idx}`} className={isSelected ? 'table-primary' : ''}>
                              <td>
                                <strong className="text-primary d-block">{opt.course_code} {opt.course_name}</strong>
                                <small className="text-muted">{opt.course_type} &bull; {opt.duration_weeks} Weeks</small>
                              </td>
                              <td><span className="badge bg-secondary-subtle text-dark border">{opt.trade_name}</span></td>
                              <td><span className="badge bg-primary-subtle text-primary border fw-semibold">{opt.batch_name}</span></td>
                              <td>
                                <small className="fw-semibold text-dark d-block">{opt.instructor_name}</small>
                                <small className="text-muted">{opt.instructor_rank || ''}</small>
                              </td>
                              <td><small className="text-muted">{opt.classroom_name}</small></td>
                              <td><small>{formatDate(opt.start_date)}</small></td>
                              <td><small>{formatDate(opt.end_date)}</small></td>
                              <td>
                                <span className={`badge bg-${opt.status === 'Active' ? 'success' : 'secondary'}-subtle text-${opt.status === 'Active' ? 'success' : 'secondary'} border`}>
                                  {opt.status}
                                </span>
                              </td>
                              <td className="text-end">
                                {isSelected ? (
                                  <span className="badge bg-primary py-1.5 px-2">
                                    <i className="bi bi-check2 me-1"></i> Selected
                                  </span>
                                ) : (
                                  <button 
                                    type="button" 
                                    className="btn btn-outline-primary btn-sm py-0.5 px-2 fw-semibold"
                                    onClick={() => handleSelectCourseOption(opt)}
                                  >
                                    Enroll
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>


          {/* Section 2: Personal details */}
          <h5 className="mb-3 display-font text-primary border-bottom pb-2">2. Personal & Contact Particulars</h5>
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <label className="form-label fw-semibold">Date of Birth *</label>
              <input 
                type="date" 
                className="form-control" 
                name="dob"
                value={formData.dob}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="col-md-2">
              <label className="form-label fw-semibold">Gender *</label>
              <select className="form-select" name="gender" value={formData.gender} onChange={handleInputChange} required>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label fw-semibold">Blood Group *</label>
              <select className="form-select" name="blood_group" value={formData.blood_group} onChange={handleInputChange} required>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label fw-semibold">Medical Class Code</label>
              <input 
                type="text" 
                className="form-control" 
                name="medical_category"
                value={formData.medical_category}
                onChange={handleInputChange}
                placeholder="A4G4"
              />
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">Religion *</label>
              <input 
                type="text" 
                className="form-control" 
                name="religion"
                value={formData.religion}
                onChange={handleInputChange}
                required
                placeholder="e.g. Buddhist"
              />
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">Nationality</label>
              <input 
                type="text" 
                className="form-control" 
                name="nationality"
                value={formData.nationality}
                onChange={handleInputChange}
                placeholder="Sri Lankan"
              />
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">Personal Phone</label>
              <input 
                type="text" 
                className="form-control" 
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="0771234567"
              />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold">Email Address</label>
              <input 
                type="email" 
                className="form-control" 
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="trainee@slaf.gov.lk"
              />
            </div>
          </div>

          {/* Section 3: Address & Emergency Particulars */}
          <h5 className="mb-3 display-font text-primary border-bottom pb-2">3. Address & Emergency Contacts</h5>
          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <label className="form-label fw-semibold">Permanent Address *</label>
              <textarea 
                className="form-control" 
                name="permanent_address" 
                value={formData.permanent_address}
                onChange={handleInputChange}
                rows="2"
                required
                placeholder="Full permanent residential address"
              ></textarea>
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">Temporary / Boarding Address</label>
              <textarea 
                className="form-control" 
                name="temporary_address" 
                value={formData.temporary_address}
                onChange={handleInputChange}
                rows="2"
                placeholder="Temporary or local contact address"
              ></textarea>
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold">Emergency Contact Name *</label>
              <input 
                type="text" 
                className="form-control" 
                name="emergency_contact_name"
                value={formData.emergency_contact_name}
                onChange={handleInputChange}
                required
                placeholder="Next of Kin / Contact Person"
              />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold">Emergency Contact Phone *</label>
              <input 
                type="text" 
                className="form-control" 
                name="emergency_contact_phone"
                value={formData.emergency_contact_phone}
                onChange={handleInputChange}
                required
                placeholder="0711234567"
              />
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">Profile Photo</label>
              <input 
                key={fileInputKey}
                type="file" 
                className="form-control" 
                onChange={handleFileChange}
                accept="image/*"
              />
              <small className="text-muted">Maximum file size: 2MB. Jpeg, png formats only.</small>
            </div>
            
            {isEdit && (
              <div className="col-md-3">
                <label className="form-label fw-semibold text-danger">Trainee Status</label>
                <select className="form-select border-danger text-danger" name="status" value={formData.status} onChange={handleInputChange}>
                  {statuses.map(st => (
                    <option key={st.id || st.code} value={st.label}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="d-flex flex-column flex-sm-row justify-content-end gap-2 mt-4">
            {!isEdit ? (
              <>
                <button 
                  type="button" 
                  onClick={(e) => handleSubmit(e, 'save_and_new')}
                  className="btn btn-outline-primary px-4 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-xs w-100 w-sm-auto"
                  disabled={loading}
                >
                  <i className="bi bi-person-plus-fill"></i>
                  {loading && submitMode === 'save_and_new' ? 'Saving Trainee...' : 'Save & Add Another Trainee'}
                </button>
                <button 
                  type="button" 
                  onClick={(e) => handleSubmit(e, 'save_and_view')}
                  className="btn btn-primary px-4 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-xs w-100 w-sm-auto"
                  disabled={loading}
                >
                  <i className="bi bi-check-circle-fill"></i>
                  {loading && submitMode === 'save_and_view' ? 'Saving Trainee...' : 'Save & View Profile'}
                </button>
              </>
            ) : (
              <button 
                type="submit" 
                className="btn btn-primary px-5 py-2 fw-semibold w-100 w-sm-auto"
                disabled={loading}
              >
                {loading ? 'Saving Trainee Profile...' : 'Save Trainee Profile'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
export default StudentForm
