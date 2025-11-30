/**
 * SLA Engine - Automated SLA monitoring and escalation
 * Handles:
 * - SLA breach detection
 * - Escalation emails
 * - Auto status updates
 * - Notifications to department heads
 */

import Ticket from '../models/Ticket.js'
import User from '../models/User.js'
import Department from '../models/Department.js'
import { sendEmail } from '../services/emailService.js'
import { checkSLAStatus } from '../config/sla.js'

/**
 * Check all tickets for SLA breaches and escalate
 */
export const checkSLACompliance = async () => {
  try {
    const now = new Date()
    
    // Find all active tickets (open, approval-pending, approved, in-progress)
    const activeTickets = await Ticket.find({
      status: { $in: ['open', 'approval-pending', 'approved', 'in-progress'] }
    })
      .populate('creator', 'name email')
      .populate('assignee', 'name email')
      .populate('department', 'name head')
      .populate('organization', 'name')

    const breaches = []
    const warnings = []

    for (const ticket of activeTickets) {
      // Check response SLA
      if (ticket.responseDueDate) {
        const responseStatus = checkSLAStatus(
          ticket.createdAt,
          ticket.responseDueDate,
          ticket.status
        )

        // Check if response is overdue
        if (responseStatus.isOverdue && !ticket.slaResponseBreached) {
          ticket.slaResponseBreached = true
          ticket.slaResponseBreachedAt = now
          breaches.push({
            ticket,
            type: 'response',
            dueDate: ticket.responseDueDate,
          })
        }

        // Check if response is approaching deadline (80% of time elapsed)
        const timeElapsed = now.getTime() - ticket.createdAt.getTime()
        const totalTime = ticket.responseDueDate.getTime() - ticket.createdAt.getTime()
        const percentageElapsed = (timeElapsed / totalTime) * 100

        if (percentageElapsed >= 80 && !ticket.slaResponseWarningSent) {
          ticket.slaResponseWarningSent = true
          warnings.push({
            ticket,
            type: 'response',
            percentageElapsed,
          })
        }
      }

      // Check resolution SLA
      if (ticket.dueDate) {
        const resolutionStatus = checkSLAStatus(
          ticket.createdAt,
          ticket.dueDate,
          ticket.status
        )

        // Check if resolution is overdue
        if (resolutionStatus.isOverdue && !ticket.slaResolutionBreached) {
          ticket.slaResolutionBreached = true
          ticket.slaResolutionBreachedAt = now
          breaches.push({
            ticket,
            type: 'resolution',
            dueDate: ticket.dueDate,
          })
        }

        // Check if resolution is approaching deadline (80% of time elapsed)
        const timeElapsed = now.getTime() - ticket.createdAt.getTime()
        const totalTime = ticket.dueDate.getTime() - ticket.createdAt.getTime()
        const percentageElapsed = (timeElapsed / totalTime) * 100

        if (percentageElapsed >= 80 && !ticket.slaResolutionWarningSent) {
          ticket.slaResolutionWarningSent = true
          warnings.push({
            ticket,
            type: 'resolution',
            percentageElapsed,
          })
        }
      }

      await ticket.save()
    }

    // Send escalation emails for breaches
    for (const breach of breaches) {
      await sendSLAEscalationEmail(breach)
      
      // Send Teams notification (async)
      import('./teamsService.js').then(({ notifySLABreach }) => {
        const ticketOrg = breach.ticket.organization?._id || breach.ticket.organization
        notifySLABreach(breach.ticket, breach.type === 'response' ? 'Response' : 'Resolution', ticketOrg)
          .catch(err => console.error('Teams SLA breach notification error:', err))
      })
    }

    // Send warning emails
    for (const warning of warnings) {
      await sendSLAWarningEmail(warning)
    }

    return {
      checked: activeTickets.length,
      breaches: breaches.length,
      warnings: warnings.length,
    }
  } catch (error) {
    console.error('SLA compliance check error:', error)
    throw error
  }
}

/**
 * Send escalation email for SLA breach
 */
const sendSLAEscalationEmail = async ({ ticket, type, dueDate }) => {
  try {
    const recipients = []
    
    // Add ticket creator
    if (ticket.creator?.email) {
      recipients.push(ticket.creator.email)
    }

    // Add assignee
    if (ticket.assignee?.email) {
      recipients.push(ticket.assignee.email)
    }

    // Add department head
    if (ticket.department?.head) {
      const deptHead = await User.findById(ticket.department.head)
      if (deptHead?.email) {
        recipients.push(deptHead.email)
      }
    }

    // Add all admins
    const admins = await User.find({ role: 'admin' })
    admins.forEach(admin => {
      if (admin.email) {
        recipients.push(admin.email)
      }
    })

    // Remove duplicates
    const uniqueRecipients = [...new Set(recipients)]

    const slaType = type === 'response' ? 'Response' : 'Resolution'
    const hoursOverdue = Math.abs((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60))

    const subject = `🚨 SLA BREACH: Ticket #${ticket.ticketId} - ${slaType} Time Exceeded`
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">SLA Breach Alert</h2>
        <p><strong>Ticket #${ticket.ticketId}</strong> has exceeded its ${slaType.toLowerCase()} SLA.</p>
        
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
          <p><strong>Ticket Details:</strong></p>
          <ul>
            <li><strong>Title:</strong> ${ticket.title}</li>
            <li><strong>Priority:</strong> ${ticket.priority.toUpperCase()}</li>
            <li><strong>Status:</strong> ${ticket.status}</li>
            <li><strong>Department:</strong> ${ticket.department?.name || 'N/A'}</li>
            <li><strong>${slaType} Due Date:</strong> ${new Date(dueDate).toLocaleString()}</li>
            <li><strong>Time Overdue:</strong> ${hoursOverdue.toFixed(1)} hours</li>
          </ul>
        </div>

        <p>Please take immediate action to resolve this ticket.</p>
        
        <p style="margin-top: 30px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost'}/tickets/${ticket.ticketId}" 
             style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View Ticket
          </a>
        </p>
      </div>
    `

    for (const recipient of uniqueRecipients) {
      await sendEmail(recipient, subject, html)
    }
  } catch (error) {
    console.error('SLA escalation email error:', error)
  }
}

/**
 * Send warning email for approaching SLA deadline
 */
const sendSLAWarningEmail = async ({ ticket, type, percentageElapsed }) => {
  try {
    const recipients = []
    
    // Add assignee
    if (ticket.assignee?.email) {
      recipients.push(ticket.assignee.email)
    }

    // Add department head
    if (ticket.department?.head) {
      const deptHead = await User.findById(ticket.department.head)
      if (deptHead?.email) {
        recipients.push(deptHead.email)
      }
    }

    // Remove duplicates
    const uniqueRecipients = [...new Set(recipients)]

    if (uniqueRecipients.length === 0) return

    const slaType = type === 'response' ? 'Response' : 'Resolution'
    const dueDate = type === 'response' ? ticket.responseDueDate : ticket.dueDate
    const timeRemaining = dueDate.getTime() - new Date().getTime()
    const hoursRemaining = timeRemaining / (1000 * 60 * 60)

    const subject = `⚠️ SLA Warning: Ticket #${ticket.ticketId} - ${slaType} Deadline Approaching`
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">SLA Warning</h2>
        <p><strong>Ticket #${ticket.ticketId}</strong> is approaching its ${slaType.toLowerCase()} SLA deadline.</p>
        
        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
          <p><strong>Ticket Details:</strong></p>
          <ul>
            <li><strong>Title:</strong> ${ticket.title}</li>
            <li><strong>Priority:</strong> ${ticket.priority.toUpperCase()}</li>
            <li><strong>Status:</strong> ${ticket.status}</li>
            <li><strong>${slaType} Due Date:</strong> ${new Date(dueDate).toLocaleString()}</li>
            <li><strong>Time Remaining:</strong> ${hoursRemaining.toFixed(1)} hours</li>
            <li><strong>Progress:</strong> ${percentageElapsed.toFixed(1)}% of SLA time elapsed</li>
          </ul>
        </div>

        <p>Please ensure this ticket is addressed before the deadline.</p>
        
        <p style="margin-top: 30px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost'}/tickets/${ticket.ticketId}" 
             style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View Ticket
          </a>
        </p>
      </div>
    `

    for (const recipient of uniqueRecipients) {
      await sendEmail(recipient, subject, html)
    }
  } catch (error) {
    console.error('SLA warning email error:', error)
  }
}

/**
 * Auto-update ticket status based on SLA
 */
export const autoUpdateTicketStatus = async () => {
  try {
    const now = new Date()
    
    // Find tickets that are overdue and still open
    const overdueTickets = await Ticket.find({
      status: { $in: ['open', 'approved'] },
      dueDate: { $lt: now },
    })
      .populate('department', 'name head')

    for (const ticket of overdueTickets) {
      // Auto-escalate to department head if not already assigned
      if (!ticket.assignee && ticket.department?.head) {
        ticket.assignee = ticket.department.head
        ticket.status = 'in-progress'
        await ticket.save()

        // Notify department head
        const deptHead = await User.findById(ticket.department.head)
        if (deptHead?.email) {
          await sendEmail(
            deptHead.email,
            `Ticket #${ticket.ticketId} Auto-Assigned - SLA Overdue`,
            `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Ticket Auto-Assigned</h2>
                <p>Ticket #${ticket.ticketId} has been automatically assigned to you due to SLA breach.</p>
                <p><strong>Title:</strong> ${ticket.title}</p>
                <p><strong>Priority:</strong> ${ticket.priority.toUpperCase()}</p>
                <p><a href="${process.env.FRONTEND_URL || 'http://localhost'}/tickets/${ticket.ticketId}">View Ticket</a></p>
              </div>
            `
          )
        }
      }
    }

    return { updated: overdueTickets.length }
  } catch (error) {
    console.error('Auto-update ticket status error:', error)
    throw error
  }
}

export default {
  checkSLACompliance,
  autoUpdateTicketStatus,
}

