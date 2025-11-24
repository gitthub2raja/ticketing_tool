import { Menu, Bell, Search } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { ThemeToggle } from '../ui/ThemeToggle'

export const TopBar = ({ onMenuClick }) => {
  const { user } = useAuth()

  return (
    <header 
      className="backdrop-blur-md border-b-2 h-16 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10 shadow-lg transition-all duration-300"
      style={{
        background: 'var(--bg-surface)',
        borderColor: 'var(--border-color)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1), 0 0 1px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div className="flex items-center space-x-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden theme-icon focus:outline-none transition-all duration-300 hover:scale-110"
        >
          <Menu size={24} />
        </button>
        
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10" size={20} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search tickets..."
            className="pl-10 pr-4 py-2 input w-64 font-mono"
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <ThemeToggle />
        <button className="relative theme-icon focus:outline-none transition-all duration-300 hover:scale-110">
          <Bell size={24} />
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 animate-pulse" style={{ borderColor: 'var(--bg-secondary)' }}></span>
        </button>
        
        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-cyber font-semibold" style={{ color: 'var(--text-primary)' }}>{user?.name || 'User'}</p>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{user?.email || ''}</p>
          </div>
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center font-cyber font-bold border-2 transition-all duration-300 hover:scale-110"
            style={{
              background: 'var(--gradient-accent)',
              color: 'white',
              borderColor: 'var(--border-hover)',
              boxShadow: '0 0 15px var(--shadow-glow)',
            }}
          >
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
      </div>
    </header>
  )
}
