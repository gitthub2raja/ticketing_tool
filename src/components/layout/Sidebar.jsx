import { NavLink, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Ticket, 
  PlusCircle, 
  Settings, 
  Users, 
  Shield,
  Mail,
  User,
  LogOut,
  Image as ImageIcon,
  Building2,
  Tag,
  X
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useLogo } from '../../contexts/LogoContext'

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/tickets', icon: Ticket, label: 'Tickets' },
  { path: '/tickets/new', icon: PlusCircle, label: 'New Ticket' },
  { path: '/settings', icon: Settings, label: 'Settings' },
]

const adminMenuItems = [
  { path: '/admin/organizations', icon: Building2, label: 'Organizations' },
  { path: '/admin/users', icon: Users, label: 'Users' },
  { path: '/admin/categories', icon: Tag, label: 'Categories' },
  { path: '/admin/roles', icon: Shield, label: 'Roles' },
  { path: '/admin/email', icon: Mail, label: 'Email Settings' },
  { path: '/admin/sso', icon: Shield, label: 'SSO Configuration' },
  { path: '/admin/logo', icon: ImageIcon, label: 'Logo Management' },
]

const NavItem = ({ item, onClick, activeColor = 'cyan' }) => {
  const location = useLocation()
  const isActive = location.pathname === item.path
  const Icon = item.icon
  
  // Always use cyan color to match Dashboard
  const colorClasses = {
    active: 'bg-cyber-neon-cyan/20 text-cyber-neon-cyan font-bold glow-cyber border-2 border-cyber-neon-cyan/50',
    inactive: 'text-cyber-neon-cyan/80 hover:bg-cyber-neon-cyan/10 hover:text-cyber-neon-cyan hover:border-2 hover:border-cyber-neon-cyan/30',
    dot: 'bg-cyber-neon-cyan'
  }

  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      className={`flex items-center px-4 py-3 rounded-lg transition-all duration-300 relative group ${
        isActive ? colorClasses.active : colorClasses.inactive
      }`}
    >
      <Icon size={20} className="mr-3" />
      <span className="font-cyber uppercase tracking-wider text-sm">{item.label}</span>
      {isActive && (
        <div className={`absolute right-2 w-2 h-2 ${colorClasses.dot} rounded-full animate-glow-pulse`}></div>
      )}
    </NavLink>
  )
}

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth()
  const { logo } = useLogo()
  const isAdmin = user?.role === 'admin'

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-cyber-darker/90 backdrop-blur-sm z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-30 h-full w-64 bg-gradient-to-b from-cyber-darker to-cyber-dark border-r-2 border-cyber-neon-cyan/30 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } shadow-2xl shadow-cyber-glow-cyan/20`}
      >
        <div className="flex flex-col h-full relative">
          {/* Animated border glow */}
          <div className="absolute inset-0 border-2 border-cyber-neon-cyan/20 rounded-r-xl pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-cyber-neon-cyan/10 via-transparent to-transparent animate-shimmer"></div>
          </div>

          {/* Logo */}
          <div className="flex items-center justify-between h-20 px-6 border-b-2 border-cyber-neon-cyan/20 relative z-10">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyber-neon-cyan to-cyber-neon-blue rounded-lg flex items-center justify-center glow-cyber">
                <img 
                  src={logo} 
                  alt="Rezilyens" 
                  className="h-8 w-auto"
                  onError={(e) => {
                    e.target.src = '/logo.svg'
                  }}
                />
              </div>
              <span className="text-cyber-neon-cyan font-cyber font-bold text-lg neon-text">
                REZILYENS
              </span>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden text-cyber-neon-cyan/70 hover:text-cyber-neon-cyan transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto relative z-10">
            {menuItems.map((item) => (
              <NavItem
                key={item.path}
                item={item}
                onClick={() => window.innerWidth < 1024 && onClose()}
                activeColor="cyan"
              />
            ))}

            {isAdmin && (
              <>
                <div className="pt-6 mt-6 border-t-2 border-cyber-neon-cyan/20">
                  <p className="px-4 text-xs font-cyber font-bold text-cyber-neon-cyan/80 uppercase tracking-widest mb-3 neon-text">
                    Administration
                  </p>
                </div>
                {adminMenuItems.map((item) => (
                  <NavItem
                    key={item.path}
                    item={item}
                    onClick={() => window.innerWidth < 1024 && onClose()}
                    activeColor="cyan"
                  />
                ))}
              </>
            )}
          </nav>

          {/* User section */}
          <div className="border-t-2 border-cyber-neon-cyan/20 p-4 relative z-10">
            <NavLink
              to="/profile"
              onClick={() => window.innerWidth < 1024 && onClose()}
              className="flex items-center px-4 py-3 text-cyber-neon-cyan/80 rounded-lg hover:bg-cyber-neon-cyan/10 hover:text-cyber-neon-cyan transition-all duration-300 mb-2 group"
            >
              <User size={20} className="mr-3" />
              <span className="font-cyber uppercase tracking-wider text-sm">Profile</span>
            </NavLink>
            <button
              onClick={logout}
              className="w-full flex items-center px-4 py-3 text-red-400 rounded-lg hover:bg-red-500/10 hover:text-red-300 transition-all duration-300 group border-2 border-transparent hover:border-red-500/30"
            >
              <LogOut size={20} className="mr-3" />
              <span className="font-cyber uppercase tracking-wider text-sm">Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
