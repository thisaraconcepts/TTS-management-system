import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import { ClassicalReportModal } from '../../components/ClassicalReportModal'

export const UserManagement = () => {
  const { user: currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState('users') // users, roles, permissions, login-history, audit-logs, locked-accounts
  const [showReportModal, setShowReportModal] = useState(false)

  // Data states
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [loginLogs, setLoginLogs] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [lockedUsers, setLockedUsers] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters for Users
  const [userQuery, setUserQuery] = useState('')
  const [userRankFilter, setUserRankFilter] = useState('')
  const [userDeptFilter, setUserDeptFilter] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [userStatusFilter, setUserStatusFilter] = useState('')

  // User Modal states
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    service_number: '',
    rank: 'AC',
    full_name: '',
    mobile_number: '',
    department: 'Discipline Section',
    designation: 'Staff Officer',
    assigned_module: 'Student Details',
    password: '',
    role_id: 'role-instructor',
    is_active: true,
    must_change_password: false,
    direct_permission_ids: []
  })

  // Reset Password Modal
  const [showResetModal, setShowResetModal] = useState(false)
  const [targetResetUser, setTargetResetUser] = useState(null)
  const [resetPasswordVal, setResetPasswordVal] = useState('')
  const [forceChangeOnLogin, setForceChangeOnLogin] = useState(true)

  // Role Modal states
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permission_ids: []
  })
  const [isCloning, setIsCloning] = useState(false)

  // Login & Audit filters
  const [logSearchUser, setLogSearchUser] = useState('')
  const [logStatusFilter, setLogStatusFilter] = useState('')
  const [auditModuleFilter, setAuditModuleFilter] = useState('')

  // Dropdown states for interactive action menus
  const [openUserDropdownId, setOpenUserDropdownId] = useState(null)
  const [openRoleDropdownId, setOpenRoleDropdownId] = useState(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown')) {
        setOpenUserDropdownId(null)
        setOpenRoleDropdownId(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // ---------------------------------------------------------------------------
  // DATA LOADERS
  // ---------------------------------------------------------------------------
  const loadUsers = async () => {
    try {
      const params = {}
      if (userQuery) params.query = userQuery
      if (userRankFilter) params.rank = userRankFilter
      if (userDeptFilter) params.department = userDeptFilter
      if (userRoleFilter) params.role_id = userRoleFilter
      if (userStatusFilter) params.status = userStatusFilter

      const res = await axios.get('/api/v1/system/users', { params })
      setUsers(res.data)
    } catch (err) {
      toast.error('Failed to load user accounts')
    }
  }

  const loadRoles = async () => {
    try {
      const res = await axios.get('/api/v1/system/roles')
      setRoles(res.data)
    } catch (err) {
      toast.error('Failed to load system roles')
    }
  }

  const loadPermissions = async () => {
    try {
      const res = await axios.get('/api/v1/system/permissions')
      setPermissions(res.data)
    } catch (err) {
      toast.error('Failed to load permissions catalog')
    }
  }

  const loadLoginHistory = async () => {
    try {
      const params = {}
      if (logSearchUser) params.username = logSearchUser
      if (logStatusFilter) params.status = logStatusFilter
      const res = await axios.get('/api/v1/system/login-history', { params })
      setLoginLogs(res.data)
    } catch (err) {
      toast.error('Failed to load login history')
    }
  }

  const loadAuditLogs = async () => {
    try {
      const params = {}
      if (logSearchUser) params.username = logSearchUser
      if (auditModuleFilter) params.module = auditModuleFilter
      const res = await axios.get('/api/v1/system/audit-logs', { params })
      setAuditLogs(res.data)
    } catch (err) {
      toast.error('Failed to load audit logs')
    }
  }

  const loadLockedAccounts = async () => {
    try {
      const res = await axios.get('/api/v1/system/locked-accounts')
      setLockedUsers(res.data)
    } catch (err) {
      toast.error('Failed to load locked accounts')
    }
  }

  const refreshAllData = async () => {
    setLoading(true)
    await Promise.all([
      loadUsers(),
      loadRoles(),
      loadPermissions(),
      loadLoginHistory(),
      loadAuditLogs(),
      loadLockedAccounts()
    ])
    setLoading(false)
  }

  useEffect(() => {
    refreshAllData()
  }, [])

  useEffect(() => {
    if (activeTab === 'users') loadUsers()
    if (activeTab === 'login-history') loadLoginHistory()
    if (activeTab === 'audit-logs') loadAuditLogs()
    if (activeTab === 'locked-accounts') loadLockedAccounts()
  }, [userQuery, userRankFilter, userDeptFilter, userRoleFilter, userStatusFilter, logSearchUser, logStatusFilter, auditModuleFilter, activeTab])

  // ---------------------------------------------------------------------------
  // USER ACTIONS
  // ---------------------------------------------------------------------------
  const handleOpenCreateUser = () => {
    setEditingUser(null)
    setUserForm({
      username: '',
      email: '',
      service_number: '',
      rank: 'Aircraftman',
      full_name: '',
      mobile_number: '',
      department: 'Discipline Section',
      designation: 'Staff Officer',
      assigned_module: 'Student Details',
      password: '',
      role_id: roles[0]?.id || 'role-instructor',
      is_active: true,
      must_change_password: true,
      direct_permission_ids: []
    })
    setShowUserModal(true)
  }

  const handleOpenEditUser = (u) => {
    setEditingUser(u)
    setUserForm({
      username: u.username,
      email: u.email,
      service_number: u.service_number || '',
      rank: u.rank || 'Aircraftman',
      full_name: u.full_name,
      mobile_number: u.mobile_number || '',
      department: u.department || 'Discipline Section',
      designation: u.designation || 'Staff Officer',
      assigned_module: u.assigned_module || 'Student Details',
      password: '',
      role_id: u.role_id,
      is_active: u.is_active,
      must_change_password: u.must_change_password || false,
      direct_permission_ids: (u.direct_permissions || []).map(p => p.id)
    })
    setShowUserModal(true)
  }

  const handleSaveUser = async (e) => {
    e.preventDefault()
    try {
      if (editingUser) {
        await axios.put(`/api/v1/system/users/${editingUser.id}`, userForm)
        toast.success(`User '${userForm.username}' updated successfully`)
      } else {
        await axios.post('/api/v1/system/users', userForm)
        toast.success(`New user '${userForm.username}' registered successfully`)
      }
      setShowUserModal(false)
      loadUsers()
      loadAuditLogs()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save user account')
    }
  }

  const handleSoftDeleteUser = async (u) => {
    if (!window.confirm(`Are you sure you want to soft-delete user account '${u.username}'?`)) return
    try {
      await axios.delete(`/api/v1/system/users/${u.id}`)
      toast.success(`User '${u.username}' soft-deleted successfully`)
      loadUsers()
      loadAuditLogs()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete user account')
    }
  }

  const handleToggleStatus = async (u) => {
    try {
      const res = await axios.post(`/api/v1/system/users/${u.id}/toggle-status`)
      toast.info(res.data.message)
      loadUsers()
    } catch (err) {
      toast.error('Failed to update account status')
    }
  }

  const handleUnlockAccount = async (user_id, username) => {
    try {
      await axios.post(`/api/v1/system/users/${user_id}/unlock`)
      toast.success(`Account '${username}' unlocked successfully`)
      loadUsers()
      loadLockedAccounts()
      loadAuditLogs()
    } catch (err) {
      toast.error('Failed to unlock user account')
    }
  }

  const handleRevokeSession = async (user_id, username) => {
    if (!window.confirm(`Are you sure you want to forcibly revoke session / log out user '${username}'?`)) return
    try {
      await axios.post(`/api/v1/system/users/${user_id}/revoke-session`)
      toast.success(`Active session for user '${username}' revoked successfully`)
      loadLoginHistory()
      loadAuditLogs()
    } catch (err) {
      toast.error('Failed to revoke user session')
    }
  }

  const handleAdminResetPassword = async (e) => {
    e.preventDefault()
    try {
      await axios.post(`/api/v1/system/users/${targetResetUser.id}/reset-password`, {
        new_password: resetPasswordVal,
        force_change_on_login: forceChangeOnLogin
      })
      toast.success(`Password for '${targetResetUser.username}' reset successfully`)
      setShowResetModal(false)
      setResetPasswordVal('')
      loadUsers()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to reset password')
    }
  }

  // ---------------------------------------------------------------------------
  // ROLE ACTIONS
  // ---------------------------------------------------------------------------
  const handleOpenCreateRole = () => {
    setEditingRole(null)
    setIsCloning(false)
    setRoleForm({ name: '', description: '', permission_ids: [] })
    setShowRoleModal(true)
  }

  const handleOpenEditRole = (r) => {
    setEditingRole(r)
    setIsCloning(false)
    setRoleForm({
      name: r.name,
      description: r.description || '',
      permission_ids: (r.permissions || []).map(p => p.id)
    })
    setShowRoleModal(true)
  }

  const handleOpenCloneRole = (r) => {
    setEditingRole(r)
    setIsCloning(true)
    setRoleForm({
      name: `${r.name} (Copy)`,
      description: `Cloned from ${r.name}`,
      permission_ids: (r.permissions || []).map(p => p.id)
    })
    setShowRoleModal(true)
  }

  const handleSaveRole = async (e) => {
    e.preventDefault()
    try {
      if (isCloning) {
        await axios.post(`/api/v1/system/roles/${editingRole.id}/clone`, {
          new_role_name: roleForm.name,
          description: roleForm.description
        })
        toast.success(`Role '${roleForm.name}' cloned successfully`)
      } else if (editingRole) {
        await axios.put(`/api/v1/system/roles/${editingRole.id}`, roleForm)
        toast.success(`Role '${roleForm.name}' updated successfully`)
      } else {
        await axios.post('/api/v1/system/roles', roleForm)
        toast.success(`Role '${roleForm.name}' created successfully`)
      }
      setShowRoleModal(false)
      loadRoles()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save role configuration')
    }
  }

  // ---------------------------------------------------------------------------
  // EXPORT UTILS
  // ---------------------------------------------------------------------------
  const exportLogsCSV = (data, filename) => {
    if (!data || data.length === 0) return toast.info('No data available to export')
    const keys = Object.keys(data[0])
    const csvContent = [
      keys.join(','),
      ...data.map(row => keys.map(k => `"${(row[k] ?? '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleTriggerBackup = async () => {
    try {
      const res = await axios.post('/api/v1/system/backup')
      toast.success(`Database backup completed successfully: ${res.data.file_name}`)
      loadAuditLogs()
    } catch (err) {
      toast.error('Failed to trigger database backup')
    }
  }

  // Password policy check helper for reset modal
  const checkPasswordPolicyRules = (pw) => {
    return {
      length: pw.length >= 12,
      upper: /[A-Z]/.test(pw),
      lower: /[a-z]/.test(pw),
      digit: /[0-9]/.test(pw),
      special: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?/]/.test(pw)
    }
  }
  const resetPolicyRules = checkPasswordPolicyRules(resetPasswordVal)
  const isResetPwValid = Object.values(resetPolicyRules).every(Boolean)

  // Group permissions by module
  const groupedPermissions = permissions.reduce((acc, p) => {
    const mod = p.module || 'General'
    if (!acc[mod]) acc[mod] = []
    acc[mod].push(p)
    return acc
  }, {})

  return (
    <div className="fade-in-slide">
      {/* Header Banner */}
      <div className="page-header">
        <div>
          <span className="page-eyebrow">Administration</span>
          <h2 className="page-title">Users & security</h2>
          <p className="page-subtitle">Accounts, roles and permissions, audit trail and backups.</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5" onClick={() => setShowReportModal(true)}>
            <i className="bi bi-printer"></i> Print user directory
          </button>
          <button className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5" onClick={() => refreshAllData()}>
            <i className="bi bi-arrow-clockwise"></i> Refresh
          </button>
          <button className="btn btn-primary btn-sm d-flex align-items-center gap-1.5" onClick={handleTriggerBackup}>
            <i className="bi bi-database-down"></i> Back up database
          </button>
        </div>
      </div>

      {/* KPI Overview Widgets */}
      <div className="row g-3 mb-4">
        <div className="col-md-3 col-6">
          <div className="card slaf-card kpi-card p-3">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted small fw-semibold text-uppercase d-block">Total Users</span>
                <h3 className="mb-0 fw-bold text-dark mt-1">{users.length}</h3>
              </div>
              <div className="bg-primary-subtle text-primary rounded-circle p-2.5 d-inline-flex">
                <i className="bi bi-people-fill fs-4"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-6">
          <div className="card slaf-card kpi-card success p-3">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted small fw-semibold text-uppercase d-block">Active Accounts</span>
                <h3 className="mb-0 fw-bold text-success mt-1">{users.filter(u => u.is_active && !u.is_locked).length}</h3>
              </div>
              <div className="bg-success-subtle text-success rounded-circle p-2.5 d-inline-flex">
                <i className="bi bi-check-circle-fill fs-4"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-6">
          <div className="card slaf-card kpi-card danger p-3">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted small fw-semibold text-uppercase d-block">Locked Accounts</span>
                <h3 className="mb-0 fw-bold text-danger mt-1">{lockedUsers.length}</h3>
              </div>
              <div className="bg-danger-subtle text-danger rounded-circle p-2.5 d-inline-flex">
                <i className="bi bi-lock-fill fs-4"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-6">
          <div className="card slaf-card kpi-card warning p-3">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted small fw-semibold text-uppercase d-block">Defined Roles</span>
                <h3 className="mb-0 fw-bold text-warning mt-1">{roles.length}</h3>
              </div>
              <div className="bg-warning-subtle text-warning rounded-circle p-2.5 d-inline-flex">
                <i className="bi bi-shield-lock-fill fs-4"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <ul className="nav nav-tabs slaf-tabs nav-tabs-responsive mb-4">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'users' ? 'active fw-bold' : ''}`} onClick={() => setActiveTab('users')}>
            <i className="bi bi-person-gear me-1.5"></i> User Accounts
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'roles' ? 'active fw-bold' : ''}`} onClick={() => setActiveTab('roles')}>
            <i className="bi bi-shield-check me-1.5"></i> Role Management
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'permissions' ? 'active fw-bold' : ''}`} onClick={() => setActiveTab('permissions')}>
            <i className="bi bi-grid-3x3-gap me-1.5"></i> Permission Matrix
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'login-history' ? 'active fw-bold' : ''}`} onClick={() => setActiveTab('login-history')}>
            <i className="bi bi-clock-history me-1.5"></i> Login History
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'audit-logs' ? 'active fw-bold' : ''}`} onClick={() => setActiveTab('audit-logs')}>
            <i className="bi bi-receipt-cutoff me-1.5"></i> Audit Trail Logs
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'locked-accounts' ? 'active fw-bold' : ''}`} onClick={() => setActiveTab('locked-accounts')}>
            <i className="bi bi-lock me-1.5"></i> Locked Accounts {lockedUsers.length > 0 && <span className="badge bg-danger ms-1">{lockedUsers.length}</span>}
          </button>
        </li>
      </ul>

      {/* ========================================================================= */}
      {/* TAB 1: USER ACCOUNTS ADMINISTRATION */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="fade-in-slide">
          {/* Filters Card */}
          <div className="card slaf-card p-3 mb-4">
            <div className="row g-2">
              <div className="col-md-3">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Search Name, Username, Service No..."
                  value={userQuery}
                  onChange={e => setUserQuery(e.target.value)}
                />
              </div>
              <div className="col-md-2">
                <select className="form-select form-select-sm" value={userRankFilter} onChange={e => setUserRankFilter(e.target.value)}>
                  <option value="">All Ranks</option>
                  <option value="AIRCDRE">AIRCDRE</option>
                  <option value="GP CAPT">GP CAPT</option>
                  <option value="WG CDR">WG CDR</option>
                  <option value="SQNLDR">SQNLDR</option>
                  <option value="FLTLT">FLTLT</option>
                  <option value="FGOFF">FGOFF</option>
                  <option value="PLTOFF">PLTOFF</option>
                  <option value="MWO">MWO</option>
                  <option value="WO">WO</option>
                  <option value="FSGT">FSGT</option>
                  <option value="SGT">SGT</option>
                  <option value="CPL">CPL</option>
                  <option value="LAC">LAC</option>
                  <option value="AC">AC</option>
                </select>
              </div>
              <div className="col-md-2">
                <select className="form-select form-select-sm" value={userDeptFilter} onChange={e => setUserDeptFilter(e.target.value)}>
                  <option value="">All Departments</option>
                  <option value="Commanding Section">Commanding Section</option>
                  <option value="Discipline Section">Discipline Section</option>
                  <option value="Academic Section">Academic Section</option>
                  <option value="Accommodation Section">Accommodation Section</option>
                  <option value="System Administration">System Administration</option>
                </select>
              </div>
              <div className="col-md-2">
                <select className="form-select form-select-sm" value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)}>
                  <option value="">All Roles</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <select className="form-select form-select-sm" value={userStatusFilter} onChange={e => setUserStatusFilter(e.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Deactivated</option>
                  <option value="LOCKED">Locked</option>
                </select>
              </div>
              <div className="col-md-1 text-end">
                <button className="btn btn-primary btn-sm w-100 fw-semibold" onClick={handleOpenCreateUser}>
                  <i className="bi bi-plus-lg me-1"></i> Add
                </button>
              </div>
            </div>
          </div>

          {/* User Table */}
          <div className="card slaf-card p-0">
            <div className="table-responsive">
              <table className="table slaf-table align-middle mb-0">
                <thead>
                  <tr>
                    <th>User Details</th>
                    <th>Service No / Rank</th>
                    <th>Department & Module</th>
                    <th>Assigned Role</th>
                    <th>Account Status</th>
                    <th>Created At</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7" className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan="7" className="text-center py-5 text-muted">No user accounts found matching filters.</td></tr>
                  ) : (
                    users.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2.5">
                            {u.profile_photo ? (
                              <img src={u.profile_photo} alt={u.username} className="rounded-circle object-fit-cover flex-shrink-0" style={{ width: '36px', height: '36px' }} />
                            ) : (
                              <div className="d-inline-flex bg-primary-subtle text-primary rounded-circle align-items-center justify-content-center flex-shrink-0" style={{ width: '36px', height: '36px' }}>
                                <i className="bi bi-person-fill fs-6"></i>
                              </div>
                            )}
                            <div>
                              <span className="fw-bold text-dark d-block" style={{ fontSize: '0.9rem' }}>{u.full_name}</span>
                              <small className="text-muted">@{u.username} • {u.email}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="fw-semibold text-primary d-block" style={{ fontSize: '0.85rem' }}>{u.service_number || 'N/A'}</span>
                          <span className="badge bg-secondary-subtle text-dark border px-2 py-0.5" style={{ fontSize: '0.725rem' }}>{u.rank || 'N/A'}</span>
                        </td>
                        <td>
                          <div className="fw-semibold text-dark" style={{ fontSize: '0.85rem' }}>{u.department || 'N/A'}</div>
                          <small className="text-muted">{u.assigned_module || 'General'}</small>
                        </td>
                        <td>
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2.5 py-1 fw-semibold" style={{ fontSize: '0.775rem' }}>
                            {u.role?.name || 'Unassigned'}
                          </span>
                        </td>
                        <td>
                          {u.is_locked ? (
                            <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-0.5">Locked</span>
                          ) : u.is_active ? (
                            <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-0.5">Active</span>
                          ) : (
                            <span className="badge bg-secondary-subtle text-secondary border px-2 py-0.5">Deactivated</span>
                          )}
                        </td>
                        <td>
                          <small className="text-muted">{new Date(u.created_at).toLocaleDateString()}</small>
                        </td>
                        <td className="text-end">
                          <div className="dropdown position-relative">
                            <button
                              className="btn btn-outline-secondary btn-sm dropdown-toggle"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenUserDropdownId(openUserDropdownId === u.id ? null : u.id)
                              }}
                            >
                              Manage
                            </button>
                            <ul className={`dropdown-menu dropdown-menu-end shadow-sm ${openUserDropdownId === u.id ? 'show' : ''}`} style={openUserDropdownId === u.id ? { position: 'absolute', right: 0, top: '100%', zIndex: 1050 } : {}}>
                              <li><button className="dropdown-menu-item dropdown-item" onClick={() => { setOpenUserDropdownId(null); handleOpenEditUser(u); }}><i className="bi bi-pencil me-2 text-primary"></i> Edit Account</button></li>
                              <li><button className="dropdown-menu-item dropdown-item" onClick={() => { setOpenUserDropdownId(null); setTargetResetUser(u); setResetPasswordVal(''); setShowResetModal(true); }}><i className="bi bi-key me-2 text-warning"></i> Reset Password</button></li>
                              {u.is_locked && (
                                <li><button className="dropdown-menu-item dropdown-item" onClick={() => { setOpenUserDropdownId(null); handleUnlockAccount(u.id, u.username); }}><i className="bi bi-unlock me-2 text-success"></i> Unlock Account</button></li>
                              )}
                              <li><button className="dropdown-menu-item dropdown-item" onClick={() => { setOpenUserDropdownId(null); handleToggleStatus(u); }}><i className={`bi bi-${u.is_active ? 'pause-circle' : 'play-circle'} me-2 text-info`}></i> {u.is_active ? 'Deactivate' : 'Activate'}</button></li>
                              <li><button className="dropdown-menu-item dropdown-item text-danger" onClick={() => { setOpenUserDropdownId(null); handleRevokeSession(u.id, u.username); }}><i className="bi bi-box-arrow-right me-2"></i> Revoke Session / Logout</button></li>
                              <li><hr className="dropdown-divider" /></li>
                              <li><button className="dropdown-menu-item dropdown-item text-danger" onClick={() => { setOpenUserDropdownId(null); handleSoftDeleteUser(u); }}><i className="bi bi-trash me-2"></i> Soft Delete</button></li>
                            </ul>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ROLE MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'roles' && (
        <div className="fade-in-slide">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0 fw-bold display-font">Configured Portal Roles</h5>
            <button className="btn btn-primary btn-sm fw-semibold" onClick={handleOpenCreateRole}>
              <i className="bi bi-shield-plus me-1.5"></i> Create New Role
            </button>
          </div>

          <div className="row g-3">
            {roles.map(r => (
              <div key={r.id} className="col-md-6 col-lg-4">
                <div className="card slaf-card h-100 p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h5 className="fw-bold mb-0 text-dark">{r.name}</h5>
                      <span className="badge bg-primary-subtle text-primary border mt-1" style={{ fontSize: '0.725rem' }}>
                        {r.users_count || 0} Assigned Users
                      </span>
                    </div>
                    <div className="dropdown position-relative">
                      <button
                        className="btn btn-link text-muted p-0"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenRoleDropdownId(openRoleDropdownId === r.id ? null : r.id)
                        }}
                      >
                        <i className="bi bi-three-dots-vertical"></i>
                      </button>
                      <ul className={`dropdown-menu dropdown-menu-end shadow-sm ${openRoleDropdownId === r.id ? 'show' : ''}`} style={openRoleDropdownId === r.id ? { position: 'absolute', right: 0, top: '100%', zIndex: 1050 } : {}}>
                        <li><button className="dropdown-item" onClick={() => { setOpenRoleDropdownId(null); handleOpenEditRole(r); }}><i className="bi bi-pencil me-2"></i> Edit Role</button></li>
                        <li><button className="dropdown-item" onClick={() => { setOpenRoleDropdownId(null); handleOpenCloneRole(r); }}><i className="bi bi-copy me-2"></i> Clone Role</button></li>
                      </ul>
                    </div>
                  </div>
                  <p className="text-muted small mb-3 flex-grow-1">{r.description || 'No description provided.'}</p>

                  <div className="border-top pt-2">
                    <span className="text-muted small fw-semibold d-block mb-1">Granted Permissions ({r.permissions?.length || 0}):</span>
                    <div className="d-flex flex-wrap gap-1" style={{ maxHeight: '80px', overflowY: 'auto' }}>
                      {r.permissions && r.permissions.length > 0 ? (
                        r.permissions.map(p => (
                          <span key={p.id} className="badge bg-light text-dark border" style={{ fontSize: '0.675rem' }}>
                            {p.code}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted small italic">No explicit permissions assigned</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PERMISSION MATRIX */}
      {/* ========================================================================= */}
      {activeTab === 'permissions' && (
        <div className="fade-in-slide">
          <div className="card slaf-card p-0">
            <div className="card-header bg-app py-3 px-4 d-flex justify-content-between align-items-center">
              <h5 className="mb-0 display-font fw-bold text-primary">Role vs Permission Capability Matrix</h5>
              <span className="badge bg-secondary">{permissions.length} Total Permissions</span>
            </div>
            <div className="table-responsive">
              <table className="table slaf-table align-middle text-center mb-0">
                <thead>
                  <tr>
                    <th className="text-start ps-4">Module / Function Permission</th>
                    <th className="text-start">Permission Code</th>
                    {roles.map(r => (
                      <th key={r.id} style={{ minWidth: '120px' }}>{r.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedPermissions).map(([modName, perms]) => (
                    <React.Fragment key={modName}>
                      <tr className="bg-light-subtle">
                        <td colSpan={2 + roles.length} className="text-start ps-4 fw-bold text-primary text-uppercase small py-2">
                          <i className="bi bi-folder2-open me-2"></i> Module: {modName}
                        </td>
                      </tr>
                      {perms.map(p => (
                        <tr key={p.id}>
                          <td className="text-start ps-4 fw-semibold text-dark" style={{ fontSize: '0.875rem' }}>
                            {p.name}
                            <small className="text-muted d-block">{p.description}</small>
                          </td>
                          <td className="text-start">
                            <span className="badge bg-light text-dark border font-monospace" style={{ fontSize: '0.75rem' }}>{p.code}</span>
                          </td>
                          {roles.map(r => {
                            const hasP = r.permissions?.some(rp => rp.id === p.id) || r.name === 'Super Administrator'
                            return (
                              <td key={r.id}>
                                {hasP ? (
                                  <i className="bi bi-check-circle-fill text-success fs-5"></i>
                                ) : (
                                  <i className="bi bi-dash-circle text-muted opacity-25 fs-5"></i>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: LOGIN HISTORY */}
      {/* ========================================================================= */}
      {activeTab === 'login-history' && (
        <div className="fade-in-slide">
          <div className="card slaf-card p-3 mb-4">
            <div className="row g-2 align-items-center">
              <div className="col-md-4">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Filter by Username..."
                  value={logSearchUser}
                  onChange={e => setLogSearchUser(e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <select className="form-select form-select-sm" value={logStatusFilter} onChange={e => setLogStatusFilter(e.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="FAILED">FAILED</option>
                  <option value="LOCKED">LOCKED</option>
                </select>
              </div>
              <div className="col-md-5 text-end">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => exportLogsCSV(loginLogs, `slaf_login_history_${Date.now()}.csv`)}>
                  <i className="bi bi-download me-1.5"></i> Export CSV
                </button>
              </div>
            </div>
          </div>

          <div className="card slaf-card p-0">
            <div className="table-responsive">
              <table className="table slaf-table mb-0">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Status</th>
                    <th>Client IP Address</th>
                    <th>User Agent / Browser</th>
                    <th>Login Time</th>
                    <th>Logout Time</th>
                  </tr>
                </thead>
                <tbody>
                  {loginLogs.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-5 text-muted">No login history records found.</td></tr>
                  ) : (
                    loginLogs.map(l => (
                      <tr key={l.id}>
                        <td><strong className="text-dark">@{l.username || 'unknown'}</strong></td>
                        <td>
                          {l.status === 'SUCCESS' && <span className="badge bg-success-subtle text-success border">SUCCESS</span>}
                          {l.status === 'FAILED' && <span className="badge bg-warning-subtle text-warning border">FAILED</span>}
                          {l.status === 'LOCKED' && <span className="badge bg-danger-subtle text-danger border">LOCKED</span>}
                        </td>
                        <td><small className="font-monospace text-muted">{l.ip_address || 'unknown'}</small></td>
                        <td><small className="text-muted" style={{ fontSize: '0.75rem' }}>{l.user_agent || '-'}</small></td>
                        <td><small className="text-muted">{new Date(l.created_at).toLocaleString()}</small></td>
                        <td><small className="text-muted">{l.logout_time ? new Date(l.logout_time).toLocaleString() : '-'}</small></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: AUDIT TRAIL LOGS */}
      {/* ========================================================================= */}
      {activeTab === 'audit-logs' && (
        <div className="fade-in-slide">
          <div className="card slaf-card p-3 mb-4">
            <div className="row g-2 align-items-center">
              <div className="col-md-4">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Filter by Username..."
                  value={logSearchUser}
                  onChange={e => setLogSearchUser(e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <select className="form-select form-select-sm" value={auditModuleFilter} onChange={e => setAuditModuleFilter(e.target.value)}>
                  <option value="">All System Modules</option>
                  <option value="User Management">User Management</option>
                  <option value="Role Management">Role Management</option>
                  <option value="User Profile">User Profile</option>
                  <option value="Authentication">Authentication</option>
                  <option value="System Backup">System Backup</option>
                </select>
              </div>
              <div className="col-md-5 text-end">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => exportLogsCSV(auditLogs, `slaf_audit_trail_${Date.now()}.csv`)}>
                  <i className="bi bi-download me-1.5"></i> Export Audit Log CSV
                </button>
              </div>
            </div>
          </div>

          <div className="card slaf-card p-0">
            <div className="table-responsive">
              <table className="table slaf-table mb-0">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Module</th>
                    <th>Action</th>
                    <th>IP Address</th>
                    <th>Activity Details</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-5 text-muted">No audit trail records logged.</td></tr>
                  ) : (
                    auditLogs.map(a => (
                      <tr key={a.id}>
                        <td><strong className="text-dark">@{a.user_name || a.username || 'System'}</strong></td>
                        <td><span className="badge bg-secondary-subtle text-dark border">{a.module || 'General'}</span></td>
                        <td><span className="badge bg-light text-primary border">{a.action}</span></td>
                        <td><small className="font-monospace text-muted">{a.ip_address || '-'}</small></td>
                        <td><small style={{ fontSize: '0.8rem' }}>{a.details || '-'}</small></td>
                        <td><small className="text-muted">{new Date(a.created_at).toLocaleString()}</small></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: LOCKED ACCOUNTS */}
      {/* ========================================================================= */}
      {activeTab === 'locked-accounts' && (
        <div className="fade-in-slide">
          {lockedUsers.length > 0 && (
            <div className="alert alert-danger d-flex align-items-center gap-2 mb-4">
              <i className="bi bi-exclamation-triangle-fill fs-4"></i>
              <div>
                <strong>Security Alert:</strong> {lockedUsers.length} account(s) have been automatically locked due to exceeding the maximum permitted failed login attempts (5 tries).
              </div>
            </div>
          )}

          <div className="card slaf-card p-0">
            <div className="table-responsive">
              <table className="table slaf-table align-middle mb-0">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Service No / Rank</th>
                    <th>Role</th>
                    <th>Failed Attempts</th>
                    <th>Status</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lockedUsers.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-5 text-muted">No accounts are currently locked out.</td></tr>
                  ) : (
                    lockedUsers.map(u => (
                      <tr key={u.id}>
                        <td>
                          <strong className="text-dark d-block">{u.full_name}</strong>
                          <small className="text-muted">@{u.username} • {u.email}</small>
                        </td>
                        <td>
                          <span className="fw-semibold text-primary d-block">{u.service_number || 'N/A'}</span>
                          <span className="badge bg-secondary-subtle text-dark border">{u.rank || 'N/A'}</span>
                        </td>
                        <td><span className="badge bg-primary-subtle text-primary border">{u.role?.name}</span></td>
                        <td><span className="badge bg-danger text-white fw-bold">{u.failed_login_attempts} / 5</span></td>
                        <td><span className="badge bg-danger-subtle text-danger border">Locked</span></td>
                        <td className="text-end">
                          <button className="btn btn-success btn-sm fw-semibold" onClick={() => handleUnlockAccount(u.id, u.username)}>
                            <i className="bi bi-unlock-fill me-1.5"></i> Unlock Account
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE / EDIT USER MODAL */}
      {/* ========================================================================= */}
      {showUserModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content slaf-card">
              <div className="modal-header border-bottom">
                <h5 className="modal-title display-font text-primary fw-bold">
                  {editingUser ? `Edit Account: ${editingUser.username}` : 'Register New User Account'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowUserModal(false)}></button>
              </div>
              <form onSubmit={handleSaveUser}>
                <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Service Number *</label>
                      <input type="text" className="form-control form-control-sm" value={userForm.service_number} onChange={e => setUserForm({ ...userForm, service_number: e.target.value })} placeholder="e.g. 32853" required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Rank *</label>
                      <select className="form-select form-select-sm" value={userForm.rank} onChange={e => setUserForm({ ...userForm, rank: e.target.value })}>
                        <option value="AIRCDRE">AIRCDRE (Air Commodore)</option>
                        <option value="GP CAPT">GP CAPT (Group Captain)</option>
                        <option value="WG CDR">WG CDR (Wing Commander)</option>
                        <option value="SQNLDR">SQNLDR (Squadron Leader)</option>
                        <option value="FLTLT">FLTLT (Flight Lieutenant)</option>
                        <option value="FGOFF">FGOFF (Flying Officer)</option>
                        <option value="PLTOFF">PLTOFF (Pilot Officer)</option>
                        <option value="MWO">MWO (Master Warrant Officer)</option>
                        <option value="WO">WO (Warrant Officer)</option>
                        <option value="FSGT">FSGT (Flight Sergeant)</option>
                        <option value="SGT">SGT (Sergeant)</option>
                        <option value="CPL">CPL (Corporal)</option>
                        <option value="LAC">LAC (Leading Aircraftman)</option>
                        <option value="AC">AC (Aircraftman)</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Full Name *</label>
                      <input type="text" className="form-control form-control-sm" value={userForm.full_name} onChange={e => setUserForm({ ...userForm, full_name: e.target.value })} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Username *</label>
                      <input type="text" className="form-control form-control-sm" value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} disabled={!!editingUser} required />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Email Address *</label>
                      <input type="email" className="form-control form-control-sm" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Mobile Number</label>
                      <input type="text" className="form-control form-control-sm" value={userForm.mobile_number} onChange={e => setUserForm({ ...userForm, mobile_number: e.target.value })} placeholder="+94 7X XXX XXXX" />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Department</label>
                      <select className="form-select form-select-sm" value={userForm.department} onChange={e => setUserForm({ ...userForm, department: e.target.value })}>
                        <option value="Commanding Section">Commanding Section</option>
                        <option value="Discipline Section">Discipline Section</option>
                        <option value="Academic Section">Academic Section</option>
                        <option value="Accommodation Section">Accommodation Section</option>
                        <option value="System Administration">System Administration</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Designation</label>
                      <input type="text" className="form-control form-control-sm" value={userForm.designation} onChange={e => setUserForm({ ...userForm, designation: e.target.value })} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Assigned Module</label>
                      <select className="form-select form-select-sm" value={userForm.assigned_module} onChange={e => setUserForm({ ...userForm, assigned_module: e.target.value })}>
                        <option value="Student Details">Student Details</option>
                        <option value="Accommodation">Accommodation</option>
                        <option value="Academic Activities">Academic Activities</option>
                        <option value="Daily Parade">Daily Parade</option>
                        <option value="System Administration">System Administration</option>
                      </select>
                    </div>

                    {!editingUser && (
                      <div className="col-md-12">
                        <label className="form-label fw-semibold">Initial Password * (Min 12 chars, upper, lower, digit, special)</label>
                        <input type="password" className="form-control form-control-sm" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} required />
                      </div>
                    )}

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Assigned Role *</label>
                      <select className="form-select form-select-sm" value={userForm.role_id} onChange={e => setUserForm({ ...userForm, role_id: e.target.value })} required>
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6 d-flex align-items-center gap-4 mt-4">
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" id="userActiveCheck" checked={userForm.is_active} onChange={e => setUserForm({ ...userForm, is_active: e.target.checked })} />
                        <label className="form-check-label fw-semibold" htmlFor="userActiveCheck">Account Active</label>
                      </div>
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" id="mustChangePw" checked={userForm.must_change_password} onChange={e => setUserForm({ ...userForm, must_change_password: e.target.checked })} />
                        <label className="form-check-label fw-semibold" htmlFor="mustChangePw">Force Pw Change</label>
                      </div>
                    </div>

                    {/* Direct Permissions Override Checklist */}
                    <div className="col-12 mt-3">
                      <label className="form-label fw-semibold d-block border-bottom pb-1">
                        Optional Direct Permission Override Checklist (Add extra specific capabilities to user)
                      </label>
                      <div className="row g-2" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                        {permissions.map(p => {
                          const isChecked = userForm.direct_permission_ids.includes(p.id)
                          return (
                            <div key={p.id} className="col-md-6">
                              <div className="form-check">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`dir_perm_${p.id}`}
                                  checked={isChecked}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setUserForm({ ...userForm, direct_permission_ids: [...userForm.direct_permission_ids, p.id] })
                                    } else {
                                      setUserForm({ ...userForm, direct_permission_ids: userForm.direct_permission_ids.filter(id => id !== p.id) })
                                    }
                                  }}
                                />
                                <label className="form-check-label small" htmlFor={`dir_perm_${p.id}`}>
                                  <strong>{p.name}</strong> <span className="text-muted">({p.code})</span>
                                </label>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer d-flex flex-column-reverse flex-sm-row justify-content-end gap-2">
                  <button type="button" className="btn btn-outline-secondary btn-sm w-100 w-sm-auto" onClick={() => setShowUserModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm fw-semibold w-100 w-sm-auto">
                    <i className="bi bi-check-lg me-1"></i> {editingUser ? 'Save Account Changes' : 'Create User Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADMIN RESET PASSWORD MODAL */}
      {/* ========================================================================= */}
      {showResetModal && targetResetUser && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1070 }}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content slaf-card">
              <div className="modal-header border-bottom">
                <h5 className="modal-title display-font text-primary fw-bold">Reset Password: @{targetResetUser.username}</h5>
                <button type="button" className="btn-close" onClick={() => setShowResetModal(false)}></button>
              </div>
              <form onSubmit={handleAdminResetPassword}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">New Password</label>
                    <input
                      type="password"
                      className="form-control"
                      value={resetPasswordVal}
                      onChange={e => setResetPasswordVal(e.target.value)}
                      placeholder="Enter strong password..."
                      required
                    />
                  </div>

                  {/* Policy Checklist Widget */}
                  <div className="card p-2 bg-light border mb-3" style={{ fontSize: '0.8rem' }}>
                    <span className="fw-semibold text-muted mb-1">Security Policy Checklist:</span>
                    <div className="d-flex flex-wrap gap-2">
                      <span className={resetPolicyRules.length ? 'text-success fw-bold' : 'text-danger'}>
                        <i className={`bi bi-${resetPolicyRules.length ? 'check' : 'x'}`}></i> 12+ Chars
                      </span>
                      <span className={resetPolicyRules.upper ? 'text-success fw-bold' : 'text-danger'}>
                        <i className={`bi bi-${resetPolicyRules.upper ? 'check' : 'x'}`}></i> Uppercase (A-Z)
                      </span>
                      <span className={resetPolicyRules.lower ? 'text-success fw-bold' : 'text-danger'}>
                        <i className={`bi bi-${resetPolicyRules.lower ? 'check' : 'x'}`}></i> Lowercase (a-z)
                      </span>
                      <span className={resetPolicyRules.digit ? 'text-success fw-bold' : 'text-danger'}>
                        <i className={`bi bi-${resetPolicyRules.digit ? 'check' : 'x'}`}></i> Number (0-9)
                      </span>
                      <span className={resetPolicyRules.special ? 'text-success fw-bold' : 'text-danger'}>
                        <i className={`bi bi-${resetPolicyRules.special ? 'check' : 'x'}`}></i> Special (!@#$)
                      </span>
                    </div>
                  </div>

                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="forceResetCheck"
                      checked={forceChangeOnLogin}
                      onChange={e => setForceChangeOnLogin(e.target.checked)}
                    />
                    <label className="form-check-label fw-semibold" htmlFor="forceResetCheck">
                      Require user to change password on next login
                    </label>
                  </div>
                </div>

                <div className="modal-footer d-flex flex-column-reverse flex-sm-row justify-content-end gap-2">
                  <button type="button" className="btn btn-outline-secondary btn-sm w-100 w-sm-auto" onClick={() => setShowResetModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-warning btn-sm fw-semibold text-dark w-100 w-sm-auto" disabled={!isResetPwValid}>
                    Reset Password Now
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CREATE / EDIT ROLE MODAL */}
      {/* ========================================================================= */}
      {showRoleModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content slaf-card">
              <div className="modal-header border-bottom">
                <h5 className="modal-title display-font text-primary fw-bold">
                  {isCloning ? `Clone Role: ${editingRole.name}` : editingRole ? `Edit Role: ${editingRole.name}` : 'Create New System Role'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowRoleModal(false)}></button>
              </div>
              <form onSubmit={handleSaveRole}>
                <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Role Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={roleForm.name}
                      onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Description</label>
                    <input
                      type="text"
                      className="form-control"
                      value={roleForm.description}
                      onChange={e => setRoleForm({ ...roleForm, description: e.target.value })}
                    />
                  </div>

                  {!isCloning && (
                    <div>
                      <label className="form-label fw-semibold d-block border-bottom pb-2">
                        Granted Module & Function Permissions Checklist:
                      </label>
                      <div className="row g-3">
                        {Object.entries(groupedPermissions).map(([modName, perms]) => (
                          <div key={modName} className="col-md-6">
                            <div className="card p-2 bg-light border h-100">
                              <h6 className="fw-bold text-primary mb-2 border-bottom pb-1 text-uppercase" style={{ fontSize: '0.8rem' }}>
                                Module: {modName}
                              </h6>
                              {perms.map(p => {
                                const isChecked = roleForm.permission_ids.includes(p.id)
                                return (
                                  <div key={p.id} className="form-check">
                                    <input
                                      className="form-check-input"
                                      type="checkbox"
                                      id={`role_perm_${p.id}`}
                                      checked={isChecked}
                                      onChange={e => {
                                        if (e.target.checked) {
                                          setRoleForm({ ...roleForm, permission_ids: [...roleForm.permission_ids, p.id] })
                                        } else {
                                          setRoleForm({ ...roleForm, permission_ids: roleForm.permission_ids.filter(id => id !== p.id) })
                                        }
                                      }}
                                    />
                                    <label className="form-check-label small" htmlFor={`role_perm_${p.id}`}>
                                      <strong>{p.name}</strong> <span className="text-muted">({p.code})</span>
                                    </label>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer d-flex flex-column-reverse flex-sm-row justify-content-end gap-2">
                  <button type="button" className="btn btn-outline-secondary btn-sm w-100 w-sm-auto" onClick={() => setShowRoleModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm fw-semibold w-100 w-sm-auto">
                    <i className="bi bi-shield-check me-1"></i> {isCloning ? 'Confirm Role Clone' : 'Save Role Configuration'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* User Directory & System Security Report Modal */}
      <ClassicalReportModal
        show={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="OFFICIAL USER DIRECTORY & SYSTEM ACCESS REGISTER"
        endpoint="/api/v1/reports/students"
        params={{}}
        defaultOrientation="landscape"
      />
    </div>
  )
}

export default UserManagement
