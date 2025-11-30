/**
 * Chatbot Service
 * Handles chatbot logic, intent detection, and responses
 */

import FAQ from '../models/FAQ.js'
import Ticket from '../models/Ticket.js'
import ChatMessage from '../models/ChatMessage.js'
import ChatSession from '../models/ChatSession.js'
import User from '../models/User.js'
import Department from '../models/Department.js'

/**
 * Detect intent from user message
 */
export const detectIntent = async (message, userId, organizationId) => {
  const lowerMessage = message.toLowerCase().trim()

  // Check for ticket status queries
  if (lowerMessage.match(/status|where is|show.*ticket|ticket.*status/i)) {
    return { intent: 'check_status', confidence: 0.9 }
  }

  // Check for ticket creation
  if (lowerMessage.match(/create|new ticket|raise|report.*issue|need help/i)) {
    return { intent: 'create_ticket', confidence: 0.85 }
  }

  // Check for greeting
  if (lowerMessage.match(/^(hi|hello|hey|greetings|good morning|good afternoon|good evening)/i)) {
    return { intent: 'greeting', confidence: 0.95 }
  }

  // Check for escalation
  if (lowerMessage.match(/speak.*human|talk.*agent|escalate|transfer|connect.*support/i)) {
    return { intent: 'escalate', confidence: 0.9 }
  }

  // Check FAQ
  const faqMatch = await matchFAQ(lowerMessage, organizationId)
  if (faqMatch) {
    return { intent: 'faq', confidence: faqMatch.confidence, faq: faqMatch }
  }

  return { intent: 'unknown', confidence: 0.3 }
}

/**
 * Match message against FAQs
 */
const matchFAQ = async (message, organizationId) => {
  try {
    // Search in organization-specific FAQs first, then global
    const query = {
      isActive: true,
      $or: [
        { organization: organizationId },
        { organization: null },
      ],
    }

    const faqs = await FAQ.find(query)
      .sort({ priority: -1, viewCount: -1 })

    let bestMatch = null
    let bestScore = 0

    for (const faq of faqs) {
      let score = 0

      // Check keywords
      for (const keyword of faq.keywords || []) {
        if (message.includes(keyword.toLowerCase())) {
          score += 2
        }
      }

      // Check question similarity (simple word matching)
      const questionWords = faq.question.toLowerCase().split(/\s+/)
      const messageWords = message.split(/\s+/)
      const commonWords = questionWords.filter(word => messageWords.includes(word))
      score += commonWords.length * 0.5

      // Exact question match
      if (message.includes(faq.question.toLowerCase())) {
        score += 10
      }

      if (score > bestScore) {
        bestScore = score
        bestMatch = faq
      }
    }

    if (bestMatch && bestScore >= 2) {
      // Increment view count
      bestMatch.viewCount += 1
      await bestMatch.save()

      return {
        faq: bestMatch,
        confidence: Math.min(bestScore / 10, 0.95),
      }
    }

    return null
  } catch (error) {
    console.error('FAQ matching error:', error)
    return null
  }
}

/**
 * Generate bot response based on intent
 */
export const generateResponse = async (intent, session, message, userId) => {
  try {
    switch (intent.intent) {
      case 'greeting':
        return {
          content: "Hello! I'm here to help you with your support needs. You can:\n• Create a new ticket\n• Check ticket status\n• Ask common questions\n• Get help with IT issues\n\nHow can I assist you today?",
          quickActions: ['Create Ticket', 'Check Status', 'FAQ'],
        }

      case 'check_status':
        return await handleCheckStatus(userId, message)

      case 'create_ticket':
        return {
          content: "I can help you create a ticket! Please provide:\n1. A brief description of the issue\n2. Priority level (low/medium/high/urgent)\n3. Department (if known)\n\nOr you can use the 'Create Ticket' button for a form.",
          quickActions: ['Create Ticket'],
        }

      case 'faq':
        return {
          content: intent.faq.answer,
          faqId: intent.faq._id,
        }

      case 'escalate':
        return await handleEscalation(session)

      default:
        return {
          content: "I'm not sure I understand. Could you please rephrase? You can:\n• Create a ticket\n• Check ticket status\n• Ask a question\n• Request to speak with a technician",
          quickActions: ['Create Ticket', 'Check Status', 'Contact Support'],
        }
    }
  } catch (error) {
    console.error('Response generation error:', error)
    return {
      content: "I'm sorry, I encountered an error. Please try again or contact support.",
    }
  }
}

/**
 * Handle ticket status check
 */
const handleCheckStatus = async (userId, message) => {
  try {
    // Extract ticket ID if mentioned
    const ticketIdMatch = message.match(/#?(\d+)/)
    let tickets = []

    if (ticketIdMatch) {
      const ticketId = parseInt(ticketIdMatch[1])
      const ticket = await Ticket.findOne({ ticketId, creator: userId })
        .populate('assignee', 'name')
        .populate('department', 'name')

      if (ticket) {
        tickets = [ticket]
      }
    } else {
      // Get all user's open tickets
      tickets = await Ticket.find({
        creator: userId,
        status: { $in: ['open', 'approval-pending', 'approved', 'in-progress'] },
      })
        .populate('assignee', 'name')
        .populate('department', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
    }

    if (tickets.length === 0) {
      return {
        content: "I couldn't find any open tickets. Would you like to create a new ticket?",
        quickActions: ['Create Ticket'],
      }
    }

    const ticketsList = tickets.map(ticket => {
      const status = ticket.status.replace('-', ' ').toUpperCase()
      const assignee = ticket.assignee?.name || 'Unassigned'
      const department = ticket.department?.name || 'N/A'
      return `• Ticket #${ticket.ticketId}: ${ticket.title}\n  Status: ${status}\n  Assigned to: ${assignee}\n  Department: ${department}`
    }).join('\n\n')

    return {
      content: `Here are your tickets:\n\n${ticketsList}\n\nWould you like more details on any ticket?`,
      metadata: { tickets: tickets.map(t => t.ticketId) },
    }
  } catch (error) {
    console.error('Check status error:', error)
    return {
      content: "I couldn't retrieve your ticket status. Please try again or contact support.",
    }
  }
}

/**
 * Handle escalation to human agent
 */
const handleEscalation = async (session) => {
  try {
    // Update session status
    session.status = 'escalated'
    session.escalatedAt = new Date()
    await session.save()

    // Find available technician (simplified - in production, use more sophisticated routing)
    const technician = await User.findOne({
      role: 'technician',
      organization: session.organization,
    })

    if (technician) {
      session.assignedTo = technician._id
      await session.save()

      return {
        content: `I've escalated your conversation to ${technician.name}. They will respond shortly.`,
        metadata: { escalated: true, technicianId: technician._id },
      }
    }

    return {
      content: "I've noted your request to speak with a technician. A support agent will contact you soon. In the meantime, would you like to create a ticket?",
      quickActions: ['Create Ticket'],
    }
  } catch (error) {
    console.error('Escalation error:', error)
    return {
      content: "I've noted your request. A technician will be with you shortly.",
    }
  }
}

/**
 * Create ticket from chat
 */
export const createTicketFromChat = async (session, ticketData, userId) => {
  try {
    const Ticket = (await import('../models/Ticket.js')).default
    const User = (await import('../models/User.js')).default
    const SLAPolicy = (await import('../models/SLAPolicy.js')).default
    const { SLA_POLICIES } = await import('../config/sla.js')

    const user = await User.findById(userId)
    const priority = ticketData.priority || 'medium'
    const createdAt = new Date()

    // Get SLA policy
    let slaPolicy = null
    if (user.organization) {
      slaPolicy = await SLAPolicy.findOne({
        organization: user.organization,
        priority: priority,
        isActive: true,
      })
    }

    if (!slaPolicy) {
      slaPolicy = await SLAPolicy.findOne({
        organization: null,
        priority: priority,
        isActive: true,
      })
    }

    if (!slaPolicy) {
      slaPolicy = {
        responseTime: SLA_POLICIES[priority]?.responseTime || SLA_POLICIES.medium.responseTime,
        resolutionTime: SLA_POLICIES[priority]?.resolutionTime || SLA_POLICIES.medium.resolutionTime,
      }
    }

    const calculatedDueDate = new Date(createdAt)
    calculatedDueDate.setHours(calculatedDueDate.getHours() + slaPolicy.resolutionTime)

    const calculatedResponseDueDate = new Date(createdAt)
    calculatedResponseDueDate.setHours(calculatedResponseDueDate.getHours() + slaPolicy.responseTime)

    const ticket = await Ticket.create({
      title: ticketData.title,
      description: ticketData.description,
      category: ticketData.category || 'General',
      priority: priority,
      status: 'open',
      department: ticketData.department || null,
      creator: userId,
      organization: user.organization,
      dueDate: calculatedDueDate,
      responseDueDate: calculatedResponseDueDate,
      slaResponseTime: slaPolicy.responseTime,
      slaResolutionTime: slaPolicy.resolutionTime,
    })

    // Update session with ticket
    session.ticketId = ticket.ticketId
    session.ticket = ticket._id
    await session.save()

    return ticket
  } catch (error) {
    console.error('Create ticket from chat error:', error)
    throw error
  }
}

export default {
  detectIntent,
  generateResponse,
  createTicketFromChat,
}

