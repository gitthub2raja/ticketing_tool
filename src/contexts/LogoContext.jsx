import { createContext, useContext, useState, useEffect } from 'react'
import { adminAPI } from '../services/api'

const LogoContext = createContext(null)

export const useLogo = () => {
  const context = useContext(LogoContext)
  if (!context) {
    throw new Error('useLogo must be used within LogoProvider')
  }
  return context
}

export const LogoProvider = ({ children }) => {
  const [logo, setLogo] = useState('/logo.svg') // Default fallback
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLogo()
  }, [])

  const loadLogo = async () => {
    try {
      const response = await adminAPI.getLogo()
      if (response.logo) {
        setLogo(response.logo)
      }
    } catch (error) {
      console.error('Failed to load logo:', error)
      // Keep default logo on error
    } finally {
      setLoading(false)
    }
  }

  const updateLogo = (newLogo) => {
    setLogo(newLogo)
  }

  return (
    <LogoContext.Provider value={{ logo, loading, updateLogo, reloadLogo: loadLogo }}>
      {children}
    </LogoContext.Provider>
  )
}

