/**
 * Microsoft Teams Integration Routes
 * Admin Only
 */

import express from 'express'
import TeamsConfig from '../models/TeamsConfig.js'
import { protect, admin } from '../middleware/auth.js'
import { testTeamsWebhook } from '../services/teamsService.js'

const router = express.Router()

// All routes require admin access
router.use(protect, admin)

/**
 * @route   GET /api/teams/config
 * @desc    Get Teams configuration
 * @access  Private/Admin
 */
router.get('/config', async (req, res) => {
  try {
    const { organization } = req.query
    const query = organization ? { organization } : { organization: null }

    let config = await TeamsConfig.findOne(query)
      .populate('organization', 'name')
      .populate('departmentRouting.department', 'name')
      .populate('createdBy', 'name email')

    if (!config) {
      // Return default config
      config = {
        isEnabled: false,
        webhookUrl: '',
        botId: '',
        tenantId: '',
        channelId: '',
        channelName: '',
        notifications: {
          ticketCreated: true,
          ticketUpdated: true,
          ticketResolved: true,
          ticketClosed: true,
          slaBreach: true,
          ticketAssigned: true,
          ticketCommented: false,
        },
        workingHours: {
          enabled: false,
          startTime: '09:00',
          endTime: '17:00',
          timezone: 'UTC',
          daysOfWeek: [1, 2, 3, 4, 5], // Monday-Friday
        },
        departmentRouting: [],
      }
    }

    res.json(config)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/teams/config
 * @desc    Create or update Teams configuration
 * @access  Private/Admin
 */
router.post('/config', async (req, res) => {
  try {
    const {
      organization,
      isEnabled,
      webhookUrl,
      botId,
      tenantId,
      channelId,
      channelName,
      notifications,
      workingHours,
      departmentRouting,
    } = req.body

    const query = organization ? { organization } : { organization: null }

    let config = await TeamsConfig.findOne(query)

    const configData = {
      organization: organization || null,
      isEnabled: isEnabled !== undefined ? isEnabled : false,
      webhookUrl: webhookUrl || null,
      botId: botId || null,
      tenantId: tenantId || null,
      channelId: channelId || null,
      channelName: channelName || null,
      notifications: notifications || {
        ticketCreated: true,
        ticketUpdated: true,
        ticketResolved: true,
        ticketClosed: true,
        slaBreach: true,
        ticketAssigned: true,
        ticketCommented: false,
      },
      workingHours: workingHours || {
        enabled: false,
        startTime: '09:00',
        endTime: '17:00',
        timezone: 'UTC',
        daysOfWeek: [1, 2, 3, 4, 5],
      },
      departmentRouting: departmentRouting || [],
      createdBy: req.user._id,
    }

    if (config) {
      // Update existing config
      Object.assign(config, configData)
      await config.save()
    } else {
      // Create new config
      config = await TeamsConfig.create(configData)
    }

    const updatedConfig = await TeamsConfig.findById(config._id)
      .populate('organization', 'name')
      .populate('departmentRouting.department', 'name')

    res.json(updatedConfig)
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Teams configuration already exists for this organization' })
    }
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   PUT /api/teams/config/:id
 * @desc    Update Teams configuration
 * @access  Private/Admin
 */
router.put('/config/:id', async (req, res) => {
  try {
    const {
      isEnabled,
      webhookUrl,
      botId,
      tenantId,
      channelId,
      channelName,
      notifications,
      workingHours,
      departmentRouting,
    } = req.body

    const config = await TeamsConfig.findById(req.params.id)

    if (!config) {
      return res.status(404).json({ message: 'Configuration not found' })
    }

    if (isEnabled !== undefined) config.isEnabled = isEnabled
    if (webhookUrl !== undefined) config.webhookUrl = webhookUrl
    if (botId !== undefined) config.botId = botId
    if (tenantId !== undefined) config.tenantId = tenantId
    if (channelId !== undefined) config.channelId = channelId
    if (channelName !== undefined) config.channelName = channelName
    if (notifications) config.notifications = { ...config.notifications, ...notifications }
    if (workingHours) config.workingHours = { ...config.workingHours, ...workingHours }
    if (departmentRouting) config.departmentRouting = departmentRouting

    await config.save()

    const updatedConfig = await TeamsConfig.findById(config._id)
      .populate('organization', 'name')
      .populate('departmentRouting.department', 'name')

    res.json(updatedConfig)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/teams/test
 * @desc    Test Teams webhook
 * @access  Private/Admin
 */
router.post('/test', async (req, res) => {
  try {
    const { webhookUrl } = req.body

    if (!webhookUrl) {
      return res.status(400).json({ message: 'Webhook URL is required' })
    }

    const result = await testTeamsWebhook(webhookUrl)

    // Update last tested time if config exists
    const { organization } = req.query
    const query = organization ? { organization } : { organization: null }
    const config = await TeamsConfig.findOne(query)
    if (config) {
      config.lastTested = new Date()
      await config.save()
    }

    res.json({ success: true, message: 'Test message sent successfully' })
  } catch (error) {
    console.error('Teams webhook test error:', error)
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to send test message to Teams' 
    })
  }
})

/**
 * @route   DELETE /api/teams/config/:id
 * @desc    Delete Teams configuration
 * @access  Private/Admin
 */
router.delete('/config/:id', async (req, res) => {
  try {
    const config = await TeamsConfig.findById(req.params.id)

    if (!config) {
      return res.status(404).json({ message: 'Configuration not found' })
    }

    await config.deleteOne()

    res.json({ message: 'Teams configuration deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/teams/webhook
 * @desc    Receive webhook from Teams (for bot interactions)
 * @access  Public (Teams will call this)
 */
router.post('/webhook', express.json(), async (req, res) => {
  try {
    // Handle Teams bot webhook
    // This endpoint receives messages from Teams when users interact with the bot
    
    const { type, value } = req.body

    // Respond to Teams ping
    if (type === 'ping') {
      return res.json({ type: 'pong' })
    }

    // Handle message from Teams
    if (type === 'message') {
      // Process Teams message
      // This would integrate with the chatbot or ticket creation system
      console.log('Teams webhook received:', value)
      
      // For now, just acknowledge
      res.json({ type: 'message', text: 'Message received' })
    }

    res.json({ status: 'ok' })
  } catch (error) {
    console.error('Teams webhook handler error:', error)
    res.status(500).json({ message: error.message })
  }
})

export default router

