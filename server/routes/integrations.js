/**
 * External API Integration Routes
 * Manage external integrations, webhooks, and Azure Sentinel
 */

import express from 'express'
import ExternalIntegration from '../models/ExternalIntegration.js'
import Ticket from '../models/Ticket.js'
import User from '../models/User.js'
import { protect, admin } from '../middleware/auth.js'

const router = express.Router()

// All routes require authentication
router.use(protect)

/**
 * @route   GET /api/integrations
 * @desc    Get all integrations
 * @access  Private/Admin
 */
router.get('/', admin, async (req, res) => {
  try {
    const { organization, type } = req.query
    const query = {}

    if (organization) {
      query.organization = organization
    }
    if (type) {
      query.type = type
    }

    const integrations = await ExternalIntegration.find(query)
      .populate('organization', 'name')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })

    res.json(integrations)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   GET /api/integrations/:id
 * @desc    Get integration by ID
 * @access  Private/Admin
 */
router.get('/:id', admin, async (req, res) => {
  try {
    const integration = await ExternalIntegration.findById(req.params.id)
      .populate('organization', 'name')
      .populate('createdBy', 'name email')

    if (!integration) {
      return res.status(404).json({ message: 'Integration not found' })
    }

    res.json(integration)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/integrations
 * @desc    Create new integration
 * @access  Private/Admin
 */
router.post('/', admin, async (req, res) => {
  try {
    const {
      name,
      type,
      description,
      config,
      organization,
      isActive,
    } = req.body

    if (!name || !type) {
      return res.status(400).json({ message: 'Name and type are required' })
    }

    const integration = await ExternalIntegration.create({
      name,
      type,
      description: description || '',
      config: config || {},
      organization: organization || null,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user._id,
    })

    const populated = await ExternalIntegration.findById(integration._id)
      .populate('organization', 'name')
      .populate('createdBy', 'name email')

    res.status(201).json(populated)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   PUT /api/integrations/:id
 * @desc    Update integration
 * @access  Private/Admin
 */
router.put('/:id', admin, async (req, res) => {
  try {
    const integration = await ExternalIntegration.findById(req.params.id)

    if (!integration) {
      return res.status(404).json({ message: 'Integration not found' })
    }

    const {
      name,
      description,
      config,
      isActive,
    } = req.body

    if (name) integration.name = name
    if (description !== undefined) integration.description = description
    if (config) integration.config = { ...integration.config, ...config }
    if (isActive !== undefined) integration.isActive = isActive

    await integration.save()

    const populated = await ExternalIntegration.findById(integration._id)
      .populate('organization', 'name')
      .populate('createdBy', 'name email')

    res.json(populated)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   DELETE /api/integrations/:id
 * @desc    Delete integration
 * @access  Private/Admin
 */
router.delete('/:id', admin, async (req, res) => {
  try {
    const integration = await ExternalIntegration.findById(req.params.id)

    if (!integration) {
      return res.status(404).json({ message: 'Integration not found' })
    }

    await integration.deleteOne()
    res.json({ message: 'Integration deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/integrations/webhook/:webhookId
 * @desc    Webhook endpoint for external integrations (Azure Sentinel, etc.)
 * @access  Public (authenticated via webhook URL)
 */
router.post('/webhook/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params
    const webhookUrl = `/api/integrations/webhook/${webhookId}`

    const integration = await ExternalIntegration.findOne({
      webhookUrl,
      isActive: true,
    })

    if (!integration) {
      return res.status(404).json({ message: 'Webhook not found or inactive' })
    }

    // Update trigger stats
    integration.lastTriggered = new Date()
    integration.triggerCount = (integration.triggerCount || 0) + 1
    await integration.save()

    // Process based on integration type
    if (integration.type === 'azure-sentinel') {
      await processAzureSentinelAlert(req.body, integration)
    } else {
      await processGenericWebhook(req.body, integration)
    }

    res.json({ success: true, message: 'Webhook processed successfully' })
  } catch (error) {
    console.error('Webhook processing error:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * Process Azure Sentinel alert and create ticket
 */
const processAzureSentinelAlert = async (alertData, integration) => {
  try {
    // Map Azure Sentinel alert to ticket fields
    const mapping = integration.config.fieldMapping || {}
    
    // Default Azure Sentinel alert structure
    const alert = alertData.data || alertData
    
    // Extract ticket information
    const title = alert[mapping.title] || alert.AlertDisplayName || alert.Title || 'Azure Sentinel Alert'
    const description = alert[mapping.description] || alert.Description || JSON.stringify(alert, null, 2)
    const severity = alert[mapping.severity] || alert.Severity || alert.SeverityName || 'medium'
    const category = alert[mapping.category] || alert.Category || 'Security'
    const alertId = alert[mapping.alertId] || alert.AlertId || alert.SystemAlertId || null
    
    // Map severity to priority
    const priorityMap = {
      'Critical': 'urgent',
      'High': 'high',
      'Medium': 'medium',
      'Low': 'low',
      'Informational': 'low',
    }
    const priority = priorityMap[severity] || 'medium'

    // Check if ticket already exists for this alert
    if (alertId) {
      const existingTicket = await Ticket.findOne({
        'metadata.azureSentinelAlertId': alertId,
      })
      
      if (existingTicket) {
        console.log(`Ticket already exists for Azure Sentinel alert: ${alertId}`)
        return existingTicket
      }
    }

    // Get or create system user for Azure Sentinel
    let systemUser = await User.findOne({ email: 'azure-sentinel@system.local' })
    if (!systemUser) {
      systemUser = await User.create({
        name: 'Azure Sentinel',
        email: 'azure-sentinel@system.local',
        password: null,
        role: 'user',
        status: 'active',
      })
    }

    // Create ticket
    const ticketData = {
      title: title.length > 100 ? title.substring(0, 100) : title,
      description: `**Azure Sentinel Alert**\n\n${description}\n\n**Alert Details:**\n\`\`\`json\n${JSON.stringify(alert, null, 2)}\n\`\`\``,
      category: category,
      priority: priority,
      creator: systemUser._id,
      status: 'open',
      assignee: null,
      organization: integration.organization || null,
      metadata: {
        source: 'azure-sentinel',
        azureSentinelAlertId: alertId,
        integrationId: integration._id.toString(),
        rawAlert: alert,
      },
      comments: [{
        author: systemUser._id,
        content: `Alert received from Azure Sentinel integration: ${integration.name}`,
      }],
    }

    const ticket = await Ticket.create(ticketData)
    console.log(`✅ Created ticket #${ticket.ticketId} from Azure Sentinel alert: ${alertId || 'N/A'}`)

    return ticket
  } catch (error) {
    console.error('Error processing Azure Sentinel alert:', error)
    throw error
  }
}

/**
 * Process generic webhook and create ticket
 */
const processGenericWebhook = async (webhookData, integration) => {
  try {
    const mapping = integration.config.fieldMapping || {}
    
    const title = webhookData[mapping.title] || webhookData.title || 'Webhook Alert'
    const description = webhookData[mapping.description] || webhookData.description || JSON.stringify(webhookData, null, 2)
    const priority = webhookData[mapping.priority] || webhookData.priority || 'medium'
    const category = webhookData[mapping.category] || webhookData.category || 'General'

    // Get or create system user
    let systemUser = await User.findOne({ email: 'webhook@system.local' })
    if (!systemUser) {
      systemUser = await User.create({
        name: 'Webhook System',
        email: 'webhook@system.local',
        password: null,
        role: 'user',
        status: 'active',
      })
    }

    const ticketData = {
      title: title.length > 100 ? title.substring(0, 100) : title,
      description: `**Webhook Alert from ${integration.name}**\n\n${description}`,
      category: category,
      priority: priority,
      creator: systemUser._id,
      status: 'open',
      assignee: null,
      organization: integration.organization || null,
      metadata: {
        source: 'webhook',
        integrationId: integration._id.toString(),
        rawData: webhookData,
      },
      comments: [{
        author: systemUser._id,
        content: `Alert received from webhook integration: ${integration.name}`,
      }],
    }

    const ticket = await Ticket.create(ticketData)
    console.log(`✅ Created ticket #${ticket.ticketId} from webhook: ${integration.name}`)

    return ticket
  } catch (error) {
    console.error('Error processing webhook:', error)
    throw error
  }
}

export default router

