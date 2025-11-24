import express from 'express'
import Ticket from '../models/Ticket.js'
import User from '../models/User.js'
import { protect } from '../middleware/auth.js'
import upload from '../middleware/upload.js'

const router = express.Router()

// @route   GET /api/tickets
// @desc    Get all tickets (users only see their own, admins/agents see all)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { status, priority, search, organization } = req.query
    const query = {}

    // Filter by organization - admins can filter, others see only their org
    if (req.user.role === 'admin' && organization) {
      query.organization = organization
    } else if (req.user.organization) {
      // Non-admin users only see tickets from their organization
      query.organization = req.user.organization
    }

    // Regular users can only see their own tickets
    // Agents see all tickets in their organization (they can see all org tickets)
    // Admins see all tickets
    if (req.user.role === 'user') {
      query.creator = req.user._id
    }
    // Agents and admins see all tickets in their organization (no creator filter)

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

    const tickets = await Ticket.find(query)
      .populate('creator', 'name email')
      .populate('assignee', 'name email')
      .sort({ createdAt: -1 })

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
      .populate('comments.author', 'name email')
      .populate('comments.mentions', 'name email')

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' })
    }

    // Non-admin/agent users can only access their own tickets
    if (req.user.role !== 'admin' && req.user.role !== 'agent') {
      if (ticket.creator._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied. You can only view your own tickets.' })
      }
    }

    res.json(ticket)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/tickets
// @desc    Create new ticket
// @access  Private
router.post('/', protect, upload.array('attachments', 10), async (req, res) => {
  try {
    const { title, description, category, priority, assignee, dueDate, ticketId } = req.body

    const ticketData = {
      title,
      description,
      category,
      priority: priority || 'medium',
      creator: req.user._id,
      assignee: assignee || null,
      dueDate: dueDate || null,
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

    const { title, description, status, priority, assignee, dueDate } = req.body

    if (title) ticket.title = title
    if (description) ticket.description = description
    // Only admins/agents can update status, priority, assignee, dueDate
    if (status && (req.user.role === 'admin' || req.user.role === 'agent')) {
      ticket.status = status
    }
    if (priority && (req.user.role === 'admin' || req.user.role === 'agent')) {
      ticket.priority = priority
    }
    if (assignee !== undefined && (req.user.role === 'admin' || req.user.role === 'agent')) {
      ticket.assignee = assignee
    }
    if (dueDate !== undefined && (req.user.role === 'admin' || req.user.role === 'agent')) {
      ticket.dueDate = dueDate || null
    }

    await ticket.save()

    const updatedTicket = await Ticket.findById(ticket._id)
      .populate('creator', 'name email')
      .populate('assignee', 'name email')
      .populate('comments.author', 'name email')
      .populate('comments.mentions', 'name email')

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
      .populate('comments.author', 'name email')
      .populate('comments.mentions', 'name email')

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
    
    // Regular users only see their own tickets
    // Agents see all tickets in their organization (they can see all org tickets)
    // Admins see all tickets (or filtered by organization)
    if (req.user.role === 'user') {
      baseQuery.creator = req.user._id
    }
    // Agents and admins see all tickets in their organization (no creator filter)

    const totalTickets = await Ticket.countDocuments(baseQuery)
    const openTickets = await Ticket.countDocuments({ ...baseQuery, status: 'open' })
    const pendingTickets = await Ticket.countDocuments({ ...baseQuery, status: { $in: ['open', 'in-progress'] } })
    const closedTickets = await Ticket.countDocuments({ ...baseQuery, status: { $in: ['resolved', 'closed'] } })
    
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

    // Get status distribution for bar chart
    const statusCounts = {
      open: await Ticket.countDocuments({ ...baseQuery, status: 'open' }),
      'in-progress': await Ticket.countDocuments({ ...baseQuery, status: 'in-progress' }),
      resolved: await Ticket.countDocuments({ ...baseQuery, status: 'resolved' }),
      closed: await Ticket.countDocuments({ ...baseQuery, status: 'closed' })
    }

    const statusData = [
      { name: 'Open', value: statusCounts.open, color: '#00ffff' },
      { name: 'In Progress', value: statusCounts['in-progress'], color: '#ff8800' },
      { name: 'Resolved', value: statusCounts.resolved, color: '#00ff80' },
      { name: 'Closed', value: statusCounts.closed, color: '#888888' }
    ]

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
    // Query separately with status filter to get only 'open' status tickets (not 'in-progress')
    const myOpenTicketsQuery = {
      ...baseQuery,
      status: 'open' // Only show 'open' status, not 'in-progress'
    }
    
    console.log('=== My Open Tickets Debug ===')
    console.log('Base Query:', JSON.stringify(baseQuery, null, 2))
    console.log('My Open Tickets Query:', JSON.stringify(myOpenTicketsQuery, null, 2))
    console.log('User Role:', req.user.role)
    console.log('User Organization:', req.user.organization)
    console.log('Selected Organization:', organization)
    
    const myOpenTickets = await Ticket.find(myOpenTicketsQuery)
      .populate('creator', 'name email')
      .populate('assignee', 'name email')
      .populate('organization', 'name')
      .sort({ createdAt: -1 })
      .limit(10)
    
    console.log('My Open Tickets Found:', myOpenTickets.length)
    if (myOpenTickets.length > 0) {
      console.log('Sample ticket:', {
        id: myOpenTickets[0].ticketId,
        status: myOpenTickets[0].status,
        org: myOpenTickets[0].organization?._id || myOpenTickets[0].organization
      })
    } else {
      // Check if there are any open tickets at all (without org filter)
      const allOpenTickets = await Ticket.find({ status: { $in: ['open', 'in-progress'] } }).limit(3)
      console.log('Total open/in-progress tickets in DB (no filters):', allOpenTickets.length)
      if (allOpenTickets.length > 0) {
        console.log('Sample open ticket:', {
          id: allOpenTickets[0].ticketId,
          status: allOpenTickets[0].status,
          org: allOpenTickets[0].organization
        })
        // Check if organization matches
        if (req.user.organization) {
          const orgMatch = allOpenTickets[0].organization?.toString() === req.user.organization.toString()
          console.log('Organization matches user org:', orgMatch)
        }
      }
    }
    console.log('=== End Debug ===')

    res.json({
      totalTickets,
      openTickets,
      pendingTickets,
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

export default router

