import React, { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import MobileTabBar from './MobileTabBar'

export const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Sidebar shows icons with labels by default; the user's choice is remembered on this device
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try { return localStorage.getItem('tts.sidebarCollapsed') === '1' } catch { return false }
  })
  useEffect(() => {
    try { localStorage.setItem('tts.sidebarCollapsed', isCollapsed ? '1' : '0') } catch { /* storage unavailable */ }
  }, [isCollapsed])
  const location = useLocation()

  // Close mobile sidebar automatically whenever location changes
  useEffect(() => {
    setSidebarOpen(false)
  }, [location])

  // Prevent background scrolling while mobile navigation drawer is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.classList.add('sidebar-open')
    } else {
      document.body.classList.remove('sidebar-open')
    }
    return () => {
      document.body.classList.remove('sidebar-open')
    }
  }, [sidebarOpen])

  return (
    <div className="d-flex bg-app min-vh-100 position-relative overflow-x-hidden">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(prev => !prev)}
      />
      <div className="w-100 min-vh-100 d-flex flex-column">
        <Navbar 
          onToggleSidebar={() => setSidebarOpen(prev => !prev)} 
          isCollapsed={isCollapsed}
        />
        <main className={`main-wrapper px-3 px-md-4 pb-4 flex-grow-1 ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Outlet />
        </main>
        <MobileTabBar onOpenMenu={() => setSidebarOpen(true)} />
      </div>
    </div>
  )
}
export default Layout
