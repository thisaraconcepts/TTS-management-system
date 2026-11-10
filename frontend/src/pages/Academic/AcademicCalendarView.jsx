import React, { useState, useEffect, useRef, useCallback } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import axios from 'axios'
import { toast } from 'react-toastify'

export const AcademicCalendarView = ({ onNavigate }) => {
  const calendarRef = useRef(null)

  // Master Filter Options
  const [trades, setTrades] = useState([])
  const [courses, setCourses] = useState([])
  const [batches, setBatches] = useState([])
  const [instructors, setInstructors] = useState([])

  // Filter Selection States
  const [selectedTrade, setSelectedTrade] = useState('')
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('')
  const [selectedInstructor, setSelectedInstructor] = useState('')
  const [instructorStatus, setInstructorStatus] = useState('ALL')

  // Calendar State
  const [calendarView, setCalendarView] = useState('dayGridMonth')
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [dateTitle, setDateTitle] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  // Modal State
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Helper date formatter
  const formatDateDDMMYYYY = (dateStr) => {
    if (!dateStr) return 'N/A'
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`
    }
    return dateStr
  }

  // Fetch filter dropdown data on mount
  useEffect(() => {
    fetchFilterMasters()
  }, [])

  const fetchFilterMasters = async () => {
    try {
      const [tRes, cRes, bRes, iRes] = await Promise.all([
        axios.get('/api/v1/academic/trades'),
        axios.get('/api/v1/academic/courses'),
        axios.get('/api/v1/academic/batches'),
        axios.get('/api/v1/academic/instructors/active')
      ])
      setTrades(tRes.data || [])
      setCourses(cRes.data || [])
      setBatches(bRes.data || [])
      setInstructors(iRes.data || [])
    } catch (err) {
      console.error('Failed to load filter dropdowns', err)
    }
  }

  // Fetch calendar events based on date range & filters
  const fetchCalendarEvents = useCallback(async (startStr, endStr) => {
    if (!startStr || !endStr) return
    setLoading(true)
    try {
      const params = {
        start_date: startStr,
        end_date: endStr
      }
      if (selectedTrade) params.trade_id = selectedTrade
      if (selectedCourse) params.course_id = selectedCourse
      if (selectedBatch) params.batch_id = selectedBatch
      if (selectedInstructor) params.instructor_id = selectedInstructor
      if (instructorStatus && instructorStatus !== 'ALL') params.instructor_status = instructorStatus

      const res = await axios.get('/api/v1/academic/dashboard/calendar', { params })
      const rawEvents = res.data.events || []

      // Map backend events to FullCalendar event objects
      const fcEvents = rawEvents.map(e => {
        // FullCalendar end date is exclusive for multi-day events
        const endDateObj = new Date(e.end_date)
        endDateObj.setDate(endDateObj.getDate() + 1)
        const exclusiveEndStr = endDateObj.toISOString().split('T')[0]

        const isUnassigned = e.instructor_status === 'NOT_ASSIGNED'

        return {
          id: e.id,
          title: e.activity,
          start: e.start_date,
          end: exclusiveEndStr,
          allDay: true,
          backgroundColor: isUnassigned ? 'var(--tint-warning)' : 'var(--tint-primary)',
          borderColor: isUnassigned ? '#b26a00' : '#2f6f86',
          textColor: isUnassigned ? '#8f5500' : '#245a6e',
          extendedProps: {
            ...e,
            displayStartDate: e.start_date,
            displayEndDate: e.end_date
          }
        }
      })

      setEvents(fcEvents)
    } catch (err) {
      console.error('Failed to fetch dashboard calendar events', err)
      toast.error('Failed to load calendar events.')
    } finally {
      setLoading(false)
    }
  }, [selectedTrade, selectedCourse, selectedBatch, selectedInstructor, instructorStatus])

  // Re-fetch events whenever dateRange or filters change
  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      fetchCalendarEvents(dateRange.start, dateRange.end)
    }
  }, [dateRange, fetchCalendarEvents])

  // Handle FullCalendar datesSet callback (fires when view/dates change)
  const handleDatesSet = (dateInfo) => {
    const startStr = dateInfo.startStr.split('T')[0]
    const endStr = dateInfo.endStr.split('T')[0]
    setDateTitle(dateInfo.view.title)
    setDateRange({ start: startStr, end: endStr })
  }

  // Navigation button handlers
  const handlePrev = () => {
    if (calendarRef.current) {
      const api = calendarRef.current.getApi()
      api.prev()
    }
  }

  const handleNext = () => {
    if (calendarRef.current) {
      const api = calendarRef.current.getApi()
      api.next()
    }
  }

  const handleToday = () => {
    if (calendarRef.current) {
      const api = calendarRef.current.getApi()
      api.today()
    }
  }

  const handleViewChange = (viewName) => {
    setCalendarView(viewName)
    if (calendarRef.current) {
      const api = calendarRef.current.getApi()
      api.changeView(viewName)
    }
  }

  const handleResetFilters = () => {
    setSelectedTrade('')
    setSelectedCourse('')
    setSelectedBatch('')
    setSelectedInstructor('')
    setInstructorStatus('ALL')
  }

  // Event Click Handler -> Open Modal
  const handleEventClick = (clickInfo) => {
    setSelectedEvent(clickInfo.event.extendedProps)
    setShowDetailModal(true)
  }

  // Navigate to Course Calendar Management for Editing
  const handleEditActivity = () => {
    if (!selectedEvent) return
    setShowDetailModal(false)
    if (onNavigate) {
      onNavigate('calendar', {
        courseId: selectedEvent.course_id,
        entryId: selectedEvent.id
      })
    }
  }

  // Render concise custom event content inside calendar grid
  const renderEventContent = (eventInfo) => {
    const props = eventInfo.event.extendedProps
    const isUnassigned = props.instructor_status === 'NOT_ASSIGNED'

    const formatShortDate = (str) => {
      if (!str) return ''
      const d = new Date(str)
      return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' })
    }

    const startFormatted = formatShortDate(props.start_date)
    const endFormatted = formatShortDate(props.end_date)
    const dateRangeStr = props.start_date === props.end_date 
      ? startFormatted 
      : `${startFormatted} – ${endFormatted}`

    return (
      <div className="p-1 overflow-hidden" style={{ fontSize: '0.75rem', lineHeight: '1.25' }}>
        <div className="fw-bold text-truncate" title={props.activity}>
          {props.activity}
        </div>
        <div className="text-truncate opacity-90 text-dark" style={{ fontSize: '0.7rem' }}>
          {props.course_name}
        </div>
        <div className="d-flex align-items-center justify-content-between mt-1 pt-0.5 border-top border-secondary border-opacity-25" style={{ fontSize: '0.675rem' }}>
          <span className="fw-semibold"><i className="bi bi-clock me-1"></i>{dateRangeStr}</span>
          {isUnassigned ? (
            <span className="badge bg-warning text-dark fw-bold px-1 py-0.5" style={{ fontSize: '0.6rem' }}>
              UNASSIGNED
            </span>
          ) : (
            <span className="text-truncate ms-1 text-primary fw-semibold" title={props.instructor_name}>
              {props.instructor_name}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="card slaf-card shadow-sm border-0 mb-4">
      {/* Calendar Header Bar */}
      <div className="card-header bg-white py-3 border-bottom">
        <div className="row align-items-center g-3">
          {/* Title & Date Header */}
          <div className="col-12 col-md-4">
            <div className="d-flex align-items-center gap-2">
              <div className="bg-primary-subtle text-primary rounded p-2 d-inline-flex flex-shrink-0">
                <i className="bi bi-calendar3 fs-4"></i>
              </div>
              <div className="min-w-0">
                <h5 className="fw-extrabold display-font text-dark mb-0 text-truncate">Course Calendar</h5>
                <span className="fw-bold text-primary display-font d-block text-truncate" style={{ fontSize: '1rem' }}>
                  {dateTitle || 'Academic Schedule'}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="col-6 col-md-4 text-start text-md-center">
            <div className="btn-group shadow-sm me-2" role="group">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handlePrev} title="Previous">
                <i className="bi bi-chevron-left"></i>
              </button>
              <button type="button" className="btn btn-outline-secondary btn-sm fw-semibold" onClick={handleToday}>
                Today
              </button>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleNext} title="Next">
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>

            {loading && (
              <span className="spinner-border spinner-border-sm text-primary align-middle ms-1" role="status"></span>
            )}
          </div>

          {/* View Switcher Buttons */}
          <div className="col-6 col-md-4 text-end">
            <div className="btn-group shadow-sm" role="group">
              <button
                type="button"
                className={`btn btn-sm ${calendarView === 'dayGridMonth' ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`}
                onClick={() => handleViewChange('dayGridMonth')}
              >
                Month
              </button>
              <button
                type="button"
                className={`btn btn-sm ${calendarView === 'dayGridWeek' ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`}
                onClick={() => handleViewChange('dayGridWeek')}
              >
                Week
              </button>
              <button
                type="button"
                className={`btn btn-sm ${calendarView === 'dayGridDay' ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`}
                onClick={() => handleViewChange('dayGridDay')}
              >
                Day
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Filters Bar */}
        <div className="row g-2 mt-3 pt-3 border-top bg-light rounded-3 p-2 mx-0">
          {/* Trade Filter */}
          <div className="col-12 col-sm-6 col-lg-2">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.7rem' }}>TRADE</label>
            <select
              className="form-select form-select-sm"
              value={selectedTrade}
              onChange={(e) => {
                setSelectedTrade(e.target.value)
                setSelectedCourse('')
              }}
            >
              <option value="">All Trades</option>
              {trades.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Course Filter */}
          <div className="col-12 col-sm-6 col-lg-3">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.7rem' }}>COURSE</label>
            <select
              className="form-select form-select-sm"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
            >
              <option value="">All Courses</option>
              {(selectedTrade ? courses.filter(c => c.trade_id === selectedTrade) : courses).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Batch Filter */}
          <div className="col-12 col-sm-6 col-lg-2">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.7rem' }}>BATCH</label>
            <select
              className="form-select form-select-sm"
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
            >
              <option value="">All Batches</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Instructor Filter */}
          <div className="col-12 col-sm-6 col-lg-2">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.7rem' }}>INSTRUCTOR</label>
            <select
              className="form-select form-select-sm"
              value={selectedInstructor}
              onChange={(e) => setSelectedInstructor(e.target.value)}
            >
              <option value="">All Instructors</option>
              {instructors.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.display_name}</option>
              ))}
            </select>
          </div>

          {/* Instructor Status Filter */}
          <div className="col-6 col-sm-6 col-lg-2">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.7rem' }}>STATUS</label>
            <select
              className="form-select form-select-sm"
              value={instructorStatus}
              onChange={(e) => setInstructorStatus(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="NOT_ASSIGNED">Not Assigned</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          <div className="col-6 col-sm-12 col-lg-1 d-flex align-items-end">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm w-100 fw-semibold"
              onClick={handleResetFilters}
              title="Reset Filters"
            >
              <i className="bi bi-x-circle me-1"></i>Reset
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="card-body p-3">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={false}
          events={events}
          eventContent={renderEventContent}
          eventClick={handleEventClick}
          datesSet={handleDatesSet}
          height="auto"
          dayMaxEvents={3}
          eventDisplay="block"
        />
      </div>

      {/* Complete Event Details Modal */}
      {showDetailModal && selectedEvent && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-primary text-white py-3">
                <div className="d-flex align-items-center gap-2 min-w-0">
                  <i className="bi bi-info-circle-fill fs-5 flex-shrink-0"></i>
                  <h5 className="modal-title fw-bold text-truncate">Course Calendar Event Details</h5>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowDetailModal(false)}></button>
              </div>

              <div className="modal-body p-3 p-md-4">
                {/* Event Header Banner */}
                <div className={`p-3 rounded mb-4 border ${selectedEvent.instructor_status === 'NOT_ASSIGNED' ? 'bg-warning-subtle border-warning' : 'bg-light border-primary-subtle'}`}>
                  <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2">
                    <div>
                      <span className="badge bg-primary text-white mb-1">{selectedEvent.trade_name || 'General Trade'}</span>
                      <h4 className="fw-extrabold text-dark mb-1 fs-5 fs-md-4">{selectedEvent.activity}</h4>
                      <p className="text-secondary fw-semibold mb-0 small">
                        {selectedEvent.course_name} ({selectedEvent.course_code})
                      </p>
                    </div>
                    <div>
                      {selectedEvent.instructor_status === 'NOT_ASSIGNED' ? (
                        <span className="badge bg-danger text-white px-2.5 py-1.5 fw-bold shadow-sm" style={{ fontSize: '0.75rem' }}>
                          <i className="bi bi-exclamation-triangle-fill me-1"></i> INSTRUCTOR NOT ASSIGNED
                        </span>
                      ) : (
                        <span className="badge bg-success text-white px-2.5 py-1.5 fw-bold shadow-sm" style={{ fontSize: '0.75rem' }}>
                          <i className="bi bi-person-check-fill me-1"></i> ASSIGNED
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Information Grid */}
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded border h-100">
                      <h6 className="fw-bold text-dark border-bottom pb-2 mb-3">
                        <i className="bi bi-book me-2 text-primary"></i>Course & Batch Details
                      </h6>
                      <div className="mb-2">
                        <small className="text-muted d-block">Trade:</small>
                        <strong className="text-dark">{selectedEvent.trade_name || 'N/A'}</strong>
                      </div>
                      <div className="mb-2">
                        <small className="text-muted d-block">Course:</small>
                        <strong className="text-dark">{selectedEvent.course_name}</strong>
                      </div>
                      <div className="mb-0">
                        <small className="text-muted d-block">Batch:</small>
                        <strong className="text-dark">{selectedEvent.batch_name || 'N/A'}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded border h-100">
                      <h6 className="fw-bold text-dark border-bottom pb-2 mb-3">
                        <i className="bi bi-person-badge me-2 text-primary"></i>Instructor Details
                      </h6>
                      <div className="mb-2">
                        <small className="text-muted d-block">Instructor:</small>
                        <strong className={selectedEvent.instructor_status === 'NOT_ASSIGNED' ? 'text-danger fw-extrabold' : 'text-dark'}>
                          {selectedEvent.instructor_status === 'NOT_ASSIGNED' ? 'INSTRUCTOR NOT ASSIGNED' : selectedEvent.instructor_name}
                        </strong>
                      </div>
                      <div className="mb-0">
                        <small className="text-muted d-block">Assignment Status:</small>
                        <span className={`badge bg-${selectedEvent.instructor_status === 'ASSIGNED' ? 'success' : 'warning'}-subtle text-${selectedEvent.instructor_status === 'ASSIGNED' ? 'success' : 'dark'} border`}>
                          {selectedEvent.instructor_status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Schedule Metrics */}
                  <div className="col-12">
                    <div className="p-3 bg-light rounded border">
                      <h6 className="fw-bold text-dark border-bottom pb-2 mb-3">
                        <i className="bi bi-clock-history me-2 text-primary"></i>Schedule & Period Metrics
                      </h6>
                      <div className="row text-center g-2">
                        <div className="col-6 col-md-3">
                          <div className="p-2 bg-white rounded border">
                            <small className="text-muted d-block">Commencement</small>
                            <strong className="text-primary fs-6">{formatDateDDMMYYYY(selectedEvent.start_date)}</strong>
                          </div>
                        </div>
                        <div className="col-6 col-md-3">
                          <div className="p-2 bg-white rounded border">
                            <small className="text-muted d-block">Completion</small>
                            <strong className="text-primary fs-6">{formatDateDDMMYYYY(selectedEvent.end_date)}</strong>
                          </div>
                        </div>
                        <div className="col-4 col-md-2">
                          <div className="p-2 bg-white rounded border">
                            <small className="text-muted d-block">Theory</small>
                            <strong className="text-dark fs-6">{selectedEvent.theory_periods} hrs</strong>
                          </div>
                        </div>
                        <div className="col-4 col-md-2">
                          <div className="p-2 bg-white rounded border">
                            <small className="text-muted d-block">Practical</small>
                            <strong className="text-dark fs-6">{selectedEvent.practical_periods} hrs</strong>
                          </div>
                        </div>
                        <div className="col-4 col-md-2">
                          <div className="p-2 bg-white rounded border">
                            <small className="text-muted d-block">Total Periods</small>
                            <strong className="text-success fs-6">{selectedEvent.total_periods} hrs</strong>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-muted small">
                        <i className="bi bi-calendar-check me-1"></i>Working Days: <strong>{selectedEvent.working_days} Days</strong>
                      </div>
                    </div>
                  </div>

                  {/* Remarks Section */}
                  {selectedEvent.remarks && (
                    <div className="col-12">
                      <div className="p-3 bg-white rounded border border-warning">
                        <h6 className="fw-bold text-dark mb-1">
                          <i className="bi bi-chat-left-text me-2 text-warning"></i>Remarks & Nomination Notes
                        </h6>
                        <p className="mb-0 text-dark small white-space-pre-wrap">{selectedEvent.remarks}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="modal-footer bg-light py-2 d-flex flex-column-reverse flex-sm-row justify-content-end gap-2">
                <button type="button" className="btn btn-secondary btn-sm fw-semibold w-100 w-sm-auto" onClick={() => setShowDetailModal(false)}>
                  Close
                </button>
                <button type="button" className="btn btn-primary btn-sm fw-bold shadow-sm w-100 w-sm-auto" onClick={handleEditActivity}>
                  <i className="bi bi-pencil-square me-1"></i> Edit Calendar Activity
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AcademicCalendarView
