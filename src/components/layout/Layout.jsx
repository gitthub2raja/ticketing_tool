import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { CyberGrid3D } from '../ui/CyberGrid3D'

export const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <CyberGrid3D />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64 relative z-10">
        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 relative z-10">
          {children}
        </main>
      </div>
    </div>
  )
}
