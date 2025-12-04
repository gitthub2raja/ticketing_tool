import express from 'express'
import Organization from '../models/Organization.js'
import User from '../models/User.js'
import Ticket from '../models/Ticket.js'
import { protect, admin } from '../middleware/auth.js'

const router = express.Router()

// @route   GET /api/organizations
// @desc    Get all organizations
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    const organizations = await Organization.find().sort({ createdAt: -1 })
    res.json(organizations)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   GET /api/organizations/:id
// @desc    Get single organization with stats
// @access  Private/Admin
router.get('/:id', protect, admin, async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id)
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' })
    }

    // Get stats
    const userCount = await User.countDocuments({ organization: organization._id })
    const ticketCount = await Ticket.countDocuments({ organization: organization._id })
    const openTicketCount = await Ticket.countDocuments({ 
      organization: organization._id, 
      status: 'open' 
    })

    res.json({
      ...organization.toObject(),
      stats: {
        users: userCount,
        tickets: ticketCount,
        openTickets: openTicketCount,
      },
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/organizations
// @desc    Create new organization
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, domain, description, status, settings } = req.body

    const orgExists = await Organization.findOne({ name })
    if (orgExists) {
      return res.status(400).json({ message: 'Organization with this name already exists' })
    }

    if (domain) {
      const domainExists = await Organization.findOne({ domain })
      if (domainExists) {
        return res.status(400).json({ message: 'Organization with this domain already exists' })
      }
    }

    const organization = await Organization.create({
      name,
      domain: domain || null,
      description: description || '',
      status: status || 'active',
      settings: settings || {
        allowSelfRegistration: false,
        defaultRole: 'user',
      },
    })

    res.status(201).json(organization)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   PUT /api/organizations/:id
// @desc    Update organization
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id)
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' })
    }

    const { name, domain, description, status, settings } = req.body

    if (name && name !== organization.name) {
      const orgExists = await Organization.findOne({ name })
      if (orgExists) {
        return res.status(400).json({ message: 'Organization with this name already exists' })
      }
      organization.name = name
    }

    if (domain && domain !== organization.domain) {
      const domainExists = await Organization.findOne({ domain })
      if (domainExists) {
        return res.status(400).json({ message: 'Organization with this domain already exists' })
      }
      organization.domain = domain
    }

    if (description !== undefined) organization.description = description
    if (status) organization.status = status
    if (settings) organization.settings = { ...organization.settings, ...settings }

    await organization.save()
    res.json(organization)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   DELETE /api/organizations/:id
// @desc    Delete organization
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id)
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' })
    }

    // Check if organization has users or tickets
    const userCount = await User.countDocuments({ organization: organization._id })
    const ticketCount = await Ticket.countDocuments({ organization: organization._id })

    if (userCount > 0 || ticketCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete organization with existing users or tickets. Please remove them first.' 
      })
    }

    await organization.deleteOne()
    res.json({ message: 'Organization deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router

