import express from 'express'
import SSOConfig from '../models/SSOConfig.js'
import EmailSettings from '../models/EmailSettings.js'
import Logo from '../models/Logo.js'
import Role from '../models/Role.js'
import { protect, admin } from '../middleware/auth.js'

const router = express.Router()

// SSO Configuration Routes
router.get('/sso', protect, admin, async (req, res) => {
  try {
    const configs = await SSOConfig.find()
    res.json(configs)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/sso', protect, admin, async (req, res) => {
  try {
    const { provider, enabled, config } = req.body
    let ssoConfig = await SSOConfig.findOne({ provider })

    if (ssoConfig) {
      ssoConfig.enabled = enabled
      ssoConfig.config = { ...ssoConfig.config, ...config }
      await ssoConfig.save()
    } else {
      ssoConfig = await SSOConfig.create({ provider, enabled, config })
    }

    res.json(ssoConfig)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Email Settings Routes
router.get('/email', protect, admin, async (req, res) => {
  try {
    const settings = await EmailSettings.getSettings()
    res.json(settings)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.put('/email', protect, admin, async (req, res) => {
  try {
    const settings = await EmailSettings.getSettings()
    const { smtp, imap } = req.body

    if (smtp) {
      // Trim credentials to remove accidental spaces (important for App Passwords)
      const trimmedUsername = smtp.username ? smtp.username.trim() : ''
      const trimmedPassword = smtp.password ? smtp.password.trim() : ''
      
      // Check if Office365
      const isOffice365 = smtp.host && (
        smtp.host.includes('office365.com') || 
        smtp.host.includes('outlook.com')
      )
      
      // For Office365: secure should be false (uses STARTTLS on port 587)
      // For other providers: secure is true for SSL (port 465)
      let secure = false
      if (!isOffice365) {
        secure = smtp.encryption === 'ssl' || (smtp.encryption === 'tls' && smtp.port === '465')
      }
      
      settings.smtp = {
        ...settings.smtp,
        host: smtp.host ? smtp.host.trim() : '',
        port: parseInt(smtp.port) || 587,
        secure: secure,
        auth: {
          user: trimmedUsername,
          pass: trimmedPassword,
        },
        fromEmail: smtp.fromEmail ? smtp.fromEmail.trim() : '',
        fromName: smtp.fromName ? smtp.fromName.trim() : '',
        enabled: true,
      }
    }
    
    if (imap) {
      // Convert encryption to secure boolean
      const secure = imap.encryption === 'ssl' || imap.encryption === 'tls'
      
      // Trim credentials to remove accidental spaces
      const trimmedUsername = imap.username ? imap.username.trim() : ''
      const trimmedPassword = imap.password ? imap.password.trim() : ''
      
      settings.imap = {
        ...settings.imap,
        host: imap.host ? imap.host.trim() : '',
        port: imap.port,
        secure: secure,
        auth: {
          user: trimmedUsername,
          pass: trimmedPassword,
        },
        folder: imap.folder || 'INBOX',
        enabled: true,
      }
    }

    await settings.save()
    res.json(settings)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Logo Routes
router.get('/logo', async (req, res) => {
  try {
    const logo = await Logo.getLogo()
    if (!logo) {
      return res.json({ logo: null, filename: null })
    }
    res.json({ 
      logo: logo.logo,
      filename: logo.filename,
      createdAt: logo.createdAt,
      updatedAt: logo.updatedAt,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/logo', protect, admin, async (req, res) => {
  try {
    const { logo, filename } = req.body
    
    // Find existing logo or create new one
    let existingLogo = await Logo.findOne().sort({ createdAt: -1 })
    
    if (existingLogo) {
      // Update existing logo
      existingLogo.logo = logo
      if (filename) existingLogo.filename = filename
      await existingLogo.save()
      res.json({ logo: existingLogo.logo })
    } else {
      // Create new logo if none exists
      const newLogo = await Logo.create({ logo, filename: filename || 'logo' })
      res.json({ logo: newLogo.logo })
    }
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Roles Routes
router.get('/roles', protect, admin, async (req, res) => {
  try {
    const roles = await Role.find()
    res.json(roles)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/roles', protect, admin, async (req, res) => {
  try {
    const role = await Role.create(req.body)
    res.status(201).json(role)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.put('/roles/:id', protect, admin, async (req, res) => {
  try {
    const role = await Role.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!role) {
      return res.status(404).json({ message: 'Role not found' })
    }
    res.json(role)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.delete('/roles/:id', protect, admin, async (req, res) => {
  try {
    const role = await Role.findByIdAndDelete(req.params.id)
    if (!role) {
      return res.status(404).json({ message: 'Role not found' })
    }
    res.json({ message: 'Role deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router

