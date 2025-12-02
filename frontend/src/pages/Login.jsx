import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSSO } from '../contexts/SSOContext'
import { useLogo } from '../contexts/LogoContext'
import { useSound } from '../utils/soundEffects'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Mail, Lock, Shield, Sparkles, Eye, EyeOff } from 'lucide-react'
import { checkRateLimit, generateCSRFToken, setCSRFToken, validateEmail } from '../services/securityService'
import toast from 'react-hot-toast'

export const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [isFocused, setIsFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()
  const { ssoSettings } = useSSO()
  const { logo, showOnLogin, loginTitle } = useLogo()
  const { playClick, playConfirm } = useSound()
  const navigate = useNavigate()

  useEffect(() => {
    const csrfToken = generateCSRFToken()
    setCSRFToken(csrfToken)
    
    // Clear rate limit on component mount for development (can be removed in production)
    // Or add a button to clear rate limit if needed
    const clearRateLimit = () => {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('rate_limit_')) {
          localStorage.removeItem(key)
        }
      })
    }
    
    // Auto-clear rate limit after 15 minutes (for development)
    // In production, you might want to remove this or make it conditional
    const rateLimitKey = `rate_limit_login_${email}`
    const attempts = JSON.parse(localStorage.getItem(rateLimitKey) || '[]')
    const now = Date.now()
    const recentAttempts = attempts.filter(timestamp => now - timestamp < 15 * 60 * 1000)
    
    // If rate limit is active, show option to clear after timeout
    if (recentAttempts.length >= 5) {
      const oldestAttempt = Math.min(...recentAttempts)
      const timeRemaining = 15 * 60 * 1000 - (now - oldestAttempt)
      if (timeRemaining > 0) {
        setTimeout(() => {
          clearRateLimit()
        }, timeRemaining)
      }
    }
  }, [email])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)
    playConfirm()

    if (!validateEmail(email)) {
      setErrors({ email: 'Please enter a valid email address' })
      setLoading(false)
      return
    }

    const rateLimit = checkRateLimit(`login_${email}`, 5, 15 * 60 * 1000)
    if (!rateLimit.allowed) {
      // Calculate time remaining
      const attempts = JSON.parse(localStorage.getItem(`rate_limit_login_${email}`) || '[]')
      const now = Date.now()
      const recentAttempts = attempts.filter(t => now - t < 15 * 60 * 1000)
      const oldestAttempt = recentAttempts.length > 0 ? Math.min(...recentAttempts) : now
      const timeRemaining = Math.max(0, Math.ceil((15 * 60 * 1000 - (now - oldestAttempt)) / 1000 / 60))
      
      const errorToast = toast.error(
        `Too many login attempts. Please try again in ${timeRemaining} minutes.`, 
        {
          duration: 10000,
          id: 'rate-limit-error'
        }
      )
      
      // Add clear button for development
      setTimeout(() => {
        toast((t) => (
          <div className="flex items-center gap-2">
            <span>Rate limit active. Clear it?</span>
            <button
              onClick={() => {
                localStorage.removeItem(`rate_limit_login_${email}`)
                toast.dismiss(t.id)
                toast.success('Rate limit cleared! You can try again now.', { id: 'rate-limit-cleared' })
              }}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Clear Now
            </button>
          </div>
        ), { duration: 15000, id: 'rate-limit-clear' })
      }, 1000)
      
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
    <div 
      className="min-h-screen flex items-center justify-center p-8 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #a855f7 0%, #eab308 100%)',
      }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />
      </div>

      {/* Subtle background pattern */}
      <div 
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      {/* Transparent Login Card */}
      <div className="w-full max-w-md relative z-10">
        <div 
          className="rounded-3xl overflow-hidden backdrop-blur-xl border border-white/20"
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          }}
        >
          <div className="p-8 sm:p-10">
            {/* Logo inside card (if enabled) */}
            {logo && showOnLogin && (
              <div className="text-center mb-6">
                <div 
                  className="inline-block backdrop-blur-md p-4 rounded-xl border-2 border-white/40 shadow-lg"
                  style={{
                    background: 'rgba(255, 255, 255, 0.35)',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <img 
                    src={logo} 
                    alt="Logo" 
                    className="h-14 w-auto max-w-xs"
                    style={{
                      filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
                      maxHeight: '56px',
                      display: 'block',
                    }}
                    onError={(e) => {
                      e.target.src = '/logo.svg'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Welcome Message */}
            {loginTitle && (
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {loginTitle}
                </h1>
                <p className="text-sm text-gray-700">
                  Log in to access your ticketing system
                </p>
              </div>
            )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                >
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                      Email
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 transition-all duration-300">
                        <Mail size={18} className="text-gray-600" />
                      </div>
                      <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          setErrors({ ...errors, email: '' })
                          if (e.target.value) playClick()
                        }}
                        className={`w-full px-4 py-3 pl-10 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 ${errors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                        required
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1.5 text-sm text-red-600 animate-slide-down">{errors.email}</p>
                    )}
                  </div>
                </div>

                <div
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                >
                  <div className="mb-4">
                    <div className="mb-1.5">
                      <label className="block text-sm font-semibold text-gray-900">
                        Password
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                    </div>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 transition-all duration-300">
                        <Lock size={18} className="text-gray-600" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value)
                          setErrors({ ...errors, password: '' })
                          if (e.target.value) playClick()
                        }}
                        className={`w-full px-4 py-3 pl-10 pr-10 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300 ${errors.password ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowPassword(!showPassword)
                          playClick()
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1.5 text-sm text-red-600 animate-slide-down">{errors.password}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-gray-300 bg-white/20 text-primary-600 focus:ring-primary-500 focus:ring-offset-0 cursor-pointer transition-all duration-200 group-hover:scale-110" 
                      onChange={() => playClick()}
                    />
                    <span className="ml-2 text-sm text-gray-900 group-hover:text-gray-700 transition-colors">
                      Remember me
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  onClick={() => playClick()}
                  className="w-full px-6 py-3.5 bg-primary-600/90 backdrop-blur-md border border-primary-500/50 text-white rounded-xl font-semibold text-base shadow-lg shadow-primary-500/30 hover:bg-primary-600 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden group"
                >
                  {/* Button glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  
                  {/* Button content */}
                  <span className="relative flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <span className="animate-spin">⟳</span>
                        Signing in...
                      </>
                    ) : (
                      <>
                        <Shield size={18} className="group-hover:rotate-12 transition-transform duration-300" />
                        Log in
                        <Sparkles size={16} className="opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </>
                    )}
                  </span>
                </button>
              </form>

            {/* SSO Options */}
            {(ssoSettings.azureEnabled || ssoSettings.googleEnabled) && (
              <div className="mt-6 pt-6 border-t border-white/20">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/20"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-3 bg-transparent text-gray-700 text-xs font-medium">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {ssoSettings.googleEnabled && (
                      <button
                        type="button"
                        onClick={() => {
                          playClick()
                          navigate('/sso/google')
                        }}
                        className="w-full flex items-center justify-center space-x-3 py-2.5 px-4 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl hover:border-white/50 hover:bg-white/30 transition-all duration-300 group shadow-sm hover:shadow-md"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <span className="text-sm font-medium text-gray-900 group-hover:text-gray-700 transition-colors">
                          Google Workspace
                        </span>
                      </button>
                    )}
                    
                    {ssoSettings.azureEnabled && (
                      <button
                        type="button"
                        onClick={() => {
                          playClick()
                          navigate('/sso/azure')
                        }}
                        className="w-full flex items-center justify-center space-x-3 py-2.5 px-4 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl hover:border-white/50 hover:bg-white/30 transition-all duration-300 group shadow-sm hover:shadow-md"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M0 0h11.5v11.5H0V0z" fill="#F25022"/>
                          <path d="M11.5 0H23v11.5H11.5V0z" fill="#7FBA00"/>
                          <path d="M0 11.5h11.5V23H0V11.5z" fill="#00A4EF"/>
                          <path d="M11.5 11.5H23V23H11.5V11.5z" fill="#FFB900"/>
                        </svg>
                        <span className="text-sm font-medium text-gray-900 group-hover:text-gray-700 transition-colors">
                          Microsoft
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  )
}
