/**
 * SLAF TTS Management Portal - Centralized Navigation & Module Permission System
 * 
 * Provides single source of truth for:
 * - Module definitions and metadata
 * - Authoritative Admin session detection
 * - RBAC permission validation
 * - Centralized navigation ("Back to Home Portal", "Open Module")
 */

// Central Definition of all official SLAF TTS System Modules
export const SYSTEM_MODULES = [
  {
    id: 'trainees',
    title: 'Student & Trainee Management',
    shortName: 'Trainees',
    path: '/students',
    permissionCode: 'student:read',
    icon: 'bi-people-fill',
    category: 'Operational',
    color: '#2c5ea8',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    description: 'Master trainee directory, personal service dossiers, rank allocation & QR identification.'
  },
  {
    id: 'parade',
    title: 'Daily Parade State & Muster',
    shortName: 'Parade State',
    path: '/parade?tab=monitoring',
    permissionCode: 'parade:read',
    icon: 'bi-clipboard2-check-fill',
    category: 'Operational',
    color: '#1f7a4d',
    bgColor: 'rgba(5, 150, 105, 0.1)',
    description: 'Morning muster accountability, instructor submissions, approval workflow & night roll call.'
  },
  {
    id: 'accommodation',
    title: 'Accommodation & Living Quarters',
    shortName: 'Housing',
    path: '/accommodation',
    permissionCode: 'room:read',
    icon: 'bi-house-door-fill',
    category: 'Facilities',
    color: '#2f6f86',
    bgColor: 'rgba(8, 145, 178, 0.1)',
    description: 'Billet building inventory, bunk bed top/bottom allocations & live vacancy map.'
  },
  {
    id: 'academic',
    title: 'Academic Activities & Syllabus',
    shortName: 'Academics',
    path: '/academic',
    permissionCode: 'academic:read',
    icon: 'bi-journal-bookmark-fill',
    category: 'Academic',
    color: '#4d5f8f',
    bgColor: 'rgba(99, 102, 241, 0.1)',
    description: 'Course structures, trades, subjects, lessons, cloud lesson plans & syllabus tracking.'
  },
  {
    id: 'calendar_attendance',
    title: 'Training Schedule & Attendance',
    shortName: 'Schedule & Attendance',
    path: '/academic?view=calendar',
    permissionCode: 'academic:read',
    icon: 'bi-calendar-check-fill',
    category: 'Academic',
    color: '#6e5a8a',
    bgColor: 'rgba(139, 92, 246, 0.1)',
    description: 'Period-wise timetable master, classroom attendance registers & calendar synchronization.'
  },
  {
    id: 'occurrences',
    title: 'Personal Occurrence Reporting',
    shortName: 'Occurrences',
    path: '/students/occurrences',
    permissionCode: 'personal_occurrence:read',
    icon: 'bi-shield-exclamation',
    category: 'Discipline',
    color: '#b26a00',
    bgColor: 'rgba(217, 119, 6, 0.1)',
    description: 'Trainee disciplinary records, commendations, medical infractions & punishment logs.'
  },
  {
    id: 'reports',
    title: 'Institutional Reports & Analytics',
    shortName: 'Reports',
    path: '/reports',
    permissionCode: 'reports:read',
    icon: 'bi-file-earmark-bar-graph-fill',
    category: 'Analytics',
    color: '#6e5a8a',
    bgColor: 'rgba(236, 72, 153, 0.1)',
    description: 'Formal SLAF registers, printable strength registers, official PDF & Excel compilations.'
  },
  {
    id: 'admin',
    title: 'System Administration & Security',
    shortName: 'System Admin',
    path: '/admin',
    permissionCode: 'system:audit',
    icon: 'bi-shield-lock-fill',
    category: 'Governance',
    color: '#b42318',
    bgColor: 'rgba(220, 38, 38, 0.1)',
    description: 'User provisioning, RBAC role permissions, session audit logs & system health.'
  }
]

/**
 * Validates whether the currently authenticated session is an Admin session
 * based on authoritative user record from the backend.
 */
export const isUserAdmin = (user) => {
  if (!user) return false
  const roleName = (user.role?.name || '').toLowerCase()
  const roleId = (user.role?.id || '').toLowerCase()
  return (
    roleName.includes('admin') ||
    roleId.includes('admin') ||
    user.role?.name === 'Super Administrator' ||
    user.role?.name === 'System Administrator' ||
    user.role?.id === 'role-super-admin' ||
    user.role?.id === 'role-sys-admin'
  )
}

/**
 * Evaluates whether a user has access to a specific module or permission code.
 * Reuses the existing backend-validated AuthContext permissions.
 */
export const checkModuleAccess = (user, permissionCode, hasPermissionFn) => {
  if (!user) return false
  if (isUserAdmin(user)) return true
  if (!permissionCode) return true
  if (typeof hasPermissionFn === 'function') {
    return hasPermissionFn(permissionCode)
  }
  const perms = user.effective_permissions || user.role?.permissions || []
  return perms.some(p => p.code === permissionCode)
}

/**
 * Centralized navigation function to return to the Executive Dashboard / Home Portal
 * from ANY module/page in the system while preserving the valid authenticated session.
 */
export const goToHomePortal = (navigate) => {
  if (typeof navigate === 'function') {
    navigate('/dashboard')
  } else {
    window.location.href = '/dashboard'
  }
}

/**
 * Centralized module launcher with authoritative authentication and permission validation.
 * 
 * Returns { allowed: boolean, reason?: string }
 */
export const openModule = (navigate, moduleConfig, user, hasPermissionFn) => {
  // 1. Session check: if no active token or user, redirect to login
  const token = localStorage.getItem('access_token')
  if (!token || !user) {
    if (typeof navigate === 'function') {
      navigate('/login', { replace: true, state: { redirect: moduleConfig.path } })
    } else {
      window.location.href = '/login'
    }
    return { allowed: false, reason: 'SESSION_EXPIRED' }
  }

  // 2. Permission check: Admin or specific permission code
  const hasAccess = checkModuleAccess(user, moduleConfig.permissionCode, hasPermissionFn)

  if (hasAccess) {
    if (typeof navigate === 'function') {
      navigate(moduleConfig.path)
    } else {
      window.location.href = moduleConfig.path
    }
    return { allowed: true }
  } else {
    // 3. Access Denied: navigate to Access Denied screen with state
    if (typeof navigate === 'function') {
      navigate('/access-denied', {
        state: {
          moduleTitle: moduleConfig.title,
          permissionCode: moduleConfig.permissionCode,
          attemptedPath: moduleConfig.path
        }
      })
    }
    return { allowed: false, reason: 'ACCESS_DENIED' }
  }
}
