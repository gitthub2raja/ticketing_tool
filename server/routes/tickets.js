import express from 'express'
import Ticket from '../models/Ticket.js'
import User from '../models/User.js'
import SLAPolicy from '../models/SLAPolicy.js'
import Department from '../models/Department.js'
import { protect } from '../middleware/auth.js'
import upload from '../middleware/upload.js'
import { calculateDueDate, calculateResponseDueDate, SLA_POLICIES } from '../config/sla.js'

const router = express.Router()

// @route   GET /api/tickets
// @desc    Get all tickets (users only see their own, admins/agents see all)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { status, priority, search, organization } = req.query
    const query = {}

    // Filter by organization - admins can filter, others see only their org
    if (req.user.role === 'admin') {
      // Admins can filter by organization if provided, otherwise see all tickets
      if (organization) {
        query.organization = organization
      }
      // If no organization filter, admins see all tickets (no org filter applied)
    } else if (req.user.organization) {
      // Non-admin users see tickets from their organization OR tickets with no organization
      query.$or = [
        { organization: req.user.organization },
        { organization: null },
        { organization: { $exists: false } }
      ]
    } else {
      // User has no organization - show tickets with no organization
      query.$or = [
        { organization: null },
        { organization: { $exists: false } }
      ]
    }

    // Regular users can only see their own tickets
    // Agents see all tickets in their organization (they can see all org tickets)
    // Admins see all tickets
    // Technicians see all tickets in their organization
    // Department heads see tickets from their department
    if (req.user.role === 'user') {
      query.creator = req.user._id
    }
    // Agents, admins, technicians, and department heads see all tickets in their organization/department (no creator filter)

    if (status && status !== 'all') {
      query.status = status
    }
    if (priority && priority !== 'all') {
      query.priority = priority
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { ticketId: { $regex: search, $options: 'i' } },
      ]
    }

    // Department heads see tickets from their department
    if (req.user.role === 'department-head') {
      const user = await User.findById(req.user._id).populate('department')
      if (user.department) {
        // Ensure tickets have a department and match the department head's department
        query.department = user.department._id
      } else {
        // Department head without department assigned - return empty array
        return res.json([])
      }
    }

    // Debug logging
    console.log('GET /api/tickets - Status filter:', status)
    console.log('GET /api/tickets - Query:', JSON.stringify(query, null, 2))
    console.log('GET /api/tickets - User role:', req.user.role)
    console.log('GET /api/tickets - User organization:', req.user.organization)
    console.log('GET /api/tickets - Organization filter:', organization)
    
    const tickets = await Ticket.find(query)
      .populate('creator', 'name email')
      .populate('assignee', 'name email')
      .populate('department', 'name')
      .populate('approvedBy', 'name email')
      .populate('organization', 'name')
      .sort({ createdAt: -1 })

    console.log('GET /api/tickets - Tickets found:', tickets.length)
    if (status === 'approved') {
      const approvedTickets = tickets.filter(t => t.status === 'approved')
      console.log('GET /api/tickets - Approved tickets in results:', approvedTickets.length)
      if (approvedTickets.length > 0) {
        console.log('GET /api/tickets - Sample approved ticket:', {
          id: approvedTickets[0].ticketId,
          status: approvedTickets[0].status,
          organization: approvedTickets[0].organization?._id || approvedTickets[0].organization
        })
      }
    }

    res.json(tickets)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   GET /api/tickets/:id
// @desc    Get single ticket
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ ticketId: req.params.id })
      .populate('creator', 'name email')
      .populate('assignee', 'name email')
      .populate('department', 'name')
      .populate('comments.author', 'name email')
      .populate('comments.mentions', 'name email')

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' })
    }

    // Check access permissions based on user role
    const userRole = req.user.role
    const userId = req.user._id.toString()
    const ticketCreatorId = ticket.creator?._id?.toString() || ticket.creator?.toString()
    
    // Admins and agents can view all tickets
    if (userRole === 'admin' || userRole === 'agent') {
      // Allow access
    }
    // Department heads can view tickets from their department
    else if (userRole === 'department-head') {
      const user = await User.findById(req.user._id).populate('department')
      if (!user.department) {
        return res.status(403).json({ message: 'Access denied. No department assigned.' })
      }
      const userDeptId = user.department._id.toString()
      const ticketDeptId = ticket.department?._id?.toString() || ticket.department?.toString()
      
      if (ticketDeptId !== userDeptId) {
        return res.status(403).json({ message: 'Access denied. You can only view tickets from your department.' })
      }
    }
    // Technicians can view tickets they're assigned to or from their organization
    else if (userRole === 'technician') {
      const ticketAssigneeId = ticket.assignee?._id?.toString() || ticket.assignee?.toString()
      const isAssigned = ticketAssigneeId === userId
      const isSameOrg = ticket.organization?.toString() === req.user.organization?.toString()
      
      if (!isAssigned && !isSameOrg) {
        return res.status(403).json({ message: 'Access denied. You can only view tickets assigned to you or from your organization.' })
      }
    }
    // Regular users can only view their own tickets
    else if (userRole === 'user') {
      if (ticketCreatorId !== userId) {
        return res.status(403).json({ message: 'Access denied. You can only view your own tickets.' })
      }
    }
    // Unknown role - deny access
    else {
      return res.status(403).json({ message: 'Access denied. Invalid user role.' })
    }

    res.json(ticket)
  } catch (error) {
    console.error('Error fetching ticket:', error)
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/tickets
// @desc    Create new ticket
// @access  Private
router.post('/', protect, upload.array('attachments', 10), async (req, res) => {
  try {
    const { title, description, category, priority, assignee, ticketId } = req.body
    const ticketPriority = priority || 'medium'
    const createdAt = new Date()
    const userOrganization = req.user.organization

    // Try to get organization-specific SLA policy, fall back to global, then default
    let slaPolicy = null
    if (userOrganization) {
      slaPolicy = await SLAPolicy.findOne({
        organization: userOrganization,
        priority: ticketPriority,
        isActive: true,
      })
    }
    
    // If no org-specific policy, try global policy
    if (!slaPolicy) {
      slaPolicy = await SLAPolicy.findOne({
        organization: null,
        priority: ticketPriority,
        isActive: true,
      })
    }

    // If still no policy, use default from config
    if (!slaPolicy) {
      slaPolicy = {
        responseTime: SLA_POLICIES[ticketPriority]?.responseTime || SLA_POLICIES.medium.responseTime,
        resolutionTime: SLA_POLICIES[ticketPriority]?.resolutionTime || SLA_POLICIES.medium.resolutionTime,
      }
    }

    // Calculate SLA-based due dates
    const calculatedDueDate = new Date(createdAt)
    calculatedDueDate.setHours(calculatedDueDate.getHours() + slaPolicy.resolutionTime)
    
    const calculatedResponseDueDate = new Date(createdAt)
    calculatedResponseDueDate.setHours(calculatedResponseDueDate.getHours() + slaPolicy.responseTime)

    // Get user's department
    const user = await User.findById(req.user._id).populate('department')
    const userDepartment = user.department?._id || user.department || null

    // Set status based on user role
    // All users create tickets with 'open' status initially
    // Admin will change to 'approval-pending' when ready for department head approval
    let ticketStatus = 'open'

    const ticketData = {
      title,
      description,
      category,
      priority: ticketPriority,
      status: ticketStatus,
      creator: req.user._id,
      assignee: assignee || null,
      department: userDepartment,
      dueDate: calculatedDueDate, // Auto-calculated from SLA
      responseDueDate: calculatedResponseDueDate, // Auto-calculated from SLA
      slaResponseTime: slaPolicy.responseTime,
      slaResolutionTime: slaPolicy.resolutionTime,
      organization: req.user.organization,
      // Don't set ticketId here - let pre-save hook handle it
    }

    // Allow manual ticketId if provided (for first-time setup)
    if (ticketId && ticketId !== '' && ticketId !== null && ticketId !== undefined) {
      ticketData.ticketId = parseInt(ticketId)
    }

    // Handle file uploads
    if (req.files && req.files.length > 0) {
      ticketData.attachments = req.files.map(file => ({
        filename: file.originalname,
        path: `/api/uploads/${file.filename}`,
        size: file.size,
        mimetype: file.mimetype,
      }))
    }

    // Create ticket - pre-save hook will auto-generate ticketId if not provided
    const ticket = await Ticket.create(ticketData)

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('creator', 'name email')
      .populate('assignee', 'name email')
      .populate('department', 'name')

    // Send email notification to ticket creator (async, don't wait)
    if (populatedTicket.creator?.email) {
      import('../services/emailService.js').then(({ sendTicketAcknowledgment }) => {
        sendTicketAcknowledgment(populatedTicket, populatedTicket.creator.email).catch(err => {
          console.error('Email notification error:', err)
        })
      })
    }

    // Send email notification to assignee if assigned (async, don't wait)
    if (populatedTicket.assignee?.email) {
      import('../services/emailService.js').then(({ sendEmail }) => {
        const subject = `Ticket #${populatedTicket.ticketId} Assigned to You - ${populatedTicket.title}`
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1f2937;">Ticket Assigned</h2>
            <p>You have been assigned to ticket #${populatedTicket.ticketId}.</p>
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Title:</strong> ${populatedTicket.title}</p>
              <p><strong>Priority:</strong> ${populatedTicket.priority.toUpperCase()}</p>
              <p><strong>Category:</strong> ${populatedTicket.category}</p>
              <p><strong>Created By:</strong> ${populatedTicket.creator?.name || 'Unknown'}</p>
              <p><strong>Department:</strong> ${populatedTicket.department?.name || 'N/A'}</p>
            </div>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost'}/tickets/${populatedTicket.ticketId}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Ticket</a></p>
          </div>
        `
        sendEmail(populatedTicket.assignee.email, subject, html).catch(err => {
          console.error('Assignee email notification error:', err)
        })
      })
    }

    // Send Teams notification (async, don't wait)
    import('../services/teamsService.js').then(({ notifyTicketCreated }) => {
      notifyTicketCreated(populatedTicket, userOrganization).catch(err => {
        console.error('Teams notification error:', err)
      })
    })

    res.status(201).json(populatedTicket)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   PUT /api/tickets/:id
// @desc    Update ticket (regular users can only update title/description, not status/priority)
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ ticketId: req.params.id })

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' })
    }

    // Regular users can only update their own tickets and only title/description
    if (req.user.role !== 'admin' && req.user.role !== 'agent') {
      // Check if user is the creator
      if (ticket.creator.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'You can only update your own tickets' })
      }
      // Regular users cannot update status, priority, or assignee
      const { status, priority, assignee } = req.body
      if (status !== undefined || priority !== undefined || assignee !== undefined) {
        return res.status(403).json({ message: 'You do not have permission to update status, priority, or assignee' })
      }
    }

    const { title, description, status, priority, assignee } = req.body

    if (title) ticket.title = title
    if (description) ticket.description = description
    // Only admins/agents can update status, priority, assignee
    if (status && (req.user.role === 'admin' || req.user.role === 'agent')) {
      ticket.status = status
    }
    if (priority && (req.user.role === 'admin' || req.user.role === 'agent')) {
      ticket.priority = priority
      // Recalculate SLA dates when priority changes
      const createdAt = ticket.createdAt || new Date()
      const ticketOrganization = ticket.organization || req.user.organization
      
      // Try to get organization-specific SLA policy
      let slaPolicy = null
      if (ticketOrganization) {
        slaPolicy = await SLAPolicy.findOne({
          organization: ticketOrganization,
          priority: priority,
          isActive: true,
        })
      }
      
      // If no org-specific policy, try global policy
      if (!slaPolicy) {
        slaPolicy = await SLAPolicy.findOne({
          organization: null,
          priority: priority,
          isActive: true,
        })
      }

      // If still no policy, use default from config
      if (!slaPolicy) {
        slaPolicy = {
          responseTime: SLA_POLICIES[priority]?.responseTime || SLA_POLICIES.medium.responseTime,
          resolutionTime: SLA_POLICIES[priority]?.resolutionTime || SLA_POLICIES.medium.resolutionTime,
        }
      }

      // Recalculate dates
      ticket.dueDate = new Date(createdAt)
      ticket.dueDate.setHours(ticket.dueDate.getHours() + slaPolicy.resolutionTime)
      
      ticket.responseDueDate = new Date(createdAt)
      ticket.responseDueDate.setHours(ticket.responseDueDate.getHours() + slaPolicy.responseTime)
      
      ticket.slaResponseTime = slaPolicy.responseTime
      ticket.slaResolutionTime = slaPolicy.resolutionTime
    }
    const oldAssignee = ticket.assignee
    if (assignee !== undefined && (req.user.role === 'admin' || req.user.role === 'agent')) {
      ticket.assignee = assignee
    }

    await ticket.save()

    const updatedTicket = await Ticket.findById(ticket._id)
      .populate('creator', 'name email')
      .populate('assignee', 'name email')
      .populate('department', 'name')
      .populate('comments.author', 'name email')
      .populate('comments.mentions', 'name email')

    // Send email notifications (async)
    const changes = {}
    if (status) changes.status = status
    if (priority) changes.priority = priority
    if (assignee !== undefined) changes.assignee = updatedTicket.assignee?.name || 'Unassigned'

    // Send email to ticket creator on any update
    if (Object.keys(changes).length > 0 && updatedTicket.creator?.email) {
      import('../services/emailService.js').then(({ sendTicketUpdateEmail }) => {
        sendTicketUpdateEmail(updatedTicket, updatedTicket.creator.email, changes).catch(err => {
          console.error('Email notification error:', err)
        })
      })
    }

    // Send email to assignee if newly assigned
    if (assignee !== undefined && assignee?.toString() !== oldAssignee?.toString() && updatedTicket.assignee?.email) {
      import('../services/emailService.js').then(({ sendEmail }) => {
        const subject = `Ticket #${updatedTicket.ticketId} Assigned to You - ${updatedTicket.title}`
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1f2937;">Ticket Assigned</h2>
            <p>You have been assigned to ticket #${updatedTicket.ticketId}.</p>
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Title:</strong> ${updatedTicket.title}</p>
              <p><strong>Priority:</strong> ${updatedTicket.priority.toUpperCase()}</p>
              <p><strong>Status:</strong> ${updatedTicket.status}</p>
            </div>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost'}/tickets/${updatedTicket.ticketId}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Ticket</a></p>
          </div>
        `
        sendEmail(updatedTicket.assignee.email, subject, html).catch(err => {
          console.error('Assignee email notification error:', err)
        })
      })
    }

    // Send Teams notifications (async)
    const ticketOrg = updatedTicket.organization?._id || updatedTicket.organization
    import('../services/teamsService.js').then(({ notifyTicketUpdated, notifyTicketAssigned, notifyTicketResolved }) => {
      // Notify on status change
      if (status && status !== ticket.status) {
        if (status === 'resolved') {
          notifyTicketResolved(updatedTicket, ticketOrg).catch(err => console.error('Teams notification error:', err))
        }
      }
      
      // Notify on assignment change
      if (assignee !== undefined && assignee?.toString() !== oldAssignee?.toString() && updatedTicket.assignee) {
        notifyTicketAssigned(updatedTicket, updatedTicket.assignee, ticketOrg).catch(err => console.error('Teams notification error:', err))
      }
      
      // Notify on update
      if (Object.keys(changes).length > 0) {
        notifyTicketUpdated(updatedTicket, changes, ticketOrg).catch(err => console.error('Teams notification error:', err))
      }
    })

    res.json(updatedTicket)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/tickets/:id/comments
// @desc    Add comment to ticket
// @access  Private
router.post('/:id/comments', protect, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ ticketId: req.params.id })

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' })
    }

    const { content, attachments } = req.body

    // Parse mentions from content (format: @username or @name)
    const mentionRegex = /@(\w+)/g
    const mentionedUsernames = []
    let match
    while ((match = mentionRegex.exec(content)) !== null) {
      mentionedUsernames.push(match[1])
    }

    // Find mentioned users by name or email
    const mentionedUsers = []
    if (mentionedUsernames.length > 0) {
      // Try to find users by name (case-insensitive partial match)
      for (const mention of mentionedUsernames) {
        const user = await User.findOne({
          $or: [
            { name: { $regex: new RegExp(`^${mention}`, 'i') } },
            { email: { $regex: new RegExp(`^${mention}`, 'i') } },
          ],
          organization: ticket.organization, // Only users from same organization
        })
        if (user && !mentionedUsers.find(u => u._id.toString() === user._id.toString())) {
          mentionedUsers.push(user._id)
        }
      }
    }

    ticket.comments.push({
      author: req.user._id,
      content,
      mentions: mentionedUsers,
      attachments: attachments || [],
    })

    await ticket.save()

    const updatedTicket = await Ticket.findById(ticket._id)
      .populate('creator', 'name email')
      .populate('assignee', 'name email')
      .populate('department', 'name')
      .populate('approvedBy', 'name email')
      .populate('comments.author', 'name email')
      .populate('comments.mentions', 'name email')

    res.json(updatedTicket)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/tickets/:id/approve
// @desc    Approve ticket (Department Head only)
// @access  Private
router.post('/:id/approve', protect, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ ticketId: req.params.id })
      .populate('department')

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' })
    }

    // Check if user is department head
    if (req.user.role !== 'department-head' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only department heads can approve tickets' })
    }

    // Verify department head has access to this ticket's department
    if (req.user.role === 'department-head') {
      const user = await User.findById(req.user._id).populate('department')
      if (!user.department || user.department._id.toString() !== ticket.department?._id?.toString()) {
        return res.status(403).json({ message: 'You can only approve tickets from your department' })
      }
    }

    // Check if ticket is in approval-pending status
    if (ticket.status !== 'approval-pending') {
      return res.status(400).json({ message: 'Only tickets with approval-pending status can be approved' })
    }

    // Approve ticket
    ticket.status = 'approved'
    ticket.approvedBy = req.user._id
    ticket.approvedAt = new Date()

    await ticket.save()

    const updatedTicket = await Ticket.findById(ticket._id)
      .populate('creator', 'name email')
      .populate('assignee', 'name email')
      .populate('department', 'name')
      .populate('approvedBy', 'name email')

    // Send email notification to ticket creator (async, don't wait)
    if (updatedTicket.creator?.email) {
      import('../services/emailService.js').then(({ sendEmail }) => {
        const subject = `Ticket #${updatedTicket.ticketId} Approved - ${updatedTicket.title}`
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">Ticket Approved</h2>
            <p>Dear ${updatedTicket.creator?.name || 'Customer'},</p>
            <p>Your ticket #${updatedTicket.ticketId} has been <strong style="color: #10b981;">approved</strong> by ${updatedTicket.approvedBy?.name || 'Department Head'}.</p>
            <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #10b981;">Ticket Details:</h3>
              <p><strong>Ticket ID:</strong> #${updatedTicket.ticketId}</p>
              <p><strong>Title:</strong> ${updatedTicket.title}</p>
              <p><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">APPROVED</span></p>
              <p><strong>Priority:</strong> ${updatedTicket.priority.toUpperCase()}</p>
              <p><strong>Category:</strong> ${updatedTicket.category}</p>
              <p><strong>Approved By:</strong> ${updatedTicket.approvedBy?.name || 'Department Head'}</p>
              <p><strong>Approved On:</strong> ${new Date(updatedTicket.approvedAt).toLocaleString()}</p>
              ${updatedTicket.department ? `<p><strong>Department:</strong> ${updatedTicket.department.name}</p>` : ''}
            </div>
            <p>Your ticket is now approved and will be assigned to a technician for resolution.</p>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost'}/tickets/${updatedTicket.ticketId}" style="background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Ticket</a></p>
            <p>Best regards,<br>Support Team</p>
          </div>
        `
        sendEmail(updatedTicket.creator.email, subject, html).catch(err => {
          console.error('Approval email notification error:', err)
        })
      })
    }

    // Send Teams notification (async)
    const ticketOrg = updatedTicket.organization?._id || updatedTicket.organization
    import('../services/teamsService.js').then(({ notifyTicketUpdated }) => {
      notifyTicketUpdated(updatedTicket, { status: 'approved', approvedBy: updatedTicket.approvedBy?.name || 'Department Head' }, ticketOrg).catch(err => {
        console.error('Teams notification error:', err)
      })
    })

    res.json(updatedTicket)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/tickets/:id/reject
// @desc    Reject ticket (Department Head only)
// @access  Private
router.post('/:id/reject', protect, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ ticketId: req.params.id })
      .populate('department')

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' })
    }

    // Check if user is department head
    if (req.user.role !== 'department-head' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only department heads can reject tickets' })
    }

    // Verify department head has access to this ticket's department
    if (req.user.role === 'department-head') {
      const user = await User.findById(req.user._id).populate('department')
      if (!user.department || user.department._id.toString() !== ticket.department?._id?.toString()) {
        return res.status(403).json({ message: 'You can only reject tickets from your department' })
      }
    }

    // Check if ticket is in approval-pending status
    if (ticket.status !== 'approval-pending') {
      return res.status(400).json({ message: 'Only tickets with approval-pending status can be rejected' })
    }

    const { rejectionReason } = req.body

    // Reject ticket
    ticket.status = 'rejected'
    ticket.approvedBy = req.user._id
    ticket.approvedAt = new Date()
    if (rejectionReason) {
      ticket.rejectionReason = rejectionReason
    }

    await ticket.save()

    const updatedTicket = await Ticket.findById(ticket._id)
      .populate('creator', 'name email')
      .populate('assignee', 'name email')
      .populate('department', 'name')
      .populate('approvedBy', 'name email')

    // Send email notification to ticket creator (async, don't wait)
    if (updatedTicket.creator?.email) {
      import('../services/emailService.js').then(({ sendEmail }) => {
        const subject = `Ticket #${updatedTicket.ticketId} Rejected - ${updatedTicket.title}`
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ef4444;">Ticket Rejected</h2>
            <p>Dear ${updatedTicket.creator?.name || 'Customer'},</p>
            <p>We regret to inform you that your ticket #${updatedTicket.ticketId} has been <strong style="color: #ef4444;">rejected</strong> by ${updatedTicket.approvedBy?.name || 'Department Head'}.</p>
            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #ef4444;">Ticket Details:</h3>
              <p><strong>Ticket ID:</strong> #${updatedTicket.ticketId}</p>
              <p><strong>Title:</strong> ${updatedTicket.title}</p>
              <p><strong>Status:</strong> <span style="color: #ef4444; font-weight: bold;">REJECTED</span></p>
              <p><strong>Priority:</strong> ${updatedTicket.priority.toUpperCase()}</p>
              <p><strong>Category:</strong> ${updatedTicket.category}</p>
              <p><strong>Rejected By:</strong> ${updatedTicket.approvedBy?.name || 'Department Head'}</p>
              <p><strong>Rejected On:</strong> ${new Date(updatedTicket.approvedAt).toLocaleString()}</p>
              ${updatedTicket.rejectionReason ? `<p><strong>Rejection Reason:</strong> ${updatedTicket.rejectionReason}</p>` : ''}
              ${updatedTicket.department ? `<p><strong>Department:</strong> ${updatedTicket.department.name}</p>` : ''}
            </div>
            <p>If you have any questions or concerns about this decision, please contact the department head or create a new ticket.</p>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost'}/tickets/${updatedTicket.ticketId}" style="background: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Ticket</a></p>
            <p>Best regards,<br>Support Team</p>
          </div>
        `
        sendEmail(updatedTicket.creator.email, subject, html).catch(err => {
          console.error('Rejection email notification error:', err)
        })
      })
    }

    // Send Teams notification (async)
    const ticketOrg = updatedTicket.organization?._id || updatedTicket.organization
    import('../services/teamsService.js').then(({ notifyTicketUpdated }) => {
      notifyTicketUpdated(updatedTicket, { status: 'rejected', approvedBy: updatedTicket.approvedBy?.name || 'Department Head' }, ticketOrg).catch(err => {
        console.error('Teams notification error:', err)
      })
    })

    res.json(updatedTicket)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   GET /api/tickets/stats/dashboard
// @desc    Get dashboard statistics (users only see their own stats)
// @access  Private
router.get('/stats/dashboard', protect, async (req, res) => {
  try {
    const { organization } = req.query
    
    // Build base query with organization filter
    let baseQuery = {}
    
    // Filter by organization - admins can filter, others see only their org
    if (req.user.role === 'admin') {
      // Admins can filter by organization if selected, otherwise show all tickets
      if (organization) {
        baseQuery.organization = organization
      }
      // If no organization selected, baseQuery remains {} to show all tickets
    } else if (req.user.organization) {
      // Non-admin users only see tickets from their organization
      baseQuery.organization = req.user.organization
    }
    
    // Department heads see tickets from their department
    if (req.user.role === 'department-head') {
      const user = await User.findById(req.user._id).populate('department')
      if (user.department) {
        // Ensure tickets have a department and match the department head's department
        baseQuery.department = user.department._id
      } else {
        // No department assigned, return empty stats
        return res.json({
          totalTickets: 0,
          openTickets: 0,
          pendingTickets: 0,
          approvedTickets: 0,
          approvalPendingTickets: 0,
          rejectedTickets: 0,
          inProgressTickets: 0,
          resolvedTickets: 0,
          closedTickets: 0,
          overdueTickets: 0,
          recentTickets: [],
          myOpenTickets: [],
          statusDistribution: [],
          priorityDistribution: [],
          weeklyTrends: []
        })
      }
    }

    // Regular users only see their own tickets
    // Agents see all tickets in their organization (they can see all org tickets)
    // Admins see all tickets (or filtered by organization)
    // Technicians see all tickets in their organization
    if (req.user.role === 'user') {
      baseQuery.creator = req.user._id
    }
    // Agents, admins, technicians, and department heads see all tickets in their organization/department (no creator filter)

    const totalTickets = await Ticket.countDocuments(baseQuery)
    const openTickets = await Ticket.countDocuments({ ...baseQuery, status: 'open' })
    const pendingTickets = await Ticket.countDocuments({ ...baseQuery, status: { $in: ['open', 'in-progress'] } })
    const approvalPendingTickets = await Ticket.countDocuments({ ...baseQuery, status: 'approval-pending' })
    const approvedTickets = await Ticket.countDocuments({ ...baseQuery, status: 'approved' })
    const rejectedTickets = await Ticket.countDocuments({ ...baseQuery, status: 'rejected' })
    const inProgressTickets = await Ticket.countDocuments({ ...baseQuery, status: 'in-progress' })
    const resolvedTickets = await Ticket.countDocuments({ ...baseQuery, status: 'resolved' })
    const closedTickets = await Ticket.countDocuments({ ...baseQuery, status: 'closed' })
    
    // Calculate overdue tickets (tickets that are open/in-progress and past due date)
    const now = new Date()
    const overdueTickets = await Ticket.countDocuments({
      ...baseQuery,
      status: { $in: ['open', 'in-progress'] },
      dueDate: { $exists: true, $ne: null, $lt: now }
    })

    // Get recent tickets
    const recentTickets = await Ticket.find(baseQuery)
      .populate('creator', 'name email')
      .populate('assignee', 'name email')
      .populate('department', 'name')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)

    // Get weekly ticket trends (last 7 days)
    const weeklyData = []
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const dayTickets = await Ticket.countDocuments({
        ...baseQuery,
        createdAt: { $gte: date, $lt: nextDate }
      })
      
      const dayResolved = await Ticket.countDocuments({
        ...baseQuery,
        status: 'resolved',
        updatedAt: { $gte: date, $lt: nextDate }
      })

      weeklyData.push({
        name: dayNames[date.getDay()],
        tickets: dayTickets,
        resolved: dayResolved
      })
    }

    // Get status distribution for bar chart (include new approval statuses)
    const statusCounts = {
      'approval-pending': await Ticket.countDocuments({ ...baseQuery, status: 'approval-pending' }),
      approved: await Ticket.countDocuments({ ...baseQuery, status: 'approved' }),
      rejected: await Ticket.countDocuments({ ...baseQuery, status: 'rejected' }),
      open: await Ticket.countDocuments({ ...baseQuery, status: 'open' }),
      'in-progress': await Ticket.countDocuments({ ...baseQuery, status: 'in-progress' }),
      resolved: await Ticket.countDocuments({ ...baseQuery, status: 'resolved' }),
      closed: await Ticket.countDocuments({ ...baseQuery, status: 'closed' })
    }

    const statusData = [
      { name: 'Approval Pending', value: statusCounts['approval-pending'], color: '#ffaa00' },
      { name: 'Approved', value: statusCounts.approved, color: '#00aaff' },
      { name: 'Rejected', value: statusCounts.rejected, color: '#ff4444' },
      { name: 'Open', value: statusCounts.open, color: '#00ffff' },
      { name: 'In Progress', value: statusCounts['in-progress'], color: '#ff8800' },
      { name: 'Resolved', value: statusCounts.resolved, color: '#00ff80' },
      { name: 'Closed', value: statusCounts.closed, color: '#888888' }
    ].filter(item => item.value > 0) // Only include statuses that have tickets

    // Get priority distribution
    const priorityCounts = {
      low: await Ticket.countDocuments({ ...baseQuery, priority: 'low' }),
      medium: await Ticket.countDocuments({ ...baseQuery, priority: 'medium' }),
      high: await Ticket.countDocuments({ ...baseQuery, priority: 'high' }),
      urgent: await Ticket.countDocuments({ ...baseQuery, priority: 'urgent' })
    }

    const priorityData = [
      { name: 'Low', value: priorityCounts.low, color: '#00ff80' },
      { name: 'Medium', value: priorityCounts.medium, color: '#ffff00' },
      { name: 'High', value: priorityCounts.high, color: '#ff4444' },
      { name: 'Urgent', value: priorityCounts.urgent, color: '#ff0080' }
    ].filter(item => item.value > 0) // Only include priorities that have tickets

    // Get my open tickets (for current user) - use same base query logic as dashboard stats
    // Query separately with status filter to get open and in-progress tickets
    const myOpenTicketsQuery = {
      ...baseQuery,
      status: { $in: ['open', 'in-progress'] } // Show both 'open' and 'in-progress' tickets
    }
    
    const myOpenTickets = await Ticket.find(myOpenTicketsQuery)
      .populate('creator', 'name email')
      .populate('assignee', 'name email')
      .populate('department', 'name')
      .populate('organization', 'name')
      .sort({ createdAt: -1 })
      .limit(10)

    res.json({
      totalTickets,
      openTickets,
      pendingTickets,
      approvedTickets,
      approvalPendingTickets,
      rejectedTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      overdueTickets,
      recentTickets,
      weeklyTrends: weeklyData,
      statusDistribution: statusData,
      priorityDistribution: priorityData,
      myOpenTickets,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/tickets/import
// @desc    Import tickets from external system
// @access  Private/Admin
router.post('/import', protect, async (req, res) => {
  try {
    const { tickets } = req.body

    if (!Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({ message: 'Invalid tickets data. Expected an array of tickets.' })
    }

    // Get the highest ticketId to continue sequence
    const lastTicket = await Ticket.findOne().sort({ ticketId: -1 }).exec()
    let nextTicketId = lastTicket && lastTicket.ticketId ? lastTicket.ticketId + 1 : 1000

    const results = {
      success: 0,
      errors: [],
    }

    for (const ticketData of tickets) {
      try {
        // Map external ticket data to our schema
        const mappedTicket = {
          ticketId: ticketData.ticketId || nextTicketId++,
          title: ticketData.title || ticketData.subject || 'Imported Ticket',
          description: ticketData.description || ticketData.body || '',
          category: ticketData.category || 'General',
          priority: ticketData.priority || 'medium',
          status: ticketData.status || 'open',
          creator: req.user._id,
          organization: req.user.organization,
          createdAt: ticketData.createdAt ? new Date(ticketData.createdAt) : new Date(),
          dueDate: ticketData.dueDate ? new Date(ticketData.dueDate) : null,
        }

        // Validate status
        const validStatuses = ['open', 'approval-pending', 'approved', 'rejected', 'in-progress', 'resolved', 'closed']
        if (!validStatuses.includes(mappedTicket.status)) {
          mappedTicket.status = 'open'
        }

        // Validate priority
        const validPriorities = ['low', 'medium', 'high', 'urgent']
        if (!validPriorities.includes(mappedTicket.priority)) {
          mappedTicket.priority = 'medium'
        }

        // Calculate SLA dates if not provided
        if (!mappedTicket.dueDate) {
          const ticketPriority = mappedTicket.priority
          const userOrganization = req.user.organization

          let slaPolicy = null
          if (userOrganization) {
            slaPolicy = await SLAPolicy.findOne({
              organization: userOrganization,
              priority: ticketPriority,
              isActive: true,
            })
          }

          if (!slaPolicy) {
            slaPolicy = await SLAPolicy.findOne({
              organization: null,
              priority: ticketPriority,
              isActive: true,
            })
          }

          if (!slaPolicy) {
            slaPolicy = {
              responseTime: SLA_POLICIES[ticketPriority]?.responseTime || SLA_POLICIES.medium.responseTime,
              resolutionTime: SLA_POLICIES[ticketPriority]?.resolutionTime || SLA_POLICIES.medium.resolutionTime,
            }
          }

          const createdAt = mappedTicket.createdAt
          mappedTicket.dueDate = new Date(createdAt)
          mappedTicket.dueDate.setHours(mappedTicket.dueDate.getHours() + slaPolicy.resolutionTime)
          
          mappedTicket.responseDueDate = new Date(createdAt)
          mappedTicket.responseDueDate.setHours(mappedTicket.responseDueDate.getHours() + slaPolicy.responseTime)
          
          mappedTicket.slaResponseTime = slaPolicy.responseTime
          mappedTicket.slaResolutionTime = slaPolicy.resolutionTime
        }

        // Create ticket (pre-save hook will handle ticketId if not provided)
        await Ticket.create(mappedTicket)
        results.success++
      } catch (error) {
        results.errors.push({
          ticketId: ticketData.ticketId || 'Unknown',
          message: error.message || 'Failed to import ticket',
        })
      }
    }

    res.json(results)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router

