/**
 * Email Automation Service
 * Handles scheduled email automation for daily open tickets and reports
 */

import Ticket from '../models/Ticket.js'
import User from '../models/User.js'
import Department from '../models/Department.js'
import Organization from '../models/Organization.js'
import EmailTemplate from '../models/EmailTemplate.js'
import EmailAutomation from '../models/EmailAutomation.js'
import { sendEmail } from './emailService.js'
import { checkSLAStatus } from '../config/sla.js'

// Helper function to format dates
const formatDate = (date, formatStr = 'MMMM dd, yyyy') => {
  const d = new Date(date)
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  if (formatStr === 'MMMM dd, yyyy') {
    return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`
  } else if (formatStr === 'MMM dd, yyyy') {
    return `${monthNames[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`
  } else if (formatStr === 'MMM dd') {
    return `${monthNames[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`
  } else if (formatStr === 'MMMM yyyy') {
    return `${months[d.getMonth()]} ${d.getFullYear()}`
  } else if (formatStr === 'MMM dd, yyyy HH:mm') {
    return `${monthNames[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  return d.toLocaleDateString()
}

/**
 * Send daily open ticket status email
 */
export const sendDailyOpenTicketsEmail = async (organizationId = null) => {
  try {
    // Get automation config
    const automation = await EmailAutomation.findOne({
      type: 'daily-open-tickets',
      organization: organizationId || null,
      isEnabled: true,
    })

    if (!automation) {
      return { sent: false, message: 'Automation not enabled' }
    }

    // Get recipients
    const recipients = await getRecipients(automation.recipients, organizationId)

    if (recipients.length === 0) {
      return { sent: false, message: 'No recipients found' }
    }

    // Get open tickets
    const query = {
      status: { $in: ['open', 'approval-pending', 'approved', 'in-progress'] },
    }

    if (organizationId) {
      query.organization = organizationId
    }

    const openTickets = await Ticket.find(query)
      .populate('creator', 'name email')
      .populate('assignee', 'name email')
      .populate('department', 'name')
      .populate('organization', 'name')
      .sort({ createdAt: -1 })

    if (openTickets.length === 0) {
      // Still send email but with no tickets message
      const subject = 'Daily Open Tickets Report - No Open Tickets'
      const html = generateOpenTicketsEmail(openTickets, organizationId)
      
      for (const recipient of recipients) {
        await sendEmail(recipient, subject, html)
      }

      // Update last sent
      automation.lastSent = new Date()
      await automation.save()

      return { sent: true, recipients: recipients.length, tickets: 0 }
    }

    // Get template
    let template = null
    if (automation.emailTemplate) {
      template = await EmailTemplate.findById(automation.emailTemplate)
    }

    if (!template) {
      // Use default template
      template = await EmailTemplate.findOne({
        type: 'daily-open-tickets',
        organization: organizationId || null,
        isActive: true,
      })
    }

    const subject = template?.subject || 'Daily Open Tickets Report'
    const html = template
      ? renderTemplate(template.htmlBody, { tickets: openTickets, organization: organizationId })
      : generateOpenTicketsEmail(openTickets, organizationId)

    // Send emails
    for (const recipient of recipients) {
      await sendEmail(recipient, subject, html)
    }

    // Update last sent
    automation.lastSent = new Date()
    await automation.save()

    return { sent: true, recipients: recipients.length, tickets: openTickets.length }
  } catch (error) {
    console.error('Daily open tickets email error:', error)
    throw error
  }
}

/**
 * Send daily report
 */
export const sendDailyReport = async (organizationId = null) => {
  try {
    const automation = await EmailAutomation.findOne({
      type: 'daily-report',
      organization: organizationId || null,
      isEnabled: true,
    })

    if (!automation) {
      return { sent: false, message: 'Automation not enabled' }
    }

    const recipients = await getRecipients(automation.recipients, organizationId, false)

    if (recipients.length === 0) {
      return { sent: false, message: 'No recipients found' }
    }

    const now = new Date()
    const startOfDay = new Date(now.setHours(0, 0, 0, 0))
    const endOfDay = new Date(now.setHours(23, 59, 59, 999))

    const query = {
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    }

    if (organizationId) {
      query.organization = organizationId
    }

    // Get statistics
    const totalCreated = await Ticket.countDocuments(query)
    const totalOpen = await Ticket.countDocuments({ ...query, status: { $in: ['open', 'approval-pending', 'approved', 'in-progress'] } })
    const totalResolved = await Ticket.countDocuments({ ...query, status: 'resolved' })
    
    const slaBreached = await Ticket.find({
      ...query,
      dueDate: { $lt: now },
      status: { $in: ['open', 'in-progress'] },
    })

    // Department-wise summary
    const deptSummary = await Ticket.aggregate([
      { $match: query },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
      { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
      { $project: { departmentName: '$dept.name', count: 1 } },
    ])

    const reportData = {
      period: 'Daily',
      date: formatDate(now, 'MMMM dd, yyyy'),
      totalCreated,
      totalOpen,
      totalResolved,
      slaBreached: slaBreached.length,
      departmentSummary: deptSummary,
    }

    // Get template
    let template = await EmailTemplate.findOne({
      type: 'daily-report',
      organization: organizationId || null,
      isActive: true,
    })

    const subject = template?.subject || `Daily Report - ${formatDate(now, 'MMMM dd, yyyy')}`
    const html = template
      ? renderTemplate(template.htmlBody, reportData)
      : generateDailyReportEmail(reportData)

    for (const recipient of recipients) {
      await sendEmail(recipient, subject, html)
    }

    automation.lastSent = new Date()
    await automation.save()

    return { sent: true, recipients: recipients.length }
  } catch (error) {
    console.error('Daily report error:', error)
    throw error
  }
}

/**
 * Send weekly report
 */
export const sendWeeklyReport = async (organizationId = null) => {
  try {
    const automation = await EmailAutomation.findOne({
      type: 'weekly-report',
      organization: organizationId || null,
      isEnabled: true,
    })

    if (!automation) {
      return { sent: false, message: 'Automation not enabled' }
    }

    const recipients = await getRecipients(automation.recipients, organizationId, false)

    if (recipients.length === 0) {
      return { sent: false, message: 'No recipients found' }
    }

    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    const query = {
      createdAt: { $gte: startOfWeek, $lte: endOfWeek },
    }

    if (organizationId) {
      query.organization = organizationId
    }

    const totalCreated = await Ticket.countDocuments(query)
    const resolved = await Ticket.countDocuments({ ...query, status: 'resolved' })
    const unresolved = totalCreated - resolved

    // SLA compliance
    const allTickets = await Ticket.find(query)
    let slaCompliant = 0
    let slaBreached = 0

    allTickets.forEach(ticket => {
      if (ticket.dueDate) {
        const slaStatus = checkSLAStatus(ticket.createdAt, ticket.dueDate, ticket.status)
        if (slaStatus.isOverdue) {
          slaBreached++
        } else {
          slaCompliant++
        }
      }
    })

    // Technician performance
    const techPerformance = await Ticket.aggregate([
      { $match: { ...query, assignee: { $ne: null } } },
      {
        $group: {
          _id: '$assignee',
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        },
      },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $project: { name: '$user.name', total: 1, resolved: 1 } },
      { $sort: { resolved: -1 } },
      { $limit: 10 },
    ])

    // Top issues
    const topIssues = await Ticket.aggregate([
      { $match: query },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ])

    const reportData = {
      period: 'Weekly',
      startDate: formatDate(startOfWeek, 'MMMM dd, yyyy'),
      endDate: formatDate(endOfWeek, 'MMMM dd, yyyy'),
      totalCreated,
      resolved,
      unresolved,
      slaCompliant,
      slaBreached,
      technicianPerformance: techPerformance,
      topIssues,
    }

    let template = await EmailTemplate.findOne({
      type: 'weekly-report',
      organization: organizationId || null,
      isActive: true,
    })

    const subject = template?.subject || `Weekly Report - ${formatDate(startOfWeek, 'MMM dd')} to ${formatDate(endOfWeek, 'MMM dd, yyyy')}`
    const html = template
      ? renderTemplate(template.htmlBody, reportData)
      : generateWeeklyReportEmail(reportData)

    for (const recipient of recipients) {
      await sendEmail(recipient, subject, html)
    }

    automation.lastSent = new Date()
    await automation.save()

    return { sent: true, recipients: recipients.length }
  } catch (error) {
    console.error('Weekly report error:', error)
    throw error
  }
}

/**
 * Send monthly report
 */
export const sendMonthlyReport = async (organizationId = null) => {
  try {
    const automation = await EmailAutomation.findOne({
      type: 'monthly-report',
      organization: organizationId || null,
      isEnabled: true,
    })

    if (!automation) {
      return { sent: false, message: 'Automation not enabled' }
    }

    const recipients = await getRecipients(automation.recipients, organizationId, false)

    if (recipients.length === 0) {
      return { sent: false, message: 'No recipients found' }
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const query = {
      createdAt: { $gte: startOfMonth, $lte: endOfMonth },
    }

    if (organizationId) {
      query.organization = organizationId
    }

    const totalCreated = await Ticket.countDocuments(query)

    // Department-wise trends
    const deptTrends = await Ticket.aggregate([
      { $match: query },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
      { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
      { $project: { departmentName: '$dept.name', count: 1 } },
      { $sort: { count: -1 } },
    ])

    // SLA violations
    const slaViolations = await Ticket.find({
      ...query,
      $or: [
        { slaResponseBreached: true },
        { slaResolutionBreached: true },
      ],
    })

    const slaComplianceRate = totalCreated > 0
      ? ((totalCreated - slaViolations.length) / totalCreated * 100).toFixed(2)
      : 100

    // Technician productivity
    const techProductivity = await Ticket.aggregate([
      { $match: { ...query, assignee: { $ne: null } } },
      {
        $group: {
          _id: '$assignee',
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0] } },
          avgResolutionTime: {
            $avg: {
              $cond: [
                { $in: ['$status', ['resolved', 'closed']] },
                { $subtract: ['$updatedAt', '$createdAt'] },
                null,
              ],
            },
          },
        },
      },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: '$user.name',
          total: 1,
          resolved: 1,
          resolutionRate: { $multiply: [{ $divide: ['$resolved', '$total'] }, 100] },
          avgResolutionHours: { $divide: ['$avgResolutionTime', 1000 * 60 * 60] },
        },
      },
      { $sort: { resolved: -1 } },
    ])

    // Recurring issues
    const recurringIssues = await Ticket.aggregate([
      { $match: query },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $match: { count: { $gte: 5 } } }, // Issues that appeared 5+ times
      { $sort: { count: -1 } },
    ])

    const reportData = {
      period: 'Monthly',
      month: formatDate(now, 'MMMM yyyy'),
      totalCreated,
      departmentTrends: deptTrends,
      slaViolations: slaViolations.length,
      slaComplianceRate,
      technicianProductivity: techProductivity,
      recurringIssues,
    }

    let template = await EmailTemplate.findOne({
      type: 'monthly-report',
      organization: organizationId || null,
      isActive: true,
    })

    const subject = template?.subject || `Monthly Report - ${formatDate(now, 'MMMM yyyy')}`
    const html = template
      ? renderTemplate(template.htmlBody, reportData)
      : generateMonthlyReportEmail(reportData)

    for (const recipient of recipients) {
      await sendEmail(recipient, subject, html)
    }

    automation.lastSent = new Date()
    await automation.save()

    return { sent: true, recipients: recipients.length }
  } catch (error) {
    console.error('Monthly report error:', error)
    throw error
  }
}

/**
 * Get recipients based on automation config
 */
const getRecipients = async (recipientConfig, organizationId, includeTechnicians = false) => {
  const recipients = []

  if (recipientConfig.admins) {
    const admins = await User.find({ role: 'admin' })
    admins.forEach(admin => {
      if (admin.email) recipients.push(admin.email)
    })
  }

  if (recipientConfig.organizationManagers && organizationId) {
    const org = await Organization.findById(organizationId).populate('manager')
    if (org?.manager?.email) {
      recipients.push(org.manager.email)
    }
  }

  if (recipientConfig.departmentHeads) {
    const deptHeads = await User.find({ role: 'department-head' })
    if (organizationId) {
      const departments = await Department.find({ organization: organizationId })
      const deptIds = departments.map(d => d._id)
      deptHeads.forEach(head => {
        if (head.department && deptIds.includes(head.department.toString()) && head.email) {
          recipients.push(head.email)
        }
      })
    } else {
      deptHeads.forEach(head => {
        if (head.email) recipients.push(head.email)
      })
    }
  }

  if (includeTechnicians && recipientConfig.technicians) {
    const technicians = await User.find({ role: 'technician' })
    if (organizationId) {
      technicians.forEach(tech => {
        if (tech.organization?.toString() === organizationId.toString() && tech.email) {
          recipients.push(tech.email)
        }
      })
    } else {
      technicians.forEach(tech => {
        if (tech.email) recipients.push(tech.email)
      })
    }
  }

  return [...new Set(recipients)] // Remove duplicates
}

/**
 * Generate open tickets email HTML
 */
const generateOpenTicketsEmail = (tickets, organizationId) => {
  const ticketsHtml = tickets.map(ticket => {
    const timeElapsed = Math.floor((new Date() - new Date(ticket.createdAt)) / (1000 * 60 * 60))
    const isOverdue = ticket.dueDate && new Date(ticket.dueDate) < new Date()
    
    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px;">#${ticket.ticketId}</td>
        <td style="padding: 12px;">${ticket.title}</td>
        <td style="padding: 12px;"><span style="background: ${getPriorityColor(ticket.priority)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${ticket.priority}</span></td>
        <td style="padding: 12px;">${ticket.department?.name || 'N/A'}</td>
        <td style="padding: 12px;">${ticket.assignee?.name || 'Unassigned'}</td>
        <td style="padding: 12px;">${ticket.dueDate ? formatDate(new Date(ticket.dueDate), 'MMM dd, yyyy HH:mm') : 'N/A'}</td>
        <td style="padding: 12px; color: ${isOverdue ? '#ef4444' : '#6b7280'};">${timeElapsed}h ${isOverdue ? '⚠️' : ''}</td>
      </tr>
    `
  }).join('')

  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <h2 style="color: #1f2937;">Daily Open Tickets Report</h2>
      <p>Total Open Tickets: <strong>${tickets.length}</strong></p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 12px; text-align: left;">Ticket ID</th>
            <th style="padding: 12px; text-align: left;">Title</th>
            <th style="padding: 12px; text-align: left;">Priority</th>
            <th style="padding: 12px; text-align: left;">Department</th>
            <th style="padding: 12px; text-align: left;">Assigned To</th>
            <th style="padding: 12px; text-align: left;">SLA Deadline</th>
            <th style="padding: 12px; text-align: left;">Time Elapsed</th>
          </tr>
        </thead>
        <tbody>
          ${tickets.length > 0 ? ticketsHtml : '<tr><td colspan="7" style="padding: 20px; text-align: center; color: #6b7280;">No open tickets</td></tr>'}
        </tbody>
      </table>
    </div>
  `
}

/**
 * Generate daily report email HTML
 */
const generateDailyReportEmail = (data) => {
  const deptSummary = data.departmentSummary.map(dept => 
    `<li>${dept.departmentName || 'Unassigned'}: ${dept.count} tickets</li>`
  ).join('')

  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <h2 style="color: #1f2937;">Daily Report - ${data.date}</h2>
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #374151; margin-top: 0;">Summary</h3>
        <ul style="list-style: none; padding: 0;">
          <li style="padding: 8px 0;"><strong>Total Tickets Created:</strong> ${data.totalCreated}</li>
          <li style="padding: 8px 0;"><strong>Total Open Tickets:</strong> ${data.totalOpen}</li>
          <li style="padding: 8px 0;"><strong>Tickets Resolved Today:</strong> ${data.totalResolved}</li>
          <li style="padding: 8px 0; color: ${data.slaBreached > 0 ? '#ef4444' : '#10b981'};"><strong>Tickets Breaching SLA:</strong> ${data.slaBreached}</li>
        </ul>
      </div>
      <div style="margin-top: 20px;">
        <h3 style="color: #374151;">Department-wise Summary</h3>
        <ul>${deptSummary || '<li>No department data</li>'}</ul>
      </div>
    </div>
  `
}

/**
 * Generate weekly report email HTML
 */
const generateWeeklyReportEmail = (data) => {
  const techPerf = data.technicianPerformance.map(tech => 
    `<li>${tech.name || 'Unknown'}: ${tech.resolved}/${tech.total} resolved (${((tech.resolved / tech.total) * 100).toFixed(1)}%)</li>`
  ).join('')

  const topIssues = data.topIssues.map(issue => 
    `<li>${issue._id}: ${issue.count} tickets</li>`
  ).join('')

  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <h2 style="color: #1f2937;">Weekly Report - ${data.startDate} to ${data.endDate}</h2>
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #374151; margin-top: 0;">Summary</h3>
        <ul style="list-style: none; padding: 0;">
          <li style="padding: 8px 0;"><strong>Total Tickets Created:</strong> ${data.totalCreated}</li>
          <li style="padding: 8px 0;"><strong>Resolved:</strong> ${data.resolved}</li>
          <li style="padding: 8px 0;"><strong>Unresolved:</strong> ${data.unresolved}</li>
          <li style="padding: 8px 0;"><strong>SLA Compliant:</strong> ${data.slaCompliant}</li>
          <li style="padding: 8px 0; color: ${data.slaBreached > 0 ? '#ef4444' : '#10b981'};"><strong>SLA Breached:</strong> ${data.slaBreached}</li>
        </ul>
      </div>
      <div style="margin-top: 20px;">
        <h3 style="color: #374151;">Technician Performance</h3>
        <ul>${techPerf || '<li>No data</li>'}</ul>
      </div>
      <div style="margin-top: 20px;">
        <h3 style="color: #374151;">Top 10 Issues</h3>
        <ul>${topIssues || '<li>No data</li>'}</ul>
      </div>
    </div>
  `
}

/**
 * Generate monthly report email HTML
 */
const generateMonthlyReportEmail = (data) => {
  const deptTrends = data.departmentTrends.map(dept => 
    `<li>${dept.departmentName || 'Unassigned'}: ${dept.count} tickets</li>`
  ).join('')

  const techProd = data.technicianProductivity.map(tech => 
    `<li>${tech.name || 'Unknown'}: ${tech.resolved}/${tech.total} resolved (${tech.resolutionRate?.toFixed(1) || 0}%)</li>`
  ).join('')

  const recurring = data.recurringIssues.map(issue => 
    `<li>${issue._id}: ${issue.count} occurrences</li>`
  ).join('')

  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <h2 style="color: #1f2937;">Monthly Report - ${data.month}</h2>
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #374151; margin-top: 0;">Summary</h3>
        <ul style="list-style: none; padding: 0;">
          <li style="padding: 8px 0;"><strong>Total Tickets:</strong> ${data.totalCreated}</li>
          <li style="padding: 8px 0; color: ${data.slaViolations > 0 ? '#ef4444' : '#10b981'};"><strong>SLA Violations:</strong> ${data.slaViolations}</li>
          <li style="padding: 8px 0;"><strong>SLA Compliance Rate:</strong> ${data.slaComplianceRate}%</li>
        </ul>
      </div>
      <div style="margin-top: 20px;">
        <h3 style="color: #374151;">Department-wise Trends</h3>
        <ul>${deptTrends || '<li>No data</li>'}</ul>
      </div>
      <div style="margin-top: 20px;">
        <h3 style="color: #374151;">Technician Productivity</h3>
        <ul>${techProd || '<li>No data</li>'}</ul>
      </div>
      <div style="margin-top: 20px;">
        <h3 style="color: #374151;">Recurring Issues</h3>
        <ul>${recurring || '<li>No recurring issues</li>'}</ul>
      </div>
    </div>
  `
}

/**
 * Render template with variables
 */
const renderTemplate = (template, data) => {
  let rendered = template

  // Replace common variables
  rendered = rendered.replace(/\{\{tickets\}\}/g, JSON.stringify(data.tickets || []))
  rendered = rendered.replace(/\{\{totalTickets\}\}/g, data.totalTickets || data.totalCreated || 0)
  rendered = rendered.replace(/\{\{date\}\}/g, data.date || formatDate(new Date(), 'MMMM dd, yyyy'))
  rendered = rendered.replace(/\{\{period\}\}/g, data.period || '')

  // Replace object properties
  if (typeof data === 'object') {
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      rendered = rendered.replace(regex, JSON.stringify(data[key]))
    })
  }

  return rendered
}

/**
 * Get priority color
 */
const getPriorityColor = (priority) => {
  const colors = {
    urgent: '#ef4444',
    high: '#f59e0b',
    medium: '#3b82f6',
    low: '#10b981',
  }
  return colors[priority] || '#6b7280'
}

export default {
  sendDailyOpenTicketsEmail,
  sendDailyReport,
  sendWeeklyReport,
  sendMonthlyReport,
}

