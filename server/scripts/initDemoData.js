// Script to initialize all demo data
import User from '../models/User.js'
import Ticket from '../models/Ticket.js'
import Role from '../models/Role.js'
import SSOConfig from '../models/SSOConfig.js'
import EmailSettings from '../models/EmailSettings.js'
import Organization from '../models/Organization.js'
import Category from '../models/Category.js'

const createDemoData = async () => {
  try {
    console.log('🚀 Initializing demo data...')

    // 0. Create Default Organization (or get existing)
    let defaultOrg = await Organization.findOne({ name: 'Default Organization' })
    if (!defaultOrg) {
      defaultOrg = await Organization.create({
        name: 'Default Organization',
        domain: null,
        description: 'Default organization for existing users and tickets',
        status: 'active',
        settings: {
          allowSelfRegistration: false,
          defaultRole: 'user',
        },
      })
      console.log('✅ Created default organization')
    } else {
      console.log('ℹ️  Default organization already exists')
    }

    // Migrate existing users without organization to default organization
    const usersWithoutOrg = await User.updateMany(
      { organization: { $exists: false } },
      { $set: { organization: defaultOrg._id } }
    )
    if (usersWithoutOrg.modifiedCount > 0) {
      console.log(`✅ Migrated ${usersWithoutOrg.modifiedCount} users to default organization`)
    }

    // Migrate existing tickets without organization to default organization
    const ticketsWithoutOrg = await Ticket.updateMany(
      { organization: { $exists: false } },
      { $set: { organization: defaultOrg._id } }
    )
    if (ticketsWithoutOrg.modifiedCount > 0) {
      console.log(`✅ Migrated ${ticketsWithoutOrg.modifiedCount} tickets to default organization`)
    }

    // 1. Create Demo Users
    const demoUsers = [
      { name: 'Admin User', email: 'admin@example.com', password: 'admin123', role: 'admin' },
      { name: 'Regular User', email: 'user@example.com', password: 'user123', role: 'user' },
      { name: 'Agent User', email: 'agent@example.com', password: 'agent123', role: 'agent' },
    ]

    const userIds = {}
    for (const userData of demoUsers) {
      let user = await User.findOne({ email: userData.email })
      if (!user) {
        user = await User.create({
          ...userData,
          status: 'active',
          organization: defaultOrg._id,
        })
        console.log(`✅ Created demo user: ${userData.email} (${userData.role})`)
      } else {
        // Ensure existing user has organization
        if (!user.organization) {
          user.organization = defaultOrg._id
          await user.save()
          console.log(`✅ Updated user ${userData.email} with default organization`)
        }
        console.log(`ℹ️  Demo user already exists: ${userData.email}`)
      }
      userIds[userData.role] = user._id
    }

    // 2. Create Demo Roles
    const demoRoles = [
      { name: 'Admin', permissions: ['all'] },
      { name: 'Agent', permissions: ['view_tickets', 'update_tickets', 'assign_tickets'] },
      { name: 'User', permissions: ['view_own_tickets', 'create_tickets'] },
    ]

    for (const roleData of demoRoles) {
      const existing = await Role.findOne({ name: roleData.name })
      if (!existing) {
        await Role.create(roleData)
        console.log(`✅ Created role: ${roleData.name}`)
      }
    }

    // 3. Create Demo Tickets (only if no tickets exist)
    const ticketCount = await Ticket.countDocuments()
    if (ticketCount === 0 && userIds.user && userIds.agent) {
      const demoTickets = [
        {
          title: 'Unable to login to the system',
          description: 'I am unable to login to my account. Getting an error message.',
          category: 'Technical',
          priority: 'high',
          status: 'open',
          creator: userIds.user,
          assignee: userIds.agent,
          comments: [{
            author: userIds.agent,
            content: 'Looking into this issue. Will update soon.',
          }],
        },
        {
          title: 'Feature request: Dark mode',
          description: 'It would be great to have a dark mode option for the application.',
          category: 'Feature Request',
          priority: 'low',
          status: 'open',
          creator: userIds.user,
        },
        {
          title: 'Password reset not working',
          description: 'The password reset email is not being received.',
          category: 'Technical',
          priority: 'urgent',
          status: 'in-progress',
          creator: userIds.user,
          assignee: userIds.agent,
          comments: [
            {
              author: userIds.agent,
              content: 'Checking email server configuration.',
            },
            {
              author: userIds.user,
              content: 'Still waiting for the email.',
            },
          ],
        },
        {
          title: 'Dashboard loading slowly',
          description: 'The dashboard takes too long to load, especially with many tickets.',
          category: 'Performance',
          priority: 'medium',
          status: 'resolved',
          creator: userIds.user,
          assignee: userIds.agent,
          comments: [{
            author: userIds.agent,
            content: 'Optimized database queries. Should be faster now.',
          }],
        },
        {
          title: 'Export tickets to CSV',
          description: 'Need ability to export tickets to CSV format for reporting.',
          category: 'Feature Request',
          priority: 'medium',
          status: 'open',
          creator: userIds.user,
        },
      ]

      for (const ticketData of demoTickets) {
        await Ticket.create({
          ...ticketData,
          organization: defaultOrg._id,
        })
      }
      console.log(`✅ Created ${demoTickets.length} demo tickets`)
    } else {
      console.log(`ℹ️  Tickets already exist (${ticketCount} tickets)`)
    }

    // 5. Initialize SSO Configs
    const ssoProviders = ['azure', 'google']
    for (const provider of ssoProviders) {
      const existing = await SSOConfig.findOne({ provider })
      if (!existing) {
        await SSOConfig.create({
          provider,
          enabled: false,
          config: {},
        })
        console.log(`✅ Created SSO config: ${provider}`)
      }
    }

    // 6. Initialize Email Settings
    const emailSettings = await EmailSettings.findOne()
    if (!emailSettings) {
      await EmailSettings.create({
        smtp: {
          host: '',
          port: 587,
          secure: false,
          user: '',
          password: '',
        },
        imap: {
          host: '',
          port: 993,
          secure: true,
          user: '',
          password: '',
        },
      })
      console.log('✅ Created email settings')
    }

    console.log('✅ Demo data initialization complete!')
  } catch (error) {
    console.error('❌ Error creating demo data:', error.message)
  }
}

// Export for use in server.js
export default createDemoData

