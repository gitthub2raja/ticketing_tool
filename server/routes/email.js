import express from 'express'
import { protect, admin } from '../middleware/auth.js'
import { manualEmailCheck } from '../workers/emailWorker.js'
import { sendEmail } from '../services/emailService.js'
import EmailSettings from '../models/EmailSettings.js'
import nodemailer from 'nodemailer'
import Imap from 'imap'

const router = express.Router()

// @route   POST /api/email/check
// @desc    Manually trigger email check (Admin only)
// @access  Private/Admin
router.post('/check', protect, admin, async (req, res) => {
  try {
    const tickets = await manualEmailCheck()
    res.json({
      message: 'Email check completed',
      ticketsCreated: tickets.length,
      tickets,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/email/send
// @desc    Send test email (Admin only)
// @access  Private/Admin
router.post('/send', protect, admin, async (req, res) => {
  try {
    const { to, subject, html, text } = req.body
    
    if (!to || !subject || !html) {
      return res.status(400).json({ message: 'to, subject, and html are required' })
    }
    
    const result = await sendEmail(to, subject, html, text)
    res.json({
      message: 'Email sent successfully',
      messageId: result.messageId,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/email/test-smtp
// @desc    Test SMTP connection and send test email
// @access  Private/Admin
router.post('/test-smtp', protect, admin, async (req, res) => {
  try {
    const { to, settings } = req.body
    
    if (!to) {
      return res.status(400).json({ message: 'Email address (to) is required' })
    }

    // Use provided settings or get from database
    let smtpSettings
    if (settings && settings.host && settings.auth && settings.auth.user) {
      smtpSettings = settings
    } else {
      const emailSettings = await EmailSettings.getSettings()
      if (!emailSettings.smtp || !emailSettings.smtp.enabled || !emailSettings.smtp.host) {
        return res.status(400).json({ message: 'SMTP is not configured. Please save SMTP settings first or provide settings in the request.' })
      }
      smtpSettings = emailSettings.smtp
    }

    // Create transporter with test settings
    // For Office365, we need to handle authentication differently
    const isOffice365 = smtpSettings.host && (
      smtpSettings.host.includes('office365.com') || 
      smtpSettings.host.includes('outlook.com') ||
      smtpSettings.host.includes('office.com')
    )
    
    // Office365 requires specific configuration
    // Trim password to remove any accidental spaces
    const trimmedPassword = smtpSettings.auth.pass ? smtpSettings.auth.pass.trim() : ''
    const trimmedUser = smtpSettings.auth.user ? smtpSettings.auth.user.trim() : ''
    
    console.log('SMTP Test - Host:', smtpSettings.host)
    console.log('SMTP Test - Port:', smtpSettings.port)
    console.log('SMTP Test - User:', trimmedUser)
    console.log('SMTP Test - Password length:', trimmedPassword.length)
    console.log('SMTP Test - Is Office365:', isOffice365)
    
    const transporterConfig = {
      host: smtpSettings.host,
      port: parseInt(smtpSettings.port),
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
      // Disable service name check
      transporterConfig.service = 'smtp.office365.com'
      // Timeout settings
      transporterConfig.connectionTimeout = 60000 // 60 seconds
      transporterConfig.greetingTimeout = 30000 // 30 seconds
      transporterConfig.socketTimeout = 60000 // 60 seconds
    }

    const transporter = nodemailer.createTransport(transporterConfig)

    // Verify connection with better error handling
    try {
      console.log('Attempting SMTP connection verification...')
      await transporter.verify()
      console.log('SMTP connection verified successfully')
    } catch (verifyError) {
      console.error('SMTP Verification Error:', verifyError)
      console.error('Error code:', verifyError.code)
      console.error('Error response:', verifyError.response)
      console.error('Error command:', verifyError.command)
      
      // Provide helpful error message for Office365
      if (isOffice365) {
        let errorMsg = 'Office365 Authentication Error: '
        
        if (verifyError.code === 'EAUTH' || verifyError.message.includes('535') || verifyError.message.includes('Authentication unsuccessful')) {
          errorMsg += '\n\nTroubleshooting steps:\n'
          errorMsg += '1. Verify App Password is correct (16 characters, no spaces)\n'
          errorMsg += '2. Check that SMTP AUTH is enabled for your mailbox\n'
          errorMsg += '3. Try creating a new App Password\n'
          errorMsg += '4. Verify username is full email address\n'
          errorMsg += '5. Check Office365 admin hasn\'t disabled SMTP AUTH globally\n'
          errorMsg += '\nError details: ' + verifyError.message
          
          // If there's a response code, include it
          if (verifyError.response) {
            errorMsg += '\nResponse: ' + verifyError.response
          }
        } else {
          errorMsg += verifyError.message
        }
        
        throw new Error(errorMsg)
      }
      throw verifyError
    }

    // Send test email
    const testSubject = 'Test Email from Ticketing Tool'
    const testHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Test Email Successful</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>This is a test email from your Ticketing Tool system.</p>
            <p>If you received this email, it means your SMTP configuration is working correctly!</p>
            <p><strong>SMTP Settings:</strong></p>
            <ul>
              <li>Host: ${smtpSettings.host}</li>
              <li>Port: ${smtpSettings.port}</li>
              <li>From: ${smtpSettings.auth.user}</li>
            </ul>
            <p>Best regards,<br>Ticketing Tool System</p>
          </div>
          <div class="footer">
            <p>This is an automated test message.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const fromEmail = smtpSettings.fromEmail || smtpSettings.auth.user
    const fromName = smtpSettings.fromName || 'Ticketing Tool'

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: testSubject,
      html: testHtml,
      text: 'This is a test email from your Ticketing Tool system. If you received this email, your SMTP configuration is working correctly!',
    })

    res.json({
      message: 'Test email sent successfully! Please check your inbox.',
      messageId: info.messageId,
      connectionVerified: true,
    })
  } catch (error) {
    console.error('SMTP test error:', error)
    res.status(500).json({ 
      message: error.message || 'Failed to send test email',
      error: error.code || 'UNKNOWN_ERROR',
    })
  }
})

// @route   POST /api/email/test-imap
// @desc    Test IMAP connection
// @access  Private/Admin
router.post('/test-imap', protect, admin, async (req, res) => {
  try {
    const { settings } = req.body

    // Use provided settings or get from database
    let imapSettings
    if (settings) {
      imapSettings = settings
    } else {
      const emailSettings = await EmailSettings.getSettings()
      if (!emailSettings.imap.enabled) {
        return res.status(400).json({ message: 'IMAP is not enabled. Please save IMAP settings first.' })
      }
      imapSettings = emailSettings.imap
    }

    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: imapSettings.auth.user,
        password: imapSettings.auth.pass,
        host: imapSettings.host,
        port: parseInt(imapSettings.port),
        tls: imapSettings.secure === true || imapSettings.port === '993',
        tlsOptions: { rejectUnauthorized: false },
      })

      imap.once('ready', () => {
        imap.openBox(imapSettings.folder || 'INBOX', false, (err, box) => {
          imap.end()
          if (err) {
            return reject(err)
          }
          resolve({
            message: 'IMAP connection successful!',
            mailbox: box.name,
            totalMessages: box.messages.total,
          })
        })
      })

      imap.once('error', (err) => {
        reject(err)
      })

      imap.connect()
    }).then((result) => {
      res.json(result)
    }).catch((error) => {
      console.error('IMAP test error:', error)
      res.status(500).json({ 
        message: error.message || 'Failed to connect to IMAP server',
        error: error.code || 'UNKNOWN_ERROR',
      })
    })
  } catch (error) {
    console.error('IMAP test error:', error)
    res.status(500).json({ message: error.message })
  }
})

export default router
