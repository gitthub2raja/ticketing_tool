import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { SSOProvider } from './contexts/SSOContext'
import { LogoProvider } from './contexts/LogoContext'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ErrorBoundary } from './components/ErrorBoundary'

// Auth Pages
import { Login } from './pages/Login'
import { AzureLogin } from './pages/SSO/Azure'
import { GoogleWorkspaceLogin } from './pages/SSO/GoogleWorkspace'
import { MFASetup } from './pages/MFASetup'
import { MFALogin } from './pages/MFALogin'

// Main Pages
import { Dashboard } from './pages/Dashboard'
import { TicketList } from './pages/Tickets/TicketList'
import { NewTicket } from './pages/Tickets/NewTicket'
import { TicketDetail } from './pages/Tickets/TicketDetail'
import { Profile } from './pages/Profile'
import { Settings } from './pages/Settings'

// Admin Pages
import { Users } from './pages/Admin/Users'
import { Roles } from './pages/Admin/Roles'
import { EmailSettings } from './pages/Admin/EmailSettings'
import { SSOConfig } from './pages/Admin/SSOConfig'
import { LogoManagement } from './pages/Admin/LogoManagement'
import { Organizations } from './pages/Admin/Organizations'
import { Categories } from './pages/Admin/Categories'

const AppContent = () => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <Router>
      <ErrorBoundary>
        <div className="App">
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: isDark ? '#0a0e27' : '#ffffff',
                color: isDark ? '#00ffff' : '#1e293b',
                border: isDark 
                  ? '2px solid rgba(0, 255, 255, 0.3)' 
                  : '2px solid rgba(37, 99, 235, 0.3)',
                borderRadius: '12px',
                fontFamily: 'Orbitron, monospace',
                boxShadow: isDark
                  ? '0 0 20px rgba(0, 255, 255, 0.3), 0 8px 32px rgba(0, 0, 0, 0.3)'
                  : '0 0 20px rgba(37, 99, 235, 0.2), 0 8px 32px rgba(0, 0, 0, 0.1)',
                backdropFilter: 'blur(20px)',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#059669',
                  secondary: isDark ? '#0a0e27' : '#ffffff',
                },
                style: {
                  border: '2px solid rgba(5, 150, 105, 0.4)',
                  boxShadow: isDark
                    ? '0 0 20px rgba(5, 150, 105, 0.4), 0 8px 32px rgba(0, 0, 0, 0.3)'
                    : '0 0 20px rgba(5, 150, 105, 0.3), 0 8px 32px rgba(0, 0, 0, 0.1)',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: isDark ? '#0a0e27' : '#ffffff',
                },
                style: {
                  border: '2px solid rgba(239, 68, 68, 0.4)',
                  boxShadow: isDark
                    ? '0 0 20px rgba(239, 68, 68, 0.4), 0 8px 32px rgba(0, 0, 0, 0.3)'
                    : '0 0 20px rgba(239, 68, 68, 0.3), 0 8px 32px rgba(0, 0, 0, 0.1)',
                },
              },
            }}
          />
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/mfa-login" element={<MFALogin />} />
              <Route path="/sso/azure" element={<AzureLogin />} />
              <Route path="/sso/google" element={<GoogleWorkspaceLogin />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets"
              element={
                <ProtectedRoute>
                  <TicketList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets/new"
              element={
                <ProtectedRoute>
                  <NewTicket />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets/:id"
              element={
                <ProtectedRoute>
                  <TicketDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mfa-setup"
              element={
                <ProtectedRoute>
                  <MFASetup />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin/organizations"
              element={
                <ProtectedRoute requireAdmin>
                  <Organizations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requireAdmin>
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/categories"
              element={
                <ProtectedRoute requireAdmin>
                  <Categories />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/roles"
              element={
                <ProtectedRoute requireAdmin>
                  <Roles />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/email"
              element={
                <ProtectedRoute requireAdmin>
                  <EmailSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sso"
              element={
                <ProtectedRoute requireAdmin>
                  <SSOConfig />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/logo"
              element={
                <ProtectedRoute requireAdmin>
                  <LogoManagement />
                </ProtectedRoute>
              }
            />

            {/* Default Route */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </ErrorBoundary>
    </Router>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SSOProvider>
          <LogoProvider>
            <AppContent />
          </LogoProvider>
        </SSOProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App

