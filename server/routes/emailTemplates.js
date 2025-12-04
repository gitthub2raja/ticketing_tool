/**
 * Email Template Management Routes
 * Admin Only
 */

import express from 'express'
import EmailTemplate from '../models/EmailTemplate.js'
import { protect, admin } from '../middleware/auth.js'

const router = express.Router()

// All routes require admin access
router.use(protect, admin)

/**
 * @route   GET /api/email-templates
 * @desc    Get all email templates
 * @access  Private/Admin
 */
router.get('/', async (req, res) => {
  try {
    const { organization, type } = req.query
    const query = {}

    if (organization) {
      query.organization = organization
    } else {
      // Show global templates if no org specified
      query.$or = [
        { organization: null },
        { organization: { $exists: false } },
      ]
    }

    if (type) {
      query.type = type
    }

    const templates = await EmailTemplate.find(query)
      .populate('organization', 'name')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })

    res.json(templates)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   GET /api/email-templates/:id
 * @desc    Get email template by ID
 * @access  Private/Admin
 */
router.get('/:id', async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id)
      .populate('organization', 'name')
      .populate('createdBy', 'name email')

    if (!template) {
      return res.status(404).json({ message: 'Template not found' })
    }

    res.json(template)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/email-templates
 * @desc    Create email template
 * @access  Private/Admin
 */
router.post('/', async (req, res) => {
  try {
    const { name, type, subject, htmlBody, textBody, organization, variables } = req.body

    if (!name || !type || !subject || !htmlBody) {
      return res.status(400).json({ message: 'Name, type, subject, and htmlBody are required' })
    }

    const templateData = {
      name,
      type,
      subject,
      htmlBody,
      textBody: textBody || '',
      organization: organization || null,
      variables: variables || [],
      createdBy: req.user._id,
    }

    const template = await EmailTemplate.create(templateData)

    res.status(201).json(template)
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Template with this type and organization already exists' })
    }
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   PUT /api/email-templates/:id
 * @desc    Update email template
 * @access  Private/Admin
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, subject, htmlBody, textBody, isActive, variables } = req.body

    const template = await EmailTemplate.findById(req.params.id)

    if (!template) {
      return res.status(404).json({ message: 'Template not found' })
    }

    if (name) template.name = name
    if (subject) template.subject = subject
    if (htmlBody) template.htmlBody = htmlBody
    if (textBody !== undefined) template.textBody = textBody
    if (isActive !== undefined) template.isActive = isActive
    if (variables) template.variables = variables

    await template.save()

    res.json(template)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   DELETE /api/email-templates/:id
 * @desc    Delete email template
 * @access  Private/Admin
 */
router.delete('/:id', async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id)

    if (!template) {
      return res.status(404).json({ message: 'Template not found' })
    }

    await template.deleteOne()

    res.json({ message: 'Template deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/email-templates/:id/preview
 * @desc    Preview email template with sample data
 * @access  Private/Admin
 */
router.post('/:id/preview', async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id)

    if (!template) {
      return res.status(404).json({ message: 'Template not found' })
    }

    // Generate sample data based on template type
    const sampleData = generateSampleData(template.type)

    // Render template (simplified - in production, use proper templating engine)
    let rendered = template.htmlBody
    Object.keys(sampleData).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      rendered = rendered.replace(regex, JSON.stringify(sampleData[key]))
    })

    res.json({ html: rendered, subject: template.subject })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * Generate sample data for template preview
 */
const generateSampleData = (type) => {
  const baseData = {
    date: new Date().toLocaleDateString(),
    period: 'Sample',
  }

  switch (type) {
    case 'daily-open-tickets':
      return {
        ...baseData,
        tickets: [
          { ticketId: 1001, title: 'Sample Ticket 1', priority: 'high', department: { name: 'IT Support' }, assignee: { name: 'John Doe' }, dueDate: new Date(), createdAt: new Date() },
          { ticketId: 1002, title: 'Sample Ticket 2', priority: 'medium', department: { name: 'HR' }, assignee: null, dueDate: null, createdAt: new Date() },
        ],
      }
    case 'daily-report':
      return {
        ...baseData,
        totalCreated: 10,
        totalOpen: 5,
        totalResolved: 3,
        slaBreached: 1,
        departmentSummary: [{ departmentName: 'IT Support', count: 5 }, { departmentName: 'HR', count: 3 }],
      }
    case 'weekly-report':
      return {
        ...baseData,
        startDate: 'Jan 01, 2024',
        endDate: 'Jan 07, 2024',
        totalCreated: 50,
        resolved: 30,
        unresolved: 20,
        slaCompliant: 45,
        slaBreached: 5,
        technicianPerformance: [{ name: 'John Doe', total: 10, resolved: 8 }],
        topIssues: [{ _id: 'Hardware Issue', count: 10 }],
      }
    case 'monthly-report':
      return {
        ...baseData,
        month: 'January 2024',
        totalCreated: 200,
        departmentTrends: [{ departmentName: 'IT Support', count: 100 }],
        slaViolations: 10,
        slaComplianceRate: 95,
        technicianProductivity: [{ name: 'John Doe', total: 50, resolved: 45, resolutionRate: 90 }],
        recurringIssues: [{ _id: 'Hardware Issue', count: 20 }],
      }
    default:
      return baseData
  }
}

export default router

