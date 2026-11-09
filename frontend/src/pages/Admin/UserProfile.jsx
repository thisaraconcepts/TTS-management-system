import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'

export const UserProfile = () => {
  const { user, setUser } = useAuth()
  const [activeTab, setActiveTab] = useState('info') // info, security, permissions, login-history

  // Contact Form
  const [email, setEmail] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [fullName, setFullName] = useState('')

  // Password Change Form
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Avatar Upload
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)

  // Login History
  const [myLogins, setMyLogins] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      setEmail(user.email || '')
      setMobileNumber(user.mobile_number || '')
      setFullName(user.full_name || '')
      setAvatarPreview(user.profile_photo || null)
    }
  }, [user])

  const loadMyLogins = async () => {
    if (!user) return
    try {
      setLoading(true)
      const res = await axios.get('/api/v1/system/login-history', { params: { username: user.username } })
      setMyLogins(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'login-history') {
      loadMyLogins()
    }
  }, [activeTab])

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    try {
      const res = await axios.put('/api/v1/auth/profile', {
        email,
        mobile_number: mobileNumber,
        full_name: fullName
      })
      setUser(res.data)
      toast.success('Contact profile updated successfully')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update profile')
    }
  }

  const handleAvatarFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleUploadAvatar = async () => {
    if (!avatarFile) return toast.warning('Please select an image file first')
    const formData = new FormData()
    formData.append('file', avatarFile)

    try {
      const res = await axios.post('/api/v1/auth/upload-avatar', formData)
      toast.success('Profile avatar updated successfully')
      if (res.data.profile_photo) {
        setUser({ ...user, profile_photo: res.data.profile_photo })
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to upload profile photo')
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      return toast.error('New password and confirmation password do not match')
    }

    try {
      await axios.post('/api/v1/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword
      })
      toast.success('Password changed successfully')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to change password')
    }
  }

  // Password Policy Rules Checker
  const checkPasswordRules = (pw) => {
    return {
      length: pw.length >= 12,
      upper: /[A-Z]/.test(pw),
      lower: /[a-z]/.test(pw),
      digit: /[0-9]/.test(pw),
      special: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?/]/.test(pw)
    }
  }

  const rules = checkPasswordRules(newPassword)
  const isPasswordValid = Object.values(rules).every(Boolean) && newPassword === confirmPassword

  if (!user) return <div className="p-5 text-center"><div className="spinner-border text-primary"></div></div>

  return (
    <div className="fade-in-slide">
      {/* Profile Header Banner */}
      <div className="card slaf-card p-4 mb-4">
        <div className="d-flex flex-column flex-md-row align-items-center gap-4">
          <div className="position-relative flex-shrink-0">
            {avatarPreview ? (
              <img src={avatarPreview} alt={user.username} className="rounded-circle object-fit-cover border border-3 border-primary shadow" style={{ width: '100px', height: '100px' }} />
            ) : (
              <div className="d-inline-flex bg-primary-subtle text-primary rounded-circle align-items-center justify-content-center border border-3 border-primary shadow" style={{ width: '100px', height: '100px' }}>
                <i className="bi bi-person-fill" style={{ fontSize: '3rem' }}></i>
              </div>
            )}
          </div>

          <div className="flex-grow-1 text-center text-md-start">
            <div className="d-flex flex-column flex-md-row align-items-center gap-2 mb-1">
              <h3 className="mb-0 fw-bold text-body display-font">{user.full_name}</h3>
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2.5 py-1 fw-semibold">
                {user.rank || 'N/A'}
              </span>
            </div>

            <p className="text-muted mb-2">
              <strong>@{user.username}</strong> • {user.email} • Service No: <strong>{user.service_number || 'N/A'}</strong>
            </p>

            <div className="d-flex flex-wrap gap-2 justify-content-center justify-content-md-start">
              <span className="badge bg-secondary-subtle text-dark border"><i className="bi bi-building me-1"></i> {user.department || 'Discipline Section'}</span>
              <span className="badge bg-info-subtle text-dark border"><i className="bi bi-briefcase me-1"></i> {user.designation || 'Staff Officer'}</span>
              <span className="badge bg-warning-subtle text-dark border"><i className="bi bi-shield-check me-1"></i> Role: {user.role?.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs slaf-tabs nav-tabs-responsive mb-4">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'info' ? 'active fw-bold' : ''}`} onClick={() => setActiveTab('info')}>
            <i className="bi bi-person-vcard me-1.5"></i> Contact & Profile
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'security' ? 'active fw-bold' : ''}`} onClick={() => setActiveTab('security')}>
            <i className="bi bi-key-fill me-1.5"></i> Security & Password
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'permissions' ? 'active fw-bold' : ''}`} onClick={() => setActiveTab('permissions')}>
            <i className="bi bi-shield-lock me-1.5"></i> Effective Permissions
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'login-history' ? 'active fw-bold' : ''}`} onClick={() => setActiveTab('login-history')}>
            <i className="bi bi-clock-history me-1.5"></i> My Login History
          </button>
        </li>
      </ul>

      {/* TAB 1: CONTACT & AVATAR */}
      {activeTab === 'info' && (
        <div className="row g-4 fade-in-slide">
          <div className="col-md-7">
            <div className="card slaf-card p-4">
              <h5 className="mb-3 display-font border-bottom pb-2">Update Personal Contact Information</h5>
              <form onSubmit={handleUpdateProfile}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Full Name</label>
                  <input type="text" className="form-control" value={fullName} onChange={e => setFullName(e.target.value)} required />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Email Address</label>
                  <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Mobile Phone Number</label>
                  <input type="text" className="form-control" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} placeholder="+94 7X XXX XXXX" />
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="form-label text-muted small">Service Number (Immutable)</label>
                    <input type="text" className="form-control form-control-sm bg-light" value={user.service_number || 'N/A'} disabled />
                  </div>
                  <div className="col-6">
                    <label className="form-label text-muted small">Rank (Immutable)</label>
                    <input type="text" className="form-control form-control-sm bg-light" value={user.rank || 'N/A'} disabled />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-sm fw-semibold w-100 w-sm-auto">
                  <i className="bi bi-check-circle me-1.5"></i> Save Profile Details
                </button>
              </form>
            </div>
          </div>

          <div className="col-md-5">
            <div className="card slaf-card p-4">
              <h5 className="mb-3 display-font border-bottom pb-2">Profile Avatar Picture</h5>
              <p className="text-muted small">Upload an official avatar photo (Formats: JPG, PNG, WEBP max 2MB).</p>

              <div className="mb-3 text-center">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="rounded-circle object-fit-cover border p-1" style={{ width: '120px', height: '120px' }} />
                ) : (
                  <div className="d-inline-flex bg-light text-muted rounded-circle align-items-center justify-content-center border" style={{ width: '120px', height: '120px' }}>
                    <i className="bi bi-camera fs-1"></i>
                  </div>
                )}
              </div>

              <div className="mb-3">
                <input type="file" className="form-control form-control-sm" accept="image/*" onChange={handleAvatarFileChange} />
              </div>
              <button className="btn btn-outline-primary btn-sm w-100 fw-semibold" onClick={handleUploadAvatar} disabled={!avatarFile}>
                <i className="bi bi-cloud-arrow-up me-1.5"></i> Upload Profile Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SECURITY & PASSWORD CHANGE */}
      {activeTab === 'security' && (
        <div className="row g-4 fade-in-slide">
          <div className="col-md-7">
            <div className="card slaf-card p-4">
              <h5 className="mb-3 display-font border-bottom pb-2">Change Account Password</h5>
              <form onSubmit={handlePasswordChange}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Current Password</label>
                  <input type="password" className="form-control" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">New Password</label>
                  <input type="password" className="form-control" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Confirm New Password</label>
                  <input type="password" className="form-control" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <small className="text-danger mt-1 d-block"><i className="bi bi-x-circle me-1"></i> Passwords do not match!</small>
                  )}
                </div>

                <button type="submit" className="btn btn-warning btn-sm fw-semibold text-dark w-100 w-sm-auto" disabled={!isPasswordValid}>
                  <i className="bi bi-key-fill me-1.5"></i> Update Account Password
                </button>
              </form>
            </div>
          </div>

          <div className="col-md-5">
            <div className="card slaf-card p-4">
              <h5 className="mb-3 display-font border-bottom pb-2">Security Policy Compliance</h5>
              <p className="text-muted small mb-3">Your password must satisfy all enterprise cybersecurity requirements:</p>

              <div className="list-group list-group-flush mb-3" style={{ fontSize: '0.85rem' }}>
                <div className={`list-group-item d-flex justify-content-between align-items-center py-2 ${rules.length ? 'text-success' : 'text-muted'}`}>
                  <span><i className={`bi bi-${rules.length ? 'check-circle-fill me-2' : 'circle me-2'}`}></i> Minimum 12 Characters</span>
                  <span className="badge bg-light text-dark">{newPassword.length} / 12</span>
                </div>
                <div className={`list-group-item d-flex justify-content-between align-items-center py-2 ${rules.upper ? 'text-success' : 'text-muted'}`}>
                  <span><i className={`bi bi-${rules.upper ? 'check-circle-fill me-2' : 'circle me-2'}`}></i> At least 1 Uppercase Letter (A-Z)</span>
                </div>
                <div className={`list-group-item d-flex justify-content-between align-items-center py-2 ${rules.lower ? 'text-success' : 'text-muted'}`}>
                  <span><i className={`bi bi-${rules.lower ? 'check-circle-fill me-2' : 'circle me-2'}`}></i> At least 1 Lowercase Letter (a-z)</span>
                </div>
                <div className={`list-group-item d-flex justify-content-between align-items-center py-2 ${rules.digit ? 'text-success' : 'text-muted'}`}>
                  <span><i className={`bi bi-${rules.digit ? 'check-circle-fill me-2' : 'circle me-2'}`}></i> At least 1 Number (0-9)</span>
                </div>
                <div className={`list-group-item d-flex justify-content-between align-items-center py-2 ${rules.special ? 'text-success' : 'text-muted'}`}>
                  <span><i className={`bi bi-${rules.special ? 'check-circle-fill me-2' : 'circle me-2'}`}></i> At least 1 Special Character (!@#$)</span>
                </div>
              </div>

              <div className="alert alert-info py-2 small mb-0">
                <i className="bi bi-shield-check me-1"></i> Passwords cannot match any of your 5 previously used passwords.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EFFECTIVE PERMISSIONS */}
      {activeTab === 'permissions' && (
        <div className="fade-in-slide">
          <div className="card slaf-card p-4">
            <h5 className="mb-3 display-font border-bottom pb-2">My Granted Effective Permissions</h5>
            <p className="text-muted small mb-3">Permissions inherited from your assigned role (<strong>{user.role?.name}</strong>) and direct account overrides:</p>

            <div className="row g-2">
              {user.effective_permissions && user.effective_permissions.length > 0 ? (
                user.effective_permissions.map(p => (
                  <div key={p.id} className="col-md-4 col-sm-6">
                    <div className="card p-2.5 bg-light border h-100">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <strong className="text-dark" style={{ fontSize: '0.85rem' }}>{p.name}</strong>
                        <span className="badge bg-primary-subtle text-primary border font-monospace" style={{ fontSize: '0.7rem' }}>{p.code}</span>
                      </div>
                      <small className="text-muted" style={{ fontSize: '0.75rem' }}>{p.description || 'Module function permission'}</small>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted py-4 text-center">No explicit permissions granted to this account.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MY LOGIN HISTORY */}
      {activeTab === 'login-history' && (
        <div className="fade-in-slide">
          <div className="card slaf-card p-0">
            <div className="table-responsive">
              <table className="table slaf-table mb-0">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>IP Address</th>
                    <th>Browser / User Agent</th>
                    <th>Login Time</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="4" className="text-center py-4"><div className="spinner-border text-primary"></div></td></tr>
                  ) : myLogins.length === 0 ? (
                    <tr><td colSpan="4" className="text-center py-4 text-muted">No personal login records available.</td></tr>
                  ) : (
                    myLogins.map(l => (
                      <tr key={l.id}>
                        <td>
                          {l.status === 'SUCCESS' && <span className="badge bg-success-subtle text-success border">SUCCESS</span>}
                          {l.status === 'FAILED' && <span className="badge bg-warning-subtle text-warning border">FAILED</span>}
                          {l.status === 'LOCKED' && <span className="badge bg-danger-subtle text-danger border">LOCKED</span>}
                        </td>
                        <td><small className="font-monospace text-muted">{l.ip_address || 'unknown'}</small></td>
                        <td><small className="text-muted" style={{ fontSize: '0.75rem' }}>{l.user_agent || '-'}</small></td>
                        <td><small className="text-muted">{new Date(l.created_at).toLocaleString()}</small></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserProfile
