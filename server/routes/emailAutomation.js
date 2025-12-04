/**
 * Email Automation Management Routes
 * Admin Only
 */

import express from 'express'
import EmailAutomation from '../models/EmailAutomation.js'
import { protect, admin } from '../middleware/auth.js'
import { runAutomationManually } from '../workers/emailAutomationWorker.js'

const router = express.Router()

// All routes require admin access
router.use(protect, admin)

/**
 * @route   GET /api/email-automation
 * @desc    Get all email automations
 * @access  Private/Admin
 */
router.get('/', async (req, res) => {
  try {
    const { organization } = req.query
    const query = {}

    if (organization) {
      query.organization = organization
    } else {
      query.$or = [
        { organization: null },
        { organization: { $exists: false } },
      ]
    }

    const automations = await EmailAutomation.find(query)
      .populate('organization', 'name')
      .populate('emailTemplate', 'name')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })

    res.json(automations)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   GET /api/email-automation/:id
 * @desc    Get email automation by ID
 * @access  Private/Admin
 */
router.get('/:id', async (req, res) => {
  try {
    const automation = await EmailAutomation.findById(req.params.id)
      .populate('organization', 'name')
      .populate('emailTemplate', 'name subject')
      .populate('createdBy', 'name email')

    if (!automation) {
      return res.status(404).json({ message: 'Automation not found' })
    }

    res.json(automation)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/email-automation
 * @desc    Create email automation
 * @access  Private/Admin
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      type,
      organization,
      isEnabled,
      schedule,
      recipients,
      reportFormat,
      emailTemplate,
    } = req.body

    if (!name || !type) {
      return res.status(400).json({ message: 'Name and type are required' })
    }

    const automationData = {
      name,
      type,
      organization: organization || null,
      isEnabled: isEnabled !== undefined ? isEnabled : true,
      schedule: schedule || {
        time: '09:00',
        timezone: 'UTC',
        dayOfWeek: type === 'weekly-report' ? 1 : null, // Monday
        dayOfMonth: type === 'monthly-report' ? 1 : null, // 1st of month
      },
      recipients: recipients || {
        admins: true,
        organizationManagers: true,
        departmentHeads: true,
        technicians: type === 'daily-open-tickets',
      },
      reportFormat: reportFormat || ['html'],
      emailTemplate: emailTemplate || null,
      createdBy: req.user._id,
    }

    const automation = await EmailAutomation.create(automationData)

    res.status(201).json(automation)
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Automation with this type and organization already exists' })
    }
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   PUT /api/email-automation/:id
 * @desc    Update email automation
 * @access  Private/Admin
 */
router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      isEnabled,
      schedule,
      recipients,
      reportFormat,
      emailTemplate,
    } = req.body

    const automation = await EmailAutomation.findById(req.params.id)

    if (!automation) {
      return res.status(404).json({ message: 'Automation not found' })
    }

    if (name) automation.name = name
    if (isEnabled !== undefined) automation.isEnabled = isEnabled
    if (schedule) automation.schedule = { ...automation.schedule, ...schedule }
    if (recipients) automation.recipients = { ...automation.recipients, ...recipients }
    if (reportFormat) automation.reportFormat = reportFormat
    if (emailTemplate !== undefined) automation.emailTemplate = emailTemplate

    await automation.save()

    res.json(automation)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   DELETE /api/email-automation/:id
 * @desc    Delete email automation
 * @access  Private/Admin
 */
router.delete('/:id', async (req, res) => {
  try {
    const automation = await EmailAutomation.findById(req.params.id)

    if (!automation) {
      return res.status(404).json({ message: 'Automation not found' })
    }

    await automation.deleteOne()

    res.json({ message: 'Automation deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/email-automation/:id/run
 * @desc    Run automation manually (for testing)
 * @access  Private/Admin
 */
router.post('/:id/run', async (req, res) => {
  try {
    const result = await runAutomationManually(req.params.id)
    res.json({ success: true, result })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router

