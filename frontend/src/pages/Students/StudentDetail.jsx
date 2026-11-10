import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import { AcademicProgress } from './AcademicProgress'
import { PersonalOccurrenceReporting } from './PersonalOccurrenceReporting'
import { ClassicalReportModal } from '../../components/ClassicalReportModal'
import { useAuth } from '../../context/AuthContext'

export const StudentDetail = () => {
  const { hasPermission } = useAuth()
  const { id } = useParams()
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showReportModal, setShowReportModal] = useState(false)

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const res = await axios.get(`/api/v1/students/${id}`)
        setStudent(res.data)
      } catch (err) {
        toast.error('Failed to load student details')
      } finally {
        setLoading(false)
      }
    }
    fetchStudent()
  }, [id])

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading student details...</span>
        </div>
      </div>
    )
  }

  if (!student) {
    return <div className="alert alert-danger">Trainee profile not found</div>
  }

  const handlePrintQR = () => {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>Trainee QR Badge - ${student.service_number}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 40px; }
            .badge-box { border: 2px solid #000; border-radius: 12px; padding: 20px; display: inline-block; width: 280px; }
            h2 { margin: 10px 0 5px 0; }
            p { margin: 5px 0; color: #444; }
            img { width: 180px; height: 180px; margin-top: 15px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="badge-box">
            <h2>SLAF TTS</h2>
            <p><strong>Service No:</strong> ${student.service_number}</p>
            <p><strong>Rank/Name:</strong> ${student.rank} ${student.initials}</p>
            <p><strong>Trade:</strong> ${student.trade}</p>
            <img src="${student.qr_code_data}" alt="QR code" />
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="fade-in-slide">
      <div className="page-header">
        <div>
          <span className="page-eyebrow">Trainee record</span>
          <h2 className="page-title">{student.full_name || `${student.rank} ${student.initials}`}</h2>
          <p className="page-subtitle">Service number {student.service_number}</p>
        </div>
        <div className="d-flex gap-2 flex-wrap w-100 w-sm-auto justify-content-start justify-content-sm-end">
          {hasPermission('student:write') && (
            <Link to="/students/new" className="btn btn-primary btn-sm d-flex align-items-center gap-1.5 shadow-xs">
              <i className="bi bi-person-plus-fill"></i> Add Trainee
            </Link>
          )}
          <Link to="/students" className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5">
            <i className="bi bi-arrow-left"></i> List
          </Link>
          <button className="btn btn-outline-dark btn-sm d-flex align-items-center gap-1.5 fw-semibold shadow-xs" onClick={() => setShowReportModal(true)}>
            <i className="bi bi-file-earmark-text text-primary"></i> Dossier
          </button>
          <button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1.5" onClick={handlePrintQR}>
            <i className="bi bi-qr-code"></i> QR Card
          </button>
        </div>
      </div>

      <div className="row g-4">
        {/* Profile Card Header */}
        <div className="col-lg-4 col-md-12">
          <div className="card slaf-card p-4 text-center">
            <div className="position-relative mx-auto mb-3" style={{ width: '120px', height: '120px' }}>
              {student.profile_photo_path ? (
                <img
                  src={student.profile_photo_path}
                  alt="Student Profile"
                  className="rounded-circle border border-primary border-3 w-100 h-100 object-fit-cover"
                />
              ) : (
                <div className="d-flex bg-primary-subtle text-primary rounded-circle align-items-center justify-content-center border border-primary border-3 w-100 h-100">
                  <i className="bi bi-person-fill" style={{ fontSize: '4rem' }}></i>
                </div>
              )}
            </div>
            <h4 className="mb-1 display-font text-dark fw-bold text-capitalize">{student.full_name || `${student.rank} ${student.initials}`}</h4>
            <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
              <span className="badge bg-secondary-subtle text-dark border px-2.5 py-1 fw-semibold" style={{ fontSize: '0.8rem' }}>{student.rank}</span>
              {student.initials && <span className="text-muted fw-medium small">({student.initials})</span>}
            </div>
            <span className={`slaf-badge mb-4 ${student.status.toLowerCase().replace(' ', '-')}`}>
              {student.status}
            </span>

            <hr className="opacity-25" />

            <div className="mt-3">
              <h6 className="text-start fw-semibold text-muted text-uppercase mb-3" style={{ fontSize: '0.75rem' }}>Digital QR Badge</h6>
              <img
                src={student.qr_code_data}
                alt="Validation QR Code"
                className="img-fluid border p-2 bg-white mb-2"
                style={{ width: '150px' }}
              />
              <p className="text-muted" style={{ fontSize: '0.7rem' }}>SLAF TTS Identity Authentication System</p>
            </div>
          </div>
        </div>

        {/* Detailed Trainee Information */}
        <div className="col-lg-8 col-md-12">
          <div className="card slaf-card p-4">
            <h5 className="mb-4 display-font border-bottom pb-2">Military Service Details</h5>
            <div className="row g-3 mb-4">
              <div className="col-md-6 col-sm-12">
                <span className="text-muted d-block" style={{ fontSize: '0.8rem' }}>Service Number</span>
                <span className="fw-semibold">{student.service_number}</span>
              </div>
              <div className="col-md-6 col-sm-12">
                <span className="text-muted d-block" style={{ fontSize: '0.8rem' }}>Rank & Trade</span>
                <span className="fw-semibold">{student.rank} - {student.trade}</span>
              </div>
              <div className="col-md-6 col-sm-12">
                <span className="text-muted d-block" style={{ fontSize: '0.8rem' }}>Course Details</span>
                <span className="fw-semibold text-primary">{student.course_name || 'Unassigned'}</span>
              </div>
              <div className="col-md-6 col-sm-12">
                <span className="text-muted d-block" style={{ fontSize: '0.8rem' }}>Batch / Intake</span>
                <span className="fw-semibold">{student.batch}</span>
              </div>
              <div className="col-md-6 col-sm-12">
                <span className="text-muted d-block" style={{ fontSize: '0.8rem' }}>Enlistment Date</span>
                <span className="fw-semibold">{new Date(student.joining_date).toLocaleDateString()}</span>
              </div>
            </div>

            <h5 className="mb-4 display-font border-bottom pb-2">Personal & Emergency Details</h5>
            <div className="row g-3 mb-4">
              <div className="col-md-6 col-sm-12">
                <span className="text-muted d-block" style={{ fontSize: '0.8rem' }}>NIC Number</span>
                <span className="fw-semibold">{student.nic}</span>
              </div>
              <div className="col-md-6 col-sm-12">
                <span className="text-muted d-block" style={{ fontSize: '0.8rem' }}>Date of Birth / Gender</span>
                <span className="fw-semibold">{new Date(student.dob).toLocaleDateString()} / {student.gender}</span>
              </div>
              <div className="col-md-6 col-sm-12">
                <span className="text-muted d-block" style={{ fontSize: '0.8rem' }}>Blood Group & Medical category</span>
                <span className="fw-semibold text-danger">{student.blood_group}</span> <span className="badge bg-secondary ms-1">{student.medical_category}</span>
              </div>
              <div className="col-md-6 col-sm-12">
                <span className="text-muted d-block" style={{ fontSize: '0.8rem' }}>Contact Number / Email</span>
                <span className="fw-semibold">{student.phone || 'N/A'} / {student.email || 'N/A'}</span>
              </div>
              <div className="col-md-6 col-sm-12">
                <span className="text-muted d-block" style={{ fontSize: '0.8rem' }}>Emergency Contact Name</span>
                <span className="fw-semibold">{student.emergency_contact_name}</span>
              </div>
              <div className="col-md-6 col-sm-12">
                <span className="text-muted d-block" style={{ fontSize: '0.8rem' }}>Emergency Contact Phone</span>
                <span className="fw-semibold text-primary">{student.emergency_contact_phone}</span>
              </div>
              <div className="col-12">
                <span className="text-muted d-block" style={{ fontSize: '0.8rem' }}>Permanent Address</span>
                <span className="fw-semibold">{student.permanent_address}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Academic Progress Section */}
        <div className="col-12 mt-4">
          <AcademicProgress studentId={id} />
        </div>

        {/* Personal Occurrence Reporting Section */}
        <div className="col-12 mt-2">
          <PersonalOccurrenceReporting initialTraineeId={id} />
        </div>
      </div>

      {/* Classical Formal Trainee Dossier Modal */}
      <ClassicalReportModal
        show={showReportModal}
        onClose={() => setShowReportModal(false)}
        title={`OFFICIAL TRAINEE DOSSIER — ${student.rank || ''} ${student.full_name || ''} (${student.service_number})`}
        endpoint="/api/v1/reports/students"
        params={{
          search: student.service_number
        }}
        defaultOrientation="portrait"
      />
    </div>
  )
}
export default StudentDetail


