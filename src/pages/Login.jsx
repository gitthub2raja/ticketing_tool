import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSSO } from '../contexts/SSOContext'
import { useLogo } from '../contexts/LogoContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { CyberGrid3D } from '../components/ui/CyberGrid3D'
import { Mail, Lock, Shield } from 'lucide-react'
import { checkRateLimit, generateCSRFToken, setCSRFToken, validateEmail } from '../services/securityService'
import toast from 'react-hot-toast'

export const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const { login } = useAuth()
  const { ssoSettings } = useSSO()
  const { logo } = useLogo()
  const navigate = useNavigate()

  useEffect(() => {
    const csrfToken = generateCSRFToken()
    setCSRFToken(csrfToken)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)

    if (!validateEmail(email)) {
      setErrors({ email: 'Please enter a valid email address' })
      setLoading(false)
      return
    }

    const rateLimit = checkRateLimit(`login_${email}`, 5, 15 * 60 * 1000)
    if (!rateLimit.allowed) {
      toast.error('Too many login attempts. Please try again in 15 minutes.')
      setLoading(false)
      return
    }

    try {
      const response = await login(email, password)
      
      if (response.mfaRequired && response.tempToken) {
        navigate('/mfa-login', { 
          state: { 
            tempToken: response.tempToken,
            email: email 
          } 
        })
      } else {
        toast.success('Login successful!')
        navigate('/dashboard')
      }
    } catch (error) {
      setErrors({ password: error.message || 'Invalid email or password' })
      toast.error(error.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-cyber-dark">
      <CyberGrid3D />
      
      {/* Enhanced 3D animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating 3D orbs with depth */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-cyber-neon-cyan/10 rounded-full blur-3xl animate-float" style={{ 
          transform: 'translateZ(0)',
          animation: 'float 8s ease-in-out infinite',
        }}></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyber-neon-purple/10 rounded-full blur-3xl animate-float" style={{ 
          animationDelay: '2s',
          animation: 'float 10s ease-in-out infinite',
        }}></div>
        <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-cyber-neon-blue/8 rounded-full blur-3xl animate-float" style={{ 
          animationDelay: '4s',
          animation: 'float 12s ease-in-out infinite',
        }}></div>
        
        {/* Holographic glitch layers */}
        <div className="absolute inset-0 opacity-30" style={{
          background: 'linear-gradient(45deg, transparent 30%, rgba(0, 255, 255, 0.03) 50%, transparent 70%)',
          backgroundSize: '200% 200%',
          animation: 'shimmer 4s linear infinite',
        }}></div>
        
        {/* Depth layers with perspective */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 30% 50%, rgba(0, 255, 255, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 50%, rgba(128, 0, 255, 0.08) 0%, transparent 50%)',
          transform: 'perspective(1000px) rotateX(5deg)',
          transformStyle: 'preserve-3d',
        }}></div>
      </div>

      <div className="w-full max-w-md relative z-10 px-4">
        <div className="text-center mb-8">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-cyber-neon-cyan/20 blur-2xl rounded-full"></div>
              <img 
                src={logo} 
                alt="Secure Access Portal" 
                className="h-24 w-auto relative z-10"
                onError={(e) => {
                  e.target.src = '/logo.svg'
                }}
              />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-digital font-bold text-cyber-neon-cyan mb-2 uppercase tracking-[0.15em] sm:tracking-[0.2em] whitespace-nowrap overflow-hidden" 
              style={{
                textShadow: '0 0 10px rgba(0, 255, 255, 0.8), 0 0 20px rgba(0, 255, 255, 0.6), 0 0 30px rgba(0, 255, 255, 0.4)',
                letterSpacing: '0.15em',
                fontVariantNumeric: 'tabular-nums',
                filter: 'drop-shadow(0 0 8px rgba(0, 255, 255, 0.5))',
              }}>
            SECURE ACCESS PORTAL
          </h1>
        </div>

        <Card className="cyber-3d">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              type="email"
              label="Email Address"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setErrors({ ...errors, email: '' })
              }}
              error={errors.email}
              required
              icon={<Mail size={20} />}
            />

            <Input
              type="password"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setErrors({ ...errors, password: '' })
              }}
              error={errors.password}
              required
              icon={<Lock size={20} />}
            />

            <div className="flex items-center">
              <label className="flex items-center cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-2 border-cyber-neon-cyan/50 bg-cyber-darker text-cyber-neon-cyan focus:ring-cyber-neon-cyan focus:ring-offset-cyber-dark cursor-pointer" 
                />
                <span className="ml-2 text-sm text-cyber-neon-cyan/80 font-mono uppercase tracking-wider group-hover:text-cyber-neon-cyan transition-colors">
                  Remember me
                </span>
              </label>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin mr-2">⟳</span>
                  Authenticating...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <Shield size={18} className="mr-2" />
                  Access System
                </span>
              )}
            </Button>
          </form>

          {(ssoSettings.azureEnabled || ssoSettings.googleEnabled) && (
            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-cyber-neon-cyan/20"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-cyber-darker text-cyber-neon-cyan/60 font-cyber uppercase tracking-widest">
                    OR CONTINUE WITH
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {ssoSettings.googleEnabled && (
                  <button
                    onClick={() => navigate('/sso/google')}
                    className="w-full flex items-center justify-center space-x-3 py-3 px-4 bg-cyber-darker/50 border-2 border-cyber-neon-cyan/30 rounded-lg hover:bg-cyber-neon-cyan/10 hover:border-cyber-neon-cyan transition-all duration-300 group"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="text-sm font-cyber font-semibold text-cyber-neon-cyan uppercase tracking-wider group-hover:text-cyber-neon-cyan">
                      Google Workspace
                    </span>
                  </button>
                )}
                
                {ssoSettings.azureEnabled && (
                  <button
                    onClick={() => navigate('/sso/azure')}
                    className="w-full flex items-center justify-center space-x-3 py-3 px-4 bg-cyber-darker/50 border-2 border-cyber-neon-cyan/30 rounded-lg hover:bg-cyber-neon-cyan/10 hover:border-cyber-neon-cyan transition-all duration-300 group"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11.5 0L0 4.5V11.5C0 17.3 4.2 22.5 11.5 23C18.8 22.5 23 17.3 23 11.5V4.5L11.5 0Z" fill="#F25022"/>
                      <path d="M11.5 0L23 4.5V11.5C23 17.3 18.8 22.5 11.5 23V0Z" fill="#7FBA00"/>
                      <path d="M11.5 0L0 4.5V11.5C0 17.3 4.2 22.5 11.5 23V0Z" fill="#00A4EF"/>
                      <path d="M11.5 0L0 4.5L11.5 11.5L23 4.5L11.5 0Z" fill="#FFB900"/>
                    </svg>
                    <span className="text-sm font-cyber font-semibold text-cyber-neon-cyan uppercase tracking-wider group-hover:text-cyber-neon-cyan">
                      Azure AD
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
