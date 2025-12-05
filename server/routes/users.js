import express from 'express'
import User from '../models/User.js'
import { protect, admin } from '../middleware/auth.js'

const router = express.Router()

// @route   GET /api/users/mentions
// @desc    Get users for mentions (same organization)
// @access  Private
router.get('/mentions', protect, async (req, res) => {
  try {
    const query = { status: 'active' }
    
    // Users can only mention users from their organization
    if (req.user.organization) {
      query.organization = req.user.organization
    }
    
    const users = await User.find(query)
      .select('name email')
      .sort({ name: 1 })
    res.json(users)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   GET /api/users
// @desc    Get all users (filtered by organization for non-admins)
// @access  Private (Admin/Technician can access)
router.get('/', protect, async (req, res) => {
  try {
    const { organization } = req.query
    const query = {}
    
    // Admins can filter by organization or see all users
    if (req.user.role === 'admin') {
      if (organization) {
        query.organization = organization
      }
      // If no organization filter, admins see all users
    } else if (req.user.role === 'technician') {
      // Technicians can only see users from their organization
      // Handle both populated organization object and organization ID
      const userOrgId = req.user.organization?._id?.toString() || req.user.organization?.toString() || req.user.organization
      
      if (userOrgId) {
        query.organization = userOrgId
      } else {
        // If technician has no organization, return empty array
        console.log('Technician has no organization assigned:', req.user.email)
        return res.json([])
      }
    } else {
      // Regular users cannot access this endpoint
      return res.status(403).json({ message: 'Access denied' })
    }
    
    console.log('GET /api/users - User role:', req.user.role, 'Query:', JSON.stringify(query))
    
    const users = await User.find(query)
      .select('-password')
      .populate('organization', 'name')
      .populate('department', 'name')
      .sort({ createdAt: -1 })
    
    console.log('GET /api/users - Found users:', users.length)
    res.json(users)
  } catch (error) {
    console.error('GET /api/users - Error:', error)
    res.status(500).json({ message: error.message })
  }
})

// @route   GET /api/users/:id
// @desc    Get single user
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password')
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    res.json(user)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/users
// @desc    Create new user
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, email, password, role, status, organization, department } = req.body

    if (!password) {
      return res.status(400).json({ message: 'Password is required' })
    }

    if (!organization) {
      return res.status(400).json({ message: 'Organization is required' })
    }

    const userExists = await User.findOne({ email })
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' })
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'user',
      status: status || 'active',
      organization,
      department: department || null,
    })

    const populatedUser = await User.findById(user._id)
      .select('-password')
      .populate('organization', 'name')
      .populate('department', 'name')

    // Send welcome email to new user (async, don't wait)
    if (populatedUser.email) {
      import('../services/emailService.js').then(({ sendEmail }) => {
        const subject = 'Welcome to Ticketing Tool'
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1f2937;">Welcome to Ticketing Tool!</h2>
            <p>Hello ${populatedUser.name},</p>
            <p>Your account has been created successfully.</p>
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Email:</strong> ${populatedUser.email}</p>
              <p><strong>Role:</strong> ${populatedUser.role}</p>
              <p><strong>Organization:</strong> ${populatedUser.organization?.name || 'N/A'}</p>
              ${populatedUser.department ? `<p><strong>Department:</strong> ${populatedUser.department.name}</p>` : ''}
            </div>
            <p>You can now log in to the system and start creating tickets.</p>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost'}/login" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Login to Ticketing Tool</a></p>
            <p>Best regards,<br>Support Team</p>
          </div>
        `
        sendEmail(populatedUser.email, subject, html).catch(err => {
          console.error('Welcome email error:', err)
        })
      })
    }

    res.status(201).json({
      id: populatedUser._id,
      name: populatedUser.name,
      email: populatedUser.email,
      role: populatedUser.role,
      status: populatedUser.status,
      organization: populatedUser.organization,
      createdAt: populatedUser.createdAt,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const { name, email, role, status, password, organization, department } = req.body

    if (name) user.name = name
    if (email) user.email = email
    if (role) user.role = role
    if (status) user.status = status
    if (password) user.password = password
    if (organization) user.organization = organization
    if (department !== undefined) user.department = department || null

    await user.save()

    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('organization', 'name')
      .populate('department', 'name')

    res.json(updatedUser)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    await user.deleteOne()
    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router

