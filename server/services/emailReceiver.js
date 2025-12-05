import Imap from 'imap'
import { simpleParser } from 'mailparser'
import EmailSettings from '../models/EmailSettings.js'
import Ticket from '../models/Ticket.js'
import User from '../models/User.js'
import { sendTicketAcknowledgment } from './emailService.js'

// Refresh OAuth2 access token for IMAP
const refreshOAuth2Token = async (clientId, clientSecret, refreshToken) => {
  try {
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'https://outlook.office.com/IMAP.AccessAsUser.All offline_access',
      }),
    })

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + (data.expires_in * 1000)),
      refreshToken: data.refresh_token || refreshToken,
    }
  } catch (error) {
    console.error('OAuth2 token refresh error:', error)
    throw error
  }
}

// Get valid OAuth2 access token for IMAP
const getValidIMAPAccessToken = async (settings) => {
  const auth = settings.imap.auth
  
  if (!auth?.oauth2?.enabled) {
    return null
  }

  const oauth2 = auth.oauth2
  const now = new Date()
  
  // Check if token is expired or will expire soon (within 5 minutes)
  if (!oauth2.accessToken || !oauth2.expiresAt || oauth2.expiresAt <= new Date(now.getTime() + 5 * 60 * 1000)) {
    console.log('Refreshing OAuth2 access token for IMAP...')
    const tokenData = await refreshOAuth2Token(
      oauth2.clientId,
      oauth2.clientSecret,
      oauth2.refreshToken
    )
    
    // Update settings with new token
    oauth2.accessToken = tokenData.accessToken
    oauth2.expiresAt = tokenData.expiresAt
    oauth2.refreshToken = tokenData.refreshToken
    
    const emailSettings = await EmailSettings.getSettings()
    emailSettings.imap.auth.oauth2 = oauth2
    await emailSettings.save()
    
    return tokenData.accessToken
  }
  
  return oauth2.accessToken
}

// Store processed email UIDs to avoid duplicates
const processedEmails = new Set()

// Parse email to extract ticket information
const parseEmailToTicket = (emailData) => {
  const subject = emailData.subject || 'No Subject'
  const from = emailData.from?.value?.[0] || emailData.from?.text || 'unknown@example.com'
  const fromEmail = emailData.from?.value?.[0]?.address || from
  const fromName = emailData.from?.value?.[0]?.name || fromEmail.split('@')[0]
  
  // Extract description from email body
  let description = ''
  if (emailData.text) {
    description = emailData.text
  } else if (emailData.html) {
    // Strip HTML tags for description
    description = emailData.html.replace(/<[^>]*>/g, '').trim()
  }
  
  // Extract priority from subject (if mentioned)
  let priority = 'medium'
  const subjectLower = subject.toLowerCase()
  if (subjectLower.includes('urgent') || subjectLower.includes('critical')) {
    priority = 'urgent'
  } else if (subjectLower.includes('high')) {
    priority = 'high'
  } else if (subjectLower.includes('low')) {
    priority = 'low'
  }
  
  // Extract category from subject or body
  let category = 'General'
  const categoryKeywords = {
    'Hardware': ['hardware', 'computer', 'laptop', 'printer', 'device'],
    'Software': ['software', 'application', 'app', 'program'],
    'Network': ['network', 'internet', 'connection', 'wifi', 'vpn'],
    'Account': ['account', 'login', 'password', 'access'],
  }
  
  const searchText = (subject + ' ' + description).toLowerCase()
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => searchText.includes(keyword))) {
      category = cat
      break
    }
  }
  
  return {
    title: subject.length > 100 ? subject.substring(0, 100) : subject,
    description: description || 'No description provided',
    category,
    priority,
    fromEmail,
    fromName,
    emailMessageId: emailData.messageId,
  }
}

// Check for existing user or create guest user
const getOrCreateUser = async (email, name) => {
  let user = await User.findOne({ email })
  
  if (!user) {
    // Create a guest user (role: user, status: active)
    user = await User.create({
      name: name || email.split('@')[0],
      email,
      password: null, // Guest users don't have passwords
      role: 'user',
      status: 'active',
    })
    console.log(`✅ Created guest user: ${email}`)
  }
  
  return user
}

// Process a single email and create ticket
const processEmail = async (emailData) => {
  try {
    const ticketData = parseEmailToTicket(emailData)
    
    // Check if ticket already exists (by email message ID)
    if (ticketData.emailMessageId) {
      const existingTicket = await Ticket.findOne({ 
        emailMessageId: ticketData.emailMessageId 
      })
      
      if (existingTicket) {
        console.log(`ℹ️  Ticket already exists for email: ${ticketData.emailMessageId}`)
        return null
      }
    }
    
    // Get or create user
    const creator = await getOrCreateUser(ticketData.fromEmail, ticketData.fromName)
    
    // Create ticket
    const ticket = await Ticket.create({
      title: ticketData.title,
      description: ticketData.description,
      category: ticketData.category,
      priority: ticketData.priority,
      creator: creator._id,
      status: 'open',
      assignee: null,
      emailMessageId: ticketData.emailMessageId,
      sourceEmail: ticketData.fromEmail,
      comments: [{
        author: creator._id,
        content: `Original email from: ${ticketData.fromEmail}\nMessage ID: ${ticketData.emailMessageId || 'N/A'}`,
      }],
    })
    
    console.log(`✅ Created ticket #${ticket.ticketId} from email: ${ticketData.fromEmail}`)
    
    // Send acknowledgment email
    try {
      await sendTicketAcknowledgment(ticket, ticketData.fromEmail)
      console.log(`✅ Sent acknowledgment email to: ${ticketData.fromEmail}`)
    } catch (emailError) {
      console.error(`❌ Failed to send acknowledgment email:`, emailError.message)
      // Don't fail the ticket creation if email fails
    }
    
    return ticket
  } catch (error) {
    console.error('Error processing email:', error)
    throw error
  }
}

// Connect to IMAP and check for new emails
export const checkEmails = async () => {
  try {
    const settings = await EmailSettings.getSettings()
    
    if (!settings.imap.enabled) {
      console.log('ℹ️  IMAP is not enabled. Skipping email check.')
      return
    }
    
    return new Promise(async (resolve, reject) => {
      // Build IMAP config
      const imapConfig = {
        host: settings.imap.host,
        port: settings.imap.port,
        tls: settings.imap.secure || false,
        tlsOptions: { rejectUnauthorized: false },
      }

      // Configure authentication (OAuth2 or password)
      if (settings.imap.auth?.oauth2?.enabled) {
        // OAuth2 authentication - get access token
        try {
          const accessToken = await getValidIMAPAccessToken(settings)
          imapConfig.user = settings.imap.auth.user
          imapConfig.xoauth2 = accessToken
          // Note: The 'imap' package has limited OAuth2 support
          // For full OAuth2 support, consider using 'imap-simple' or 'node-imap' with xoauth2 plugin
          console.log('Using OAuth2 for IMAP authentication')
        } catch (error) {
          console.error('Failed to get OAuth2 token for IMAP:', error)
          return reject(new Error('OAuth2 authentication failed for IMAP'))
        }
      } else {
        // Password authentication
        imapConfig.user = settings.imap.auth.user
        imapConfig.password = settings.imap.auth.pass
      }

      const imap = new Imap(imapConfig)
      
      imap.once('ready', () => {
        imap.openBox('INBOX', false, (err, box) => {
          if (err) {
            console.error('Error opening INBOX:', err)
            imap.end()
            return reject(err)
          }
          
          // Search for unread emails
          imap.search(['UNSEEN'], (err, results) => {
            if (err) {
              console.error('Error searching emails:', err)
              imap.end()
              return reject(err)
            }
            
            if (!results || results.length === 0) {
              console.log('ℹ️  No new emails found.')
              imap.end()
              return resolve([])
            }
            
            console.log(`📧 Found ${results.length} new email(s)`)
            
            const fetch = imap.fetch(results, {
              bodies: '',
              struct: true,
            })
            
            const emails = []
            
            fetch.on('message', (msg, seqno) => {
              const emailData = {}
              
              msg.on('body', (stream, info) => {
                simpleParser(stream, async (err, parsed) => {
                  if (err) {
                    console.error('Error parsing email:', err)
                    return
                  }
                  
                  emailData.subject = parsed.subject
                  emailData.from = parsed.from
                  emailData.text = parsed.text
                  emailData.html = parsed.html
                  emailData.messageId = parsed.messageId
                  emailData.date = parsed.date
                  
                  emails.push(emailData)
                })
              })
            })
            
            fetch.once('end', async () => {
              imap.end()
              
              // Process each email
              const tickets = []
              for (const emailData of emails) {
                try {
                  const ticket = await processEmail(emailData)
                  if (ticket) {
                    tickets.push(ticket)
                  }
                } catch (error) {
                  console.error('Error processing email:', error)
                }
              }
              
              console.log(`✅ Processed ${tickets.length} email(s) into tickets`)
              resolve(tickets)
            })
          })
        })
      })
      
      imap.once('error', (err) => {
        console.error('IMAP error:', err)
        reject(err)
      })
      
      imap.connect()
    })
  } catch (error) {
    console.error('Error checking emails:', error)
    throw error
  }
}

