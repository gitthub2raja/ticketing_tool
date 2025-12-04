import express from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { protect, admin } from '../middleware/auth.js'

const router = express.Router()

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '30d',
  })
}

// @route   POST /api/auth/login
// @desc    Authenticate user & get token (or tempToken if MFA enabled)
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    if (user.status !== 'active') {
      return res.status(401).json({ message: 'Account is inactive' })
    }

    if (user.password && !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // If MFA is enabled, return temporary token for MFA verification
    if (user.mfaEnabled) {
      // Generate temporary token (expires in 5 minutes)
      const tempToken = jwt.sign(
        { id: user._id, mfaRequired: true },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '5m' }
      )

      return res.json({
        tempToken,
        mfaRequired: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          mfaEnabled: true,
        },
      })
    }

    // Populate organization before returning
    await user.populate('organization', 'name domain')

    // If MFA is not enabled, return full token
    res.json({
      token: generateToken(user._id),
      mfaRequired: false,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        mfaEnabled: false,
        organization: user.organization,
      },
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    res.json({
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      mfaEnabled: req.user.mfaEnabled,
      status: req.user.status,
      organization: req.user.organization,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/auth/register
// @desc    Register new user (Admin only)
// @access  Private/Admin
router.post('/register', protect, admin, async (req, res) => {
  try {
    const { name, email, password, role } = req.body

    const userExists = await User.findOne({ email })
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' })
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'user',
    })

    res.status(201).json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/auth/create-demo-users
// @desc    Create demo users (admin, user, agent)
// @access  Public (for initial setup)
router.post('/create-demo-users', async (req, res) => {
  try {
    const demoUsers = [
      { name: 'Admin User', email: 'admin@example.com', password: 'admin123', role: 'admin' },
      { name: 'Regular User', email: 'user@example.com', password: 'user123', role: 'user' },
      { name: 'Agent User', email: 'agent@example.com', password: 'agent123', role: 'agent' },
    ]

    const createdUsers = []
    const existingUsers = []

    for (const userData of demoUsers) {
      const existing = await User.findOne({ email: userData.email })
      if (existing) {
        existingUsers.push(userData.email)
      } else {
        const user = await User.create({
          ...userData,
          status: 'active',
        })
        createdUsers.push({
          email: user.email,
          role: user.role,
        })
      }
    }

    res.status(200).json({
      message: 'Demo users processed',
      created: createdUsers,
      alreadyExists: existingUsers,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router

