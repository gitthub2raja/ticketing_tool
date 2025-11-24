import express from 'express'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

// @route   GET /api/mfa/setup
// @desc    Generate MFA secret and QR code
// @access  Private
router.get('/setup', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `${user.email} (Ticketing Tool)`,
      issuer: 'Ticketing Tool',
    })

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url)

    // Store secret temporarily (don't enable MFA yet)
    user.mfaSecret = secret.base32
    await user.save()

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/mfa/verify
// @desc    Verify MFA code and enable MFA
// @access  Private
router.post('/verify', protect, async (req, res) => {
  try {
    const { token } = req.body

    if (!token || token.length !== 6) {
      return res.status(400).json({ message: 'Invalid verification code' })
    }

    const user = await User.findById(req.user._id).select('+mfaSecret')
    
    if (!user || !user.mfaSecret) {
      return res.status(400).json({ message: 'MFA setup not initiated. Please start setup first.' })
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: token,
      window: 2, // Allow 2 time steps (60 seconds) before/after
    })

    if (!verified) {
      return res.status(400).json({ message: 'Invalid verification code' })
    }

    // Enable MFA
    user.mfaEnabled = true
    await user.save()

    res.json({ 
      message: 'MFA enabled successfully',
      mfaEnabled: true,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/mfa/disable
// @desc    Disable MFA for user
// @access  Private
router.post('/disable', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    user.mfaEnabled = false
    user.mfaSecret = null
    await user.save()

    res.json({ 
      message: 'MFA disabled successfully',
      mfaEnabled: false,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/mfa/verify-login
// @desc    Verify MFA code during login and return full token
// @access  Public (but requires valid tempToken)
router.post('/verify-login', async (req, res) => {
  try {
    const { tempToken, code } = req.body

    if (!tempToken) {
      return res.status(401).json({ message: 'Temporary token required' })
    }

    if (!code || code.length !== 6) {
      return res.status(400).json({ message: 'Invalid verification code' })
    }

    // Verify tempToken
    let decoded
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET || 'your-secret-key')
    } catch (error) {
      return res.status(401).json({ message: 'Invalid or expired session. Please login again.' })
    }

    if (!decoded.mfaRequired || !decoded.id) {
      return res.status(400).json({ message: 'Invalid token for MFA verification' })
    }

    const user = await User.findById(decoded.id).select('+mfaSecret')
    
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return res.status(400).json({ message: 'MFA is not enabled for this account' })
    }

    // Verify MFA code
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 2, // Allow 2 time steps (60 seconds) before/after
    })

    if (!verified) {
      return res.status(400).json({ message: 'Invalid verification code' })
    }

    // Generate full JWT token
    const fullToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    )

    res.json({ 
      message: 'MFA verification successful',
      token: fullToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        mfaEnabled: user.mfaEnabled,
      },
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router

