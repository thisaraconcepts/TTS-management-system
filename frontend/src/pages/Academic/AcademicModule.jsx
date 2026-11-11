import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AcademicDashboard } from './AcademicDashboard'
import { TradeManagement } from './TradeManagement'
import { CourseManagement } from './CourseManagement'
import { ClassroomManagement } from './ClassroomManagement'
import { BatchManagement } from './BatchManagement'
import { InstructorAssignment } from './InstructorAssignment'
import { SubjectLessonManagement } from './SubjectLessonManagement'
import { AssessmentManagement } from './AssessmentManagement'
import { AcademicReports } from './AcademicReports'
import { LessonPlanDocuments } from './LessonPlanDocuments'
import { CourseCalendarManagement } from './CourseCalendarManagement'

export const AcademicModule = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Enterprise UI Rule: Default initially to ONLY the Academic Dashboard!
  const initialView = searchParams.get('view') || 'dashboard'
  const [activeView, setActiveView] = useState(initialView)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Expanded state for submenu sections
  const [expandedSections, setExpandedSections] = useState({
    masterData: true,
    trainingMgmt: true,
    assessment: true,
    reports: true
  })

  useEffect(() => {
    const viewParam = searchParams.get('view')
    if (viewParam) {
      setActiveView(viewParam)
    }
  }, [searchParams])

  const handleNavigate = (view, extraParams = {}) => {
    setActiveView(view)
    setMobileMenuOpen(false)
    const newParams = { view }
    if (extraParams.courseId) newParams.course_id = extraParams.courseId
    if (extraParams.entryId) newParams.edit_id = extraParams.entryId
    setSearchParams(newParams)
  }

  const toggleSection = (sec) => {
    setExpandedSections(prev => ({ ...prev, [sec]: !prev[sec] }))
  }

  // Breadcrumb generator helper
  const getBreadcrumbTitle = () => {
    switch (activeView) {
      case 'dashboard': return { category: 'Overview', title: 'Academic Executive Dashboard' }
      case 'trades': return { category: 'Master Data', title: 'Trade Management' }
      case 'courses': return { category: 'Master Data', title: 'Course Management' }
      case 'classrooms': return { category: 'Master Data', title: 'Classroom Management' }
      case 'batches': return { category: 'Training Management', title: 'Batch Management' }
      case 'instructors': return { category: 'Training Management', title: 'Instructor Assignment (SSOT)' }
      case 'subjects': return { category: 'Training Management', title: 'Subject Management' }
      case 'lessons': return { category: 'Training Management', title: 'Lesson Management' }
      case 'calendar': return { category: 'Training Management', title: 'Course Calendar Management' }
      case 'lesson-plan-docs': return { category: 'Training Management', title: 'Lesson Plan Documents' }
      case 'attendance': return { category: 'Assessment', title: 'Class Attendance Registry' }
      case 'examinations': return { category: 'Assessment', title: 'Examinations & Tests' }
      case 'phase-tests': return { category: 'Assessment', title: 'Examinations & Tests' }
      case 'final-exams': return { category: 'Assessment', title: 'Examinations & Tests' }
      case 'results': return { category: 'Assessment', title: 'Exam Results & Marksheets' }
      case 'academic-reports': return { category: 'Reports', title: 'Academic Summary Reports' }
      case 'classroom-reports': return { category: 'Reports', title: 'Classroom Utilization Reports' }
      case 'instructor-reports': return { category: 'Reports', title: 'Instructor Assignment Reports' }
      default: return { category: 'Overview', title: 'Academic Activities' }
    }
  }

  const breadcrumb = getBreadcrumbTitle()

  return (
    <div className="d-flex w-100 min-vh-100 bg-app overflow-hidden position-relative">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div className="sidebar-backdrop d-lg-none" onClick={() => setMobileMenuOpen(false)} style={{ zIndex: 1055 }} />
      )}

      {/* Module-Specific Enterprise Collapsible Sidebar */}
      <aside 
        className={`bg-white border-end shadow-sm d-flex flex-column transition-all ${
          mobileMenuOpen ? 'position-fixed top-0 start-0 h-100' : 'd-none d-lg-flex'
        } ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
        style={{
          width: mobileMenuOpen ? 'min(300px, 85vw)' : (sidebarCollapsed ? '70px' : '260px'),
          minWidth: mobileMenuOpen ? 'min(300px, 85vw)' : (sidebarCollapsed ? '70px' : '260px'),
          transition: 'width 0.25s ease, min-width 0.25s ease',
          zIndex: mobileMenuOpen ? 1060 : 1020,
          boxShadow: mobileMenuOpen ? '0 0 35px rgba(0,0,0,0.5)' : undefined
        }}
      >
        {/* Sidebar Header */}
        <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-light">
          {(!sidebarCollapsed || mobileMenuOpen) && (
            <div className="d-flex align-items-center gap-2">
              <div className="bg-primary text-white rounded p-1.5 d-inline-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                <i className="bi bi-journal-bookmark-fill fs-6"></i>
              </div>
              <div>
                <h6 className="fw-extrabold display-font text-dark mb-0" style={{ fontSize: '0.95rem' }}>Academic Portal</h6>
                <small className="text-muted" style={{ fontSize: '0.7rem' }}>SLAF TTS ERP</small>
              </div>
            </div>
          )}
          <div className="d-flex align-items-center gap-1">
            <button 
              className="btn btn-sm btn-light border p-1 text-muted d-none d-lg-inline-block" 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <i className={`bi bi-chevron-${sidebarCollapsed ? 'right' : 'left'}`}></i>
            </button>
            <button 
              className="btn btn-sm btn-light border p-1 text-muted d-lg-none" 
              onClick={() => setMobileMenuOpen(false)}
              title="Close Academic Menu"
              aria-label="Close Academic Menu"
            >
              <i className="bi bi-x-lg fs-6"></i>
            </button>
          </div>
        </div>

        {/* Sidebar Scrollable Nav Menu */}
        <div className="flex-grow-1 overflow-auto p-2">
          <ul className="nav nav-pills flex-column gap-1">
            {/* Dashboard Link */}
            <li className="nav-item">
              <button 
                className={`nav-link w-100 text-start d-flex align-items-center gap-2.5 py-2 px-2.5 rounded ${activeView === 'dashboard' ? 'active bg-primary text-white fw-bold' : 'text-dark hover-bg-light'}`}
                onClick={() => handleNavigate('dashboard')}
              >
                <i className="bi bi-grid-1x2-fill fs-6"></i>
                {!sidebarCollapsed && <span>Dashboard</span>}
              </button>
            </li>

            {/* SECTION 1: MASTER DATA */}
            <li className="nav-item mt-2">
              {!sidebarCollapsed && (
                <div 
                  className="d-flex justify-content-between align-items-center px-2 py-1 text-muted text-uppercase fw-bold cursor-pointer"
                  style={{ fontSize: '0.675rem', letterSpacing: '0.5px' }}
                  onClick={() => toggleSection('masterData')}
                >
                  <span>Master Data</span>
                  <i className={`bi bi-chevron-${expandedSections.masterData ? 'down' : 'right'}`}></i>
                </div>
              )}
              {expandedSections.masterData && (
                <ul className="nav flex-column ms-1 mt-1 gap-1">
                  <li>
                    <button 
                      className={`nav-link w-100 text-start d-flex align-items-center gap-2 py-1.5 px-2.5 rounded small ${activeView === 'trades' ? 'active bg-primary text-white fw-semibold' : 'text-secondary hover-bg-light'}`}
                      onClick={() => handleNavigate('trades')}
                    >
                      <i className="bi bi-wrench me-1"></i>
                      {!sidebarCollapsed && <span>Trade Management</span>}
                    </button>
                  </li>
                  <li>
                    <button 
                      className={`nav-link w-100 text-start d-flex align-items-center gap-2 py-1.5 px-2.5 rounded small ${activeView === 'courses' ? 'active bg-primary text-white fw-semibold' : 'text-secondary hover-bg-light'}`}
                      onClick={() => handleNavigate('courses')}
                    >
                      <i className="bi bi-book-half me-1"></i>
                      {!sidebarCollapsed && <span>Course Management</span>}
                    </button>
                  </li>
                  <li>
                    <button 
                      className={`nav-link w-100 text-start d-flex align-items-center gap-2 py-1.5 px-2.5 rounded small ${activeView === 'classrooms' ? 'active bg-primary text-white fw-semibold' : 'text-secondary hover-bg-light'}`}
                      onClick={() => handleNavigate('classrooms')}
                    >
                      <i className="bi bi-door-open-fill me-1"></i>
                      {!sidebarCollapsed && <span>Classroom Master</span>}
                    </button>
                  </li>
                </ul>
              )}
            </li>

            {/* SECTION 2: TRAINING MANAGEMENT */}
            <li className="nav-item mt-2">
              {!sidebarCollapsed && (
                <div 
                  className="d-flex justify-content-between align-items-center px-2 py-1 text-muted text-uppercase fw-bold cursor-pointer"
                  style={{ fontSize: '0.675rem', letterSpacing: '0.5px' }}
                  onClick={() => toggleSection('trainingMgmt')}
                >
                  <span>Training Management</span>
                  <i className={`bi bi-chevron-${expandedSections.trainingMgmt ? 'down' : 'right'}`}></i>
                </div>
              )}
              {expandedSections.trainingMgmt && (
                <ul className="nav flex-column ms-1 mt-1 gap-1">
                  <li>
                    <button 
                      className={`nav-link w-100 text-start d-flex align-items-center gap-2 py-1.5 px-2.5 rounded small ${activeView === 'batches' ? 'active bg-primary text-white fw-semibold' : 'text-secondary hover-bg-light'}`}
                      onClick={() => handleNavigate('batches')}
                    >
                      <i className="bi bi-layers-fill me-1"></i>
                      {!sidebarCollapsed && <span>Batch Management</span>}
                    </button>
                  </li>
                  <li>
                    <button 
                      className={`nav-link w-100 text-start d-flex align-items-center gap-2 py-1.5 px-2.5 rounded small ${activeView === 'instructors' ? 'active bg-primary text-white fw-semibold' : 'text-secondary hover-bg-light'}`}
                      onClick={() => handleNavigate('instructors')}
                    >
                      <i className="bi bi-person-badge-fill me-1"></i>
                      {!sidebarCollapsed && <span>Instructor Assignment</span>}
                    </button>
                  </li>
                  <li>
                    <button 
                      className={`nav-link w-100 text-start d-flex align-items-center gap-2 py-1.5 px-2.5 rounded small ${activeView === 'subjects' ? 'active bg-primary text-white fw-semibold' : 'text-secondary hover-bg-light'}`}
                      onClick={() => handleNavigate('subjects')}
                    >
                      <i className="bi bi-journal-text me-1"></i>
                      {!sidebarCollapsed && <span>Subject Management</span>}
                    </button>
                  </li>
                  <li>
                    <button 
                      className={`nav-link w-100 text-start d-flex align-items-center gap-2 py-1.5 px-2.5 rounded small ${activeView === 'lessons' ? 'active bg-primary text-white fw-semibold' : 'text-secondary hover-bg-light'}`}
                      onClick={() => handleNavigate('lessons')}
                    >
                      <i className="bi bi-list-task me-1"></i>
                      {!sidebarCollapsed && <span>Lesson Plans</span>}
                    </button>
                  </li>
                  <li>
                    <button 
                      className={`nav-link w-100 text-start d-flex align-items-center gap-2 py-1.5 px-2.5 rounded small ${activeView === 'calendar' ? 'active bg-primary text-white fw-semibold' : 'text-secondary hover-bg-light'}`}
                      onClick={() => handleNavigate('calendar')}
                    >
                      <i className="bi bi-calendar-range me-1"></i>
                      {!sidebarCollapsed && <span>Course Calendar</span>}
                    </button>
                  </li>
                  <li>
                    <button 
                      className={`nav-link w-100 text-start d-flex align-items-center gap-2 py-1.5 px-2.5 rounded small ${activeView === 'lesson-plan-docs' ? 'active bg-primary text-white fw-semibold' : 'text-secondary hover-bg-light'}`}
                      onClick={() => handleNavigate('lesson-plan-docs')}
                    >
                      <i className="bi bi-file-earmark-pdf-fill me-1"></i>
                      {!sidebarCollapsed && <span>Lesson Plan Documents</span>}
                    </button>
                  </li>
                </ul>
              )}
            </li>

            {/* SECTION 3: ASSESSMENT */}
            <li className="nav-item mt-2">
              {!sidebarCollapsed && (
                <div 
                  className="d-flex justify-content-between align-items-center px-2 py-1 text-muted text-uppercase fw-bold cursor-pointer"
                  style={{ fontSize: '0.675rem', letterSpacing: '0.5px' }}
                  onClick={() => toggleSection('assessment')}
                >
                  <span>Assessment</span>
                  <i className={`bi bi-chevron-${expandedSections.assessment ? 'down' : 'right'}`}></i>
                </div>
              )}
              {expandedSections.assessment && (
                <ul className="nav flex-column ms-1 mt-1 gap-1">
                  <li>
                    <button 
                      className={`nav-link w-100 text-start d-flex align-items-center gap-2 py-1.5 px-2.5 rounded small ${activeView === 'attendance' ? 'active bg-primary text-white fw-semibold' : 'text-secondary hover-bg-light'}`}
                      onClick={() => handleNavigate('attendance')}
                    >
                      <i className="bi bi-calendar-check me-1"></i>
                      {!sidebarCollapsed && <span>Attendance Registry</span>}
                    </button>
                  </li>
                  <li>
                    <button 
                      className={`nav-link w-100 text-start d-flex align-items-center gap-2 py-1.5 px-2.5 rounded small ${['examinations', 'phase-tests', 'final-exams'].includes(activeView) ? 'active bg-primary text-white fw-semibold' : 'text-secondary hover-bg-light'}`}
                      onClick={() => handleNavigate('examinations')}
                    >
                      <i className="bi bi-award me-1"></i>
                      {!sidebarCollapsed && <span>Examinations & Tests</span>}
                    </button>
                  </li>
                  <li>
                    <button 
                      className={`nav-link w-100 text-start d-flex align-items-center gap-2 py-1.5 px-2.5 rounded small ${activeView === 'results' ? 'active bg-primary text-white fw-semibold' : 'text-secondary hover-bg-light'}`}
                      onClick={() => handleNavigate('results')}
                    >
                      <i className="bi bi-bar-chart-line me-1"></i>
                      {!sidebarCollapsed && <span>Exam Marksheets</span>}
                    </button>
                  </li>
                </ul>
              )}
            </li>

            {/* SECTION 4: REPORTS */}
            <li className="nav-item mt-2 mb-3">
              {!sidebarCollapsed && (
                <div 
                  className="d-flex justify-content-between align-items-center px-2 py-1 text-muted text-uppercase fw-bold cursor-pointer"
                  style={{ fontSize: '0.675rem', letterSpacing: '0.5px' }}
                  onClick={() => toggleSection('reports')}
                >
                  <span>Reports</span>
                  <i className={`bi bi-chevron-${expandedSections.reports ? 'down' : 'right'}`}></i>
                </div>
              )}
              {expandedSections.reports && (
                <ul className="nav flex-column ms-1 mt-1 gap-1">
                  <li>
                    <button 
                      className={`nav-link w-100 text-start d-flex align-items-center gap-2 py-1.5 px-2.5 rounded small ${activeView === 'academic-reports' ? 'active bg-primary text-white fw-semibold' : 'text-secondary hover-bg-light'}`}
                      onClick={() => handleNavigate('academic-reports')}
                    >
                      <i className="bi bi-file-earmark-bar-graph me-1"></i>
                      {!sidebarCollapsed && <span>Academic Reports</span>}
                    </button>
                  </li>
                  <li>
                    <button 
                      className={`nav-link w-100 text-start d-flex align-items-center gap-2 py-1.5 px-2.5 rounded small ${activeView === 'classroom-reports' ? 'active bg-primary text-white fw-semibold' : 'text-secondary hover-bg-light'}`}
                      onClick={() => handleNavigate('classroom-reports')}
                    >
                      <i className="bi bi-pie-chart me-1"></i>
                      {!sidebarCollapsed && <span>Classroom Reports</span>}
                    </button>
                  </li>
                  <li>
                    <button 
                      className={`nav-link w-100 text-start d-flex align-items-center gap-2 py-1.5 px-2.5 rounded small ${activeView === 'instructor-reports' ? 'active bg-primary text-white fw-semibold' : 'text-secondary hover-bg-light'}`}
                      onClick={() => handleNavigate('instructor-reports')}
                    >
                      <i className="bi bi-person-lines-fill me-1"></i>
                      {!sidebarCollapsed && <span>Instructor Reports</span>}
                    </button>
                  </li>
                </ul>
              )}
            </li>
          </ul>
        </div>
      </aside>

      {/* Main Operational Area */}
      <main className="flex-grow-1 p-3 p-md-4 overflow-auto">
        {/* Top ERP Breadcrumb Header */}
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center pb-2 mb-3 border-bottom gap-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <button 
              className="btn btn-primary btn-sm d-lg-none d-inline-flex align-items-center gap-1.5 shadow-xs" 
              onClick={() => setMobileMenuOpen(true)}
              title="Open Academic Navigation Menu"
            >
              <i className="bi bi-layout-sidebar-inset"></i>
              <span>Academic Menu</span>
            </button>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb mb-0 small">
                <li className="breadcrumb-item text-muted d-none d-sm-inline">
                  <i className="bi bi-house-door me-1"></i>Academic
                </li>
                <li className="breadcrumb-item text-muted d-none d-md-inline">{breadcrumb.category}</li>
                <li className="breadcrumb-item active fw-bold text-primary" aria-current="page">{breadcrumb.title}</li>
              </ol>
            </nav>
          </div>
          
          <div className="d-flex align-items-center gap-2 ms-auto ms-sm-0">
            {activeView !== 'dashboard' && (
              <button className="btn btn-outline-secondary btn-sm fw-semibold" onClick={() => handleNavigate('dashboard')}>
                <i className="bi bi-speedometer2 me-1"></i> Dashboard
              </button>
            )}
          </div>
        </div>

        {/* Dynamic View Switcher */}
        {activeView === 'dashboard' && <AcademicDashboard onNavigate={handleNavigate} />}
        {activeView === 'trades' && <TradeManagement />}
        {activeView === 'courses' && <CourseManagement />}
        {activeView === 'classrooms' && <ClassroomManagement />}
        {activeView === 'batches' && <BatchManagement />}
        {activeView === 'instructors' && <InstructorAssignment />}
        {activeView === 'subjects' && <SubjectLessonManagement />}
        {activeView === 'lessons' && <SubjectLessonManagement />}
        {activeView === 'calendar' && <CourseCalendarManagement />}
        {activeView === 'lesson-plan-docs' && <LessonPlanDocuments />}
        {activeView === 'attendance' && <AssessmentManagement initialTab="attendance" />}
        {['examinations', 'phase-tests', 'final-exams'].includes(activeView) && (
          <AssessmentManagement initialTab="examinations" />
        )}
        {activeView === 'results' && <AssessmentManagement initialTab="results" />}
        {activeView === 'academic-reports' && <AcademicReports initialReportType="trade" />}
        {activeView === 'classroom-reports' && <AcademicReports initialReportType="classroom" />}
        {activeView === 'instructor-reports' && <AcademicReports initialReportType="instructor" />}
      </main>
    </div>
  )
}

export default AcademicModule
