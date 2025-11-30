import nodemailer from 'nodemailer'
import EmailSettings from '../models/EmailSettings.js'

// Create SMTP transporter
const createTransporter = async () => {
  const settings = await EmailSettings.getSettings()
  
  if (!settings.smtp.enabled) {
    throw new Error('SMTP is not enabled. Please configure email settings.')
  }

  // Check if Office365/Outlook
  const isOffice365 = settings.smtp.host && (
    settings.smtp.host.includes('office365.com') || 
    settings.smtp.host.includes('outlook.com') ||
    settings.smtp.host.includes('office.com')
  )

  // Trim credentials to remove accidental spaces
  const trimmedPassword = settings.smtp.auth.pass ? settings.smtp.auth.pass.trim() : ''
  const trimmedUser = settings.smtp.auth.user ? settings.smtp.auth.user.trim() : ''
  
  const transporterConfig = {
    host: settings.smtp.host,
    port: parseInt(settings.smtp.port),
    secure: false, // Office365 uses STARTTLS, not direct SSL
    auth: {
      user: trimmedUser,
      pass: trimmedPassword,
    },
    pool: false,
    maxConnections: 1,
    maxMessages: 1,
  }

  // Add Office365-specific settings
  if (isOffice365) {
    transporterConfig.requireTLS = true
    transporterConfig.tls = {
      ciphers: 'SSLv3',
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
    }
    // Office365 specific: use LOGIN method explicitly
    transporterConfig.authMethod = 'LOGIN'
    transporterConfig.service = 'smtp.office365.com'
    transporterConfig.connectionTimeout = 60000
    transporterConfig.greetingTimeout = 30000
    transporterConfig.socketTimeout = 60000
  } else {
    // For other providers, use secure if port is 465
    transporterConfig.secure = settings.smtp.secure === true || settings.smtp.port === 465
  }

  return nodemailer.createTransport(transporterConfig)
}

// Send email
export const sendEmail = async (to, subject, html, text = null) => {
  try {
    const settings = await EmailSettings.getSettings()
    const transporter = await createTransporter()
    
    const fromEmail = settings.smtp.fromEmail || settings.smtp.auth.user
    const fromName = settings.smtp.fromName || 'Ticketing Tool'

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('Email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}

// Send ticket acknowledgment email
export const sendTicketAcknowledgment = async (ticket, customerEmail) => {
  const subject = `Ticket #${ticket.ticketId} Created - ${ticket.title}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .ticket-info { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #3b82f6; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        .button { display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Ticket Created Successfully</h1>
        </div>
        <div class="content">
          <p>Dear Customer,</p>
          <p>Thank you for contacting us. We have received your request and created a support ticket for you.</p>
          
          <div class="ticket-info">
            <h3>Ticket Details:</h3>
            <p><strong>Ticket ID:</strong> #${ticket.ticketId}</p>
            <p><strong>Title:</strong> ${ticket.title}</p>
            <p><strong>Category:</strong> ${ticket.category}</p>
            <p><strong>Priority:</strong> ${ticket.priority}</p>
            <p><strong>Status:</strong> ${ticket.status}</p>
            <p><strong>Description:</strong></p>
            <p>${ticket.description.replace(/\n/g, '<br>')}</p>
          </div>
          
          <p>Our support team will review your ticket and respond as soon as possible. You will receive email notifications when there are updates to your ticket.</p>
          
          <p>If you have any additional information, please reply to this email and it will be added to your ticket.</p>
          
          <p>Best regards,<br>Support Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply directly to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail(customerEmail, subject, html)
}

// Send ticket update email
export const sendTicketUpdateEmail = async (ticket, customerEmail, changes) => {
  const subject = `Ticket #${ticket.ticketId} Updated - ${ticket.title}`
  
  const changesHtml = Object.entries(changes)
    .map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`)
    .join('')
  
  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      'open': '#3b82f6',
      'approval-pending': '#f59e0b',
      'approved': '#10b981',
      'rejected': '#ef4444',
      'in-progress': '#8b5cf6',
      'resolved': '#10b981',
      'closed': '#6b7280',
    }
    return colors[status] || '#3b82f6'
  }

  const statusColor = getStatusColor(ticket.status)
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${statusColor}; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .ticket-info { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid ${statusColor}; }
        .changes { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #10b981; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        .button { display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Ticket Updated</h1>
        </div>
        <div class="content">
          <p>Dear Customer,</p>
          <p>Your ticket #${ticket.ticketId} has been updated.</p>
          
          <div class="ticket-info">
            <h3>Current Ticket Status:</h3>
            <p><strong>Ticket ID:</strong> #${ticket.ticketId}</p>
            <p><strong>Title:</strong> ${ticket.title}</p>
            <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${ticket.status.toUpperCase().replace('-', ' ')}</span></p>
            <p><strong>Priority:</strong> ${ticket.priority.toUpperCase()}</p>
            <p><strong>Assignee:</strong> ${ticket.assignee?.name || 'Unassigned'}</p>
            ${ticket.dueDate ? `<p><strong>Due Date:</strong> ${new Date(ticket.dueDate).toLocaleString()}</p>` : ''}
          </div>
          
          ${changesHtml ? `
          <div class="changes">
            <h3>Recent Changes:</h3>
            <ul>${changesHtml}</ul>
          </div>
          ` : ''}
          
          <p>You will receive email notifications for all status updates on this ticket.</p>
          
          <p><a href="${process.env.FRONTEND_URL || 'http://localhost'}/tickets/${ticket.ticketId}" class="button">View Ticket</a></p>
          
          <p>Best regards,<br>Support Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail(customerEmail, subject, html)
}

