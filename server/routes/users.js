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
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    const { organization } = req.query
    const query = {}
    
    // Filter by organization if provided (admins can filter)
    if (organization) {
      query.organization = organization
    }
    
    const users = await User.find(query)
      .select('-password')
      .populate('organization', 'name')
      .sort({ createdAt: -1 })
    res.json(users)
  } catch (error) {
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
    const { name, email, password, role, status, organization } = req.body

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
    })

    const populatedUser = await User.findById(user._id)
      .select('-password')
      .populate('organization', 'name')

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

    const { name, email, role, status, password, organization } = req.body

    if (name) user.name = name
    if (email) user.email = email
    if (role) user.role = role
    if (status) user.status = status
    if (password) user.password = password
    if (organization) user.organization = organization

    await user.save()

    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('organization', 'name')

    res.json({
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.status,
      organization: updatedUser.organization,
    })
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

