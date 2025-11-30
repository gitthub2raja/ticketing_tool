/**
 * Chatbot API Routes
 */

import express from 'express'
import ChatSession from '../models/ChatSession.js'
import ChatMessage from '../models/ChatMessage.js'
import { protect } from '../middleware/auth.js'
import { detectIntent, generateResponse, createTicketFromChat } from '../services/chatbot.js'
import upload from '../middleware/upload.js'

const router = express.Router()

/**
 * @route   POST /api/chatbot/session
 * @desc    Create or get chat session
 * @access  Private
 */
router.post('/session', protect, async (req, res) => {
  try {
    // Find active session or create new one
    let session = await ChatSession.findOne({
      user: req.user._id,
      status: { $in: ['active', 'escalated'] },
    })
      .populate('assignedTo', 'name email')
      .populate('department', 'name')

    if (!session) {
      session = await ChatSession.create({
        user: req.user._id,
        organization: req.user.organization,
        metadata: {
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip,
          platform: req.body.platform || 'web',
        },
      })
    }

    // Get messages
    const messages = await ChatMessage.find({ session: session._id })
      .populate('senderId', 'name email')
      .sort({ createdAt: 1 })

    res.json({
      session: {
        _id: session._id,
        sessionId: session.sessionId,
        status: session.status,
        assignedTo: session.assignedTo,
        department: session.department,
        ticketId: session.ticketId,
        createdAt: session.createdAt,
      },
      messages,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/chatbot/message
 * @desc    Send message to chatbot
 * @access  Private
 */
router.post('/message', protect, upload.array('attachments', 5), async (req, res) => {
  try {
    const { message, sessionId } = req.body

    if (!message && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ message: 'Message or attachment is required' })
    }

    // Get or create session
    let session = await ChatSession.findOne({
      $or: [
        { sessionId },
        { user: req.user._id, status: { $in: ['active', 'escalated'] } },
      ],
    })

    if (!session) {
      session = await ChatSession.create({
        user: req.user._id,
        organization: req.user.organization,
        metadata: {
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip,
          platform: req.body.platform || 'web',
        },
      })
    }

    // Handle attachments
    const attachments = (req.files || []).map(file => ({
      filename: file.filename,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
    }))

    // Create user message
    const userMessage = await ChatMessage.create({
      session: session._id,
      sender: 'user',
      senderId: req.user._id,
      content: message || 'File attachment',
      messageType: attachments.length > 0 ? 'file' : 'text',
      attachments,
    })

    // Detect intent
    const intent = await detectIntent(message || 'file', req.user._id, req.user.organization)

    // Generate bot response
    const botResponse = await generateResponse(intent, session, message || 'file', req.user._id)

    // Create bot message
    const botMessage = await ChatMessage.create({
      session: session._id,
      sender: 'bot',
      content: botResponse.content,
      messageType: botResponse.messageType || 'text',
      intent: intent.intent,
      confidence: intent.confidence,
      metadata: botResponse.metadata || {},
    })

    // Update session
    session.messages.push(userMessage._id, botMessage._id)
    await session.save()

    res.json({
      userMessage,
      botMessage: {
        ...botMessage.toObject(),
        quickActions: botResponse.quickActions,
        faqId: botResponse.faqId,
      },
    })
  } catch (error) {
    console.error('Chatbot message error:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/chatbot/create-ticket
 * @desc    Create ticket from chat
 * @access  Private
 */
router.post('/create-ticket', protect, async (req, res) => {
  try {
    const { sessionId, title, description, priority, category, department } = req.body

    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' })
    }

    // Get session
    const session = await ChatSession.findOne({
      $or: [
        { sessionId },
        { user: req.user._id, status: { $in: ['active', 'escalated'] } },
      ],
    })

    if (!session) {
      return res.status(404).json({ message: 'Chat session not found' })
    }

    // Create ticket
    const ticket = await createTicketFromChat(session, {
      title,
      description,
      priority: priority || 'medium',
      category: category || 'General',
      department,
    }, req.user._id)

    // Create system message
    const systemMessage = await ChatMessage.create({
      session: session._id,
      sender: 'bot',
      content: `Ticket #${ticket.ticketId} has been created successfully! You can track its status here or ask me anytime.`,
      messageType: 'ticket_created',
      metadata: { ticketId: ticket.ticketId },
    })

    session.messages.push(systemMessage._id)
    await session.save()

    res.json({
      ticket,
      message: systemMessage,
    })
  } catch (error) {
    console.error('Create ticket from chat error:', error)
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   GET /api/chatbot/history
 * @desc    Get chat history (for admins/technicians)
 * @access  Private
 */
router.get('/history', protect, async (req, res) => {
  try {
    const { userId, sessionId, limit = 50 } = req.query
    const query = {}

    // Regular users can only see their own chats
    if (req.user.role === 'user') {
      query.user = req.user._id
    } else if (userId) {
      query.user = userId
    }

    if (sessionId) {
      query.sessionId = sessionId
    }

    const sessions = await ChatSession.find(query)
      .populate('user', 'name email')
      .populate('assignedTo', 'name email')
      .populate('department', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))

    res.json(sessions)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   GET /api/chatbot/session/:sessionId
 * @desc    Get chat session details
 * @access  Private
 */
router.get('/session/:sessionId', protect, async (req, res) => {
  try {
    const session = await ChatSession.findOne({ sessionId: req.params.sessionId })
      .populate('user', 'name email')
      .populate('assignedTo', 'name email')
      .populate('department', 'name')
      .populate('ticket', 'ticketId title status')

    if (!session) {
      return res.status(404).json({ message: 'Session not found' })
    }

    // Check access
    if (req.user.role === 'user' && session.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' })
    }

    const messages = await ChatMessage.find({ session: session._id })
      .populate('senderId', 'name email')
      .sort({ createdAt: 1 })

    res.json({
      session,
      messages,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/chatbot/escalate
 * @desc    Escalate chat to technician
 * @access  Private
 */
router.post('/escalate', protect, async (req, res) => {
  try {
    const { sessionId, departmentId } = req.body

    const session = await ChatSession.findOne({
      $or: [
        { sessionId },
        { user: req.user._id, status: 'active' },
      ],
    })

    if (!session) {
      return res.status(404).json({ message: 'Session not found' })
    }

    session.status = 'escalated'
    session.escalatedAt = new Date()

    if (departmentId) {
      session.department = departmentId
    }

    // Find available technician
    const Department = (await import('../models/Department.js')).default
    const User = (await import('../models/User.js')).default

    if (departmentId) {
      const department = await Department.findById(departmentId)
      if (department?.head) {
        session.assignedTo = department.head
      }
    } else {
      const technician = await User.findOne({
        role: 'technician',
        organization: session.organization,
      })
      if (technician) {
        session.assignedTo = technician._id
      }
    }

    await session.save()

    // Create system message
    const systemMessage = await ChatMessage.create({
      session: session._id,
      sender: 'system',
      content: 'Your conversation has been escalated to a technician. They will respond shortly.',
      messageType: 'system',
    })

    res.json({
      session,
      message: systemMessage,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router

