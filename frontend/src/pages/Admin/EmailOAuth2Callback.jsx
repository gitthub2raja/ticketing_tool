import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { emailAPI } from '../../services/api'
import toast from 'react-hot-toast'

export const EmailOAuth2Callback = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const type = searchParams.get('type') || 'smtp'
      const provider = searchParams.get('provider') || 'microsoft'
      
      if (!code) {
        toast.error('OAuth2 authorization failed: No authorization code received')
        navigate('/admin/email')
        return
      }

      try {
        const oauth2State = localStorage.getItem('oauth2_redirect')
        if (!oauth2State) {
          throw new Error('OAuth2 state not found')
        }
        
        const { redirectUri } = JSON.parse(oauth2State)
        localStorage.removeItem('oauth2_redirect')
        
        await emailAPI.handleOAuth2Callback({
          provider,
          type,
          code,
          redirectUri,
        })
        
        toast.success('OAuth2 authorization successful!')
        navigate('/admin/email')
      } catch (error) {
        console.error('OAuth2 callback error:', error)
        toast.error(error.message || 'OAuth2 authorization failed')
        navigate('/admin/email')
      }
    }

    handleCallback()
  }, [searchParams, navigate])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing OAuth2 authorization...</p>
      </div>
    </div>
  )
}

