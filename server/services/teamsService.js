/**
 * Microsoft Teams Service
 * Handles sending notifications and messages to Microsoft Teams
 */

import TeamsConfig from '../models/TeamsConfig.js'

/**
 * Send message to Teams channel via webhook
 */
export const sendTeamsMessage = async (webhookUrl, message, options = {}) => {
  try {
    const card = {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: options.summary || message.title || 'Ticket Notification',
      themeColor: options.themeColor || getThemeColor(options.type),
      title: message.title || 'Ticket Notification',
      text: message.text || '',
      sections: message.sections || [],
      potentialAction: message.actions || [],
    }

    if (message.facts) {
      card.sections = card.sections || []
      card.sections.push({
        facts: message.facts,
      })
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(card),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Teams webhook failed: ${response.status} ${errorText}`)
    }

    const responseData = await response.json().catch(() => ({}))
    return { success: true, response: responseData }
  } catch (error) {
    console.error('Teams webhook error:', error.response?.data || error.message)
    throw error
  }
}

/**
 * Get theme color based on notification type
 */
const getThemeColor = (type) => {
  const colors = {
    ticketCreated: '0078D4',
    ticketUpdated: 'FF8C00',
    ticketResolved: '107C10',
    ticketClosed: '6B7280',
    slaBreach: 'DC2626',
    ticketAssigned: '2563EB',
    ticketCommented: '8B5CF6',
  }
  return colors[type] || '0078D4'
}

/**
 * Send ticket created notification
 */
export const notifyTicketCreated = async (ticket, organizationId = null) => {
  try {
    const config = await getTeamsConfig(organizationId)
    if (!config || !config.isEnabled || !config.webhookUrl || !config.notifications.ticketCreated) {
      return { sent: false, message: 'Teams notification not enabled' }
    }

    if (!isWithinWorkingHours(config)) {
      return { sent: false, message: 'Outside working hours' }
    }

    const message = {
      title: `🎫 New Ticket Created: #${ticket.ticketId}`,
      text: ticket.title,
      facts: [
        { name: 'Ticket ID', value: `#${ticket.ticketId}` },
        { name: 'Title', value: ticket.title },
        { name: 'Priority', value: ticket.priority.toUpperCase() },
        { name: 'Category', value: ticket.category },
        { name: 'Created By', value: ticket.creator?.name || 'Unknown' },
        { name: 'Department', value: ticket.department?.name || 'N/A' },
      ],
      actions: [
        {
          '@type': 'OpenUri',
          name: 'View Ticket',
          targets: [
            {
              os: 'default',
              uri: `${process.env.FRONTEND_URL || 'http://localhost'}/tickets/${ticket.ticketId}`,
            },
          ],
        },
      ],
    }

    const webhookUrl = getWebhookUrlForDepartment(config, ticket.department)
    await sendTeamsMessage(webhookUrl, message, {
      type: 'ticketCreated',
      summary: `New ticket #${ticket.ticketId} created`,
    })

    return { sent: true }
  } catch (error) {
    console.error('Teams ticket created notification error:', error)
    return { sent: false, error: error.message }
  }
}

/**
 * Send ticket updated notification
 */
export const notifyTicketUpdated = async (ticket, changes, organizationId = null) => {
  try {
    const config = await getTeamsConfig(organizationId)
    if (!config || !config.isEnabled || !config.webhookUrl || !config.notifications.ticketUpdated) {
      return { sent: false }
    }

    if (!isWithinWorkingHours(config)) {
      return { sent: false, message: 'Outside working hours' }
    }

    const changeFacts = Object.entries(changes).map(([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: String(value),
    }))

    const message = {
      title: `📝 Ticket Updated: #${ticket.ticketId}`,
      text: ticket.title,
      facts: [
        { name: 'Ticket ID', value: `#${ticket.ticketId}` },
        ...changeFacts,
      ],
      actions: [
        {
          '@type': 'OpenUri',
          name: 'View Ticket',
          targets: [
            {
              os: 'default',
              uri: `${process.env.FRONTEND_URL || 'http://localhost'}/tickets/${ticket.ticketId}`,
            },
          ],
        },
      ],
    }

    const webhookUrl = getWebhookUrlForDepartment(config, ticket.department)
    await sendTeamsMessage(webhookUrl, message, {
      type: 'ticketUpdated',
      summary: `Ticket #${ticket.ticketId} updated`,
    })

    return { sent: true }
  } catch (error) {
    console.error('Teams ticket updated notification error:', error)
    return { sent: false }
  }
}

/**
 * Send ticket resolved notification
 */
export const notifyTicketResolved = async (ticket, organizationId = null) => {
  try {
    const config = await getTeamsConfig(organizationId)
    if (!config || !config.isEnabled || !config.webhookUrl || !config.notifications.ticketResolved) {
      return { sent: false }
    }

    const message = {
      title: `✅ Ticket Resolved: #${ticket.ticketId}`,
      text: ticket.title,
      facts: [
        { name: 'Ticket ID', value: `#${ticket.ticketId}` },
        { name: 'Resolved By', value: ticket.assignee?.name || 'System' },
        { name: 'Priority', value: ticket.priority.toUpperCase() },
      ],
      actions: [
        {
          '@type': 'OpenUri',
          name: 'View Ticket',
          targets: [
            {
              os: 'default',
              uri: `${process.env.FRONTEND_URL || 'http://localhost'}/tickets/${ticket.ticketId}`,
            },
          ],
        },
      ],
    }

    const webhookUrl = getWebhookUrlForDepartment(config, ticket.department)
    await sendTeamsMessage(webhookUrl, message, {
      type: 'ticketResolved',
      summary: `Ticket #${ticket.ticketId} resolved`,
      themeColor: '107C10',
    })

    return { sent: true }
  } catch (error) {
    console.error('Teams ticket resolved notification error:', error)
    return { sent: false }
  }
}

/**
 * Send SLA breach notification
 */
export const notifySLABreach = async (ticket, breachType, organizationId = null) => {
  try {
    const config = await getTeamsConfig(organizationId)
    if (!config || !config.isEnabled || !config.webhookUrl || !config.notifications.slaBreach) {
      return { sent: false }
    }

    const message = {
      title: `🚨 SLA BREACH: Ticket #${ticket.ticketId}`,
      text: `${breachType} SLA has been breached for ticket #${ticket.ticketId}`,
      facts: [
        { name: 'Ticket ID', value: `#${ticket.ticketId}` },
        { name: 'Title', value: ticket.title },
        { name: 'Priority', value: ticket.priority.toUpperCase() },
        { name: 'Breach Type', value: breachType },
        { name: 'Department', value: ticket.department?.name || 'N/A' },
      ],
      actions: [
        {
          '@type': 'OpenUri',
          name: 'View Ticket',
          targets: [
            {
              os: 'default',
              uri: `${process.env.FRONTEND_URL || 'http://localhost'}/tickets/${ticket.ticketId}`,
            },
          ],
        },
      ],
    }

    const webhookUrl = getWebhookUrlForDepartment(config, ticket.department)
    await sendTeamsMessage(webhookUrl, message, {
      type: 'slaBreach',
      summary: `SLA breach for ticket #${ticket.ticketId}`,
      themeColor: 'DC2626',
    })

    return { sent: true }
  } catch (error) {
    console.error('Teams SLA breach notification error:', error)
    return { sent: false }
  }
}

/**
 * Send ticket assigned notification
 */
export const notifyTicketAssigned = async (ticket, assignee, organizationId = null) => {
  try {
    const config = await getTeamsConfig(organizationId)
    if (!config || !config.isEnabled || !config.webhookUrl || !config.notifications.ticketAssigned) {
      return { sent: false }
    }

    const message = {
      title: `👤 Ticket Assigned: #${ticket.ticketId}`,
      text: `Ticket #${ticket.ticketId} has been assigned to ${assignee?.name || 'Unassigned'}`,
      facts: [
        { name: 'Ticket ID', value: `#${ticket.ticketId}` },
        { name: 'Title', value: ticket.title },
        { name: 'Assigned To', value: assignee?.name || 'Unassigned' },
        { name: 'Priority', value: ticket.priority.toUpperCase() },
      ],
      actions: [
        {
          '@type': 'OpenUri',
          name: 'View Ticket',
          targets: [
            {
              os: 'default',
              uri: `${process.env.FRONTEND_URL || 'http://localhost'}/tickets/${ticket.ticketId}`,
            },
          ],
        },
      ],
    }

    const webhookUrl = getWebhookUrlForDepartment(config, ticket.department)
    await sendTeamsMessage(webhookUrl, message, {
      type: 'ticketAssigned',
      summary: `Ticket #${ticket.ticketId} assigned`,
    })

    return { sent: true }
  } catch (error) {
    console.error('Teams ticket assigned notification error:', error)
    return { sent: false }
  }
}

/**
 * Test Teams webhook
 */
export const testTeamsWebhook = async (webhookUrl) => {
  try {
    const message = {
      title: '✅ Teams Integration Test',
      text: 'This is a test message from the Ticketing Tool. If you receive this, your Teams integration is working correctly!',
      facts: [
        { name: 'Status', value: 'Connected' },
        { name: 'Time', value: new Date().toLocaleString() },
      ],
    }

    await sendTeamsMessage(webhookUrl, message, {
      type: 'test',
      summary: 'Teams integration test',
      themeColor: '107C10',
    })

    return { success: true }
  } catch (error) {
    console.error('Teams webhook test error:', error)
    throw error
  }
}

/**
 * Get Teams config for organization
 */
const getTeamsConfig = async (organizationId) => {
  const query = organizationId ? { organization: organizationId } : { organization: null }
  return await TeamsConfig.findOne(query)
}

/**
 * Get webhook URL for department (if department routing is configured)
 */
const getWebhookUrlForDepartment = (config, department) => {
  if (!department || !config.departmentRouting || config.departmentRouting.length === 0) {
    return config.webhookUrl
  }

  const deptRoute = config.departmentRouting.find(
    route => route.department?.toString() === department.toString() || 
             route.department?._id?.toString() === department.toString()
  )

  // If department has specific webhook, use it; otherwise use default
  // Note: Teams webhooks are typically per-channel, so we'd need separate webhooks
  // For now, return the main webhook URL
  return config.webhookUrl
}

/**
 * Check if current time is within working hours
 */
const isWithinWorkingHours = (config) => {
  if (!config.workingHours?.enabled) {
    return true // Always send if working hours not configured
  }

  const now = new Date()
  const currentDay = now.getDay()
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  // Check if current day is in allowed days
  if (config.workingHours.daysOfWeek && config.workingHours.daysOfWeek.length > 0) {
    if (!config.workingHours.daysOfWeek.includes(currentDay)) {
      return false
    }
  }

  // Check if current time is within working hours
  const startTime = config.workingHours.startTime || '09:00'
  const endTime = config.workingHours.endTime || '17:00'

  return currentTime >= startTime && currentTime <= endTime
}

export default {
  sendTeamsMessage,
  notifyTicketCreated,
  notifyTicketUpdated,
  notifyTicketResolved,
  notifySLABreach,
  notifyTicketAssigned,
  testTeamsWebhook,
}

