/**
 * Reporting & Analytics Routes
 * Admin Only - Provides comprehensive reporting and analytics
 */

import express from 'express'
import Ticket from '../models/Ticket.js'
import User from '../models/User.js'
import Department from '../models/Department.js'
import Organization from '../models/Organization.js'
import { protect, admin } from '../middleware/auth.js'
import { checkSLAStatus } from '../config/sla.js'

const router = express.Router()

// All routes require admin access
router.use(protect, admin)

/**
 * @route   GET /api/reports/dashboard
 * @desc    Get dashboard statistics for reports
 * @access  Private/Admin
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { period = 'month', organization } = req.query
    
    // Date range calculation
    const now = new Date()
    let startDate = new Date()
    
    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1)
        break
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        startDate.setMonth(now.getMonth() - 1)
    }

    const query = {
      createdAt: { $gte: startDate },
    }

    if (organization) {
      query.organization = organization
    }

    // Total tickets
    const totalTickets = await Ticket.countDocuments(query)

    // Status-wise breakdown
    const statusBreakdown = await Ticket.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ])

    // Priority-wise breakdown
    const priorityBreakdown = await Ticket.aggregate([
      { $match: query },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ])

    // Department-wise breakdown
    const departmentBreakdown = await Ticket.aggregate([
      { $match: query },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
      { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
      { $project: { departmentName: '$dept.name', count: 1 } },
    ])

    // SLA compliance
    const allTickets = await Ticket.find(query)
      .populate('department', 'name')
      .populate('assignee', 'name email')

    let slaCompliant = 0
    let slaBreached = 0
    let slaWarnings = 0

    allTickets.forEach(ticket => {
      if (ticket.dueDate) {
        const slaStatus = checkSLAStatus(ticket.createdAt, ticket.dueDate, ticket.status)
        if (slaStatus.isOverdue) {
          slaBreached++
        } else if (slaStatus.timeRemaining) {
          const timeElapsed = new Date().getTime() - ticket.createdAt.getTime()
          const totalTime = ticket.dueDate.getTime() - ticket.createdAt.getTime()
          const percentageElapsed = (timeElapsed / totalTime) * 100
          if (percentageElapsed >= 80) {
            slaWarnings++
          } else {
            slaCompliant++
          }
        }
      }
    })

    // Technician performance
    const technicianStats = await Ticket.aggregate([
      { $match: { ...query, assignee: { $ne: null } } },
      {
        $group: {
          _id: '$assignee',
          totalAssigned: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
        },
      },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          technicianName: '$user.name',
          technicianEmail: '$user.email',
          totalAssigned: 1,
          resolved: 1,
          closed: 1,
          resolutionRate: { $multiply: [{ $divide: ['$resolved', '$totalAssigned'] }, 100] },
        },
      },
      { $sort: { totalAssigned: -1 } },
      { $limit: 10 },
    ])

    res.json({
      period,
      startDate,
      endDate: now,
      totalTickets,
      statusBreakdown: statusBreakdown.reduce((acc, item) => {
        acc[item._id] = item.count
        return acc
      }, {}),
      priorityBreakdown: priorityBreakdown.reduce((acc, item) => {
        acc[item._id] = item.count
        return acc
      }, {}),
      departmentBreakdown,
      slaMetrics: {
        compliant: slaCompliant,
        breached: slaBreached,
        warnings: slaWarnings,
        complianceRate: totalTickets > 0 ? ((slaCompliant / totalTickets) * 100).toFixed(2) : 0,
      },
      technicianPerformance: technicianStats,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   GET /api/reports/status-wise
 * @desc    Get status-wise ticket count
 * @access  Private/Admin
 */
router.get('/status-wise', async (req, res) => {
  try {
    const { period = 'month', organization } = req.query
    
    const now = new Date()
    let startDate = new Date()
    
    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1)
        break
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1)
        break
    }

    const query = {
      createdAt: { $gte: startDate },
    }

    if (organization) {
      query.organization = organization
    }

    const statusData = await Ticket.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])

    res.json({
      period,
      data: statusData.map(item => ({
        status: item._id,
        count: item.count,
      })),
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   GET /api/reports/department-wise
 * @desc    Get department-wise ticket count
 * @access  Private/Admin
 */
router.get('/department-wise', async (req, res) => {
  try {
    const { period = 'month', organization } = req.query
    
    const now = new Date()
    let startDate = new Date()
    
    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1)
        break
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1)
        break
    }

    const query = {
      createdAt: { $gte: startDate },
    }

    if (organization) {
      query.organization = organization
    }

    const departmentData = await Ticket.aggregate([
      { $match: query },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
      { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          departmentId: '$_id',
          departmentName: { $ifNull: ['$dept.name', 'Unassigned'] },
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ])

    res.json({
      period,
      data: departmentData,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   GET /api/reports/technician-performance
 * @desc    Get technician performance metrics
 * @access  Private/Admin
 */
router.get('/technician-performance', async (req, res) => {
  try {
    const { period = 'month', organization } = req.query
    
    const now = new Date()
    let startDate = new Date()
    
    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1)
        break
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1)
        break
    }

    const query = {
      createdAt: { $gte: startDate },
      assignee: { $ne: null },
    }

    if (organization) {
      query.organization = organization
    }

    const performance = await Ticket.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$assignee',
          totalAssigned: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
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
          technicianId: '$_id',
          technicianName: '$user.name',
          technicianEmail: '$user.email',
          totalAssigned: 1,
          open: 1,
          inProgress: 1,
          resolved: 1,
          closed: 1,
          resolutionRate: {
            $multiply: [
              { $divide: [{ $add: ['$resolved', '$closed'] }, '$totalAssigned'] },
              100,
            ],
          },
          avgResolutionTimeHours: {
            $divide: ['$avgResolutionTime', 1000 * 60 * 60],
          },
        },
      },
      { $sort: { totalAssigned: -1 } },
    ])

    res.json({
      period,
      data: performance,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   GET /api/reports/sla-compliance
 * @desc    Get SLA compliance metrics
 * @access  Private/Admin
 */
router.get('/sla-compliance', async (req, res) => {
  try {
    const { period = 'month', organization } = req.query
    
    const now = new Date()
    let startDate = new Date()
    
    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1)
        break
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1)
        break
    }

    const query = {
      createdAt: { $gte: startDate },
    }

    if (organization) {
      query.organization = organization
    }

    const tickets = await Ticket.find(query)
      .populate('department', 'name')
      .populate('assignee', 'name email')

    let responseCompliant = 0
    let responseBreached = 0
    let resolutionCompliant = 0
    let resolutionBreached = 0
    let totalWithResponseSLA = 0
    let totalWithResolutionSLA = 0

    tickets.forEach(ticket => {
      // Response SLA
      if (ticket.responseDueDate) {
        totalWithResponseSLA++
        const responseStatus = checkSLAStatus(
          ticket.createdAt,
          ticket.responseDueDate,
          ticket.status
        )
        if (ticket.status === 'resolved' || ticket.status === 'closed') {
          // Check if resolved before response deadline
          if (ticket.updatedAt <= ticket.responseDueDate) {
            responseCompliant++
          } else {
            responseBreached++
          }
        } else if (responseStatus.isOverdue) {
          responseBreached++
        } else {
          responseCompliant++
        }
      }

      // Resolution SLA
      if (ticket.dueDate) {
        totalWithResolutionSLA++
        const resolutionStatus = checkSLAStatus(
          ticket.createdAt,
          ticket.dueDate,
          ticket.status
        )
        if (ticket.status === 'resolved' || ticket.status === 'closed') {
          // Check if resolved before deadline
          if (ticket.updatedAt <= ticket.dueDate) {
            resolutionCompliant++
          } else {
            resolutionBreached++
          }
        } else if (resolutionStatus.isOverdue) {
          resolutionBreached++
        } else {
          resolutionCompliant++
        }
      }
    })

    res.json({
      period,
      responseSLA: {
        total: totalWithResponseSLA,
        compliant: responseCompliant,
        breached: responseBreached,
        complianceRate: totalWithResponseSLA > 0
          ? ((responseCompliant / totalWithResponseSLA) * 100).toFixed(2)
          : 0,
      },
      resolutionSLA: {
        total: totalWithResolutionSLA,
        compliant: resolutionCompliant,
        breached: resolutionBreached,
        complianceRate: totalWithResolutionSLA > 0
          ? ((resolutionCompliant / totalWithResolutionSLA) * 100).toFixed(2)
          : 0,
      },
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   GET /api/reports/trends
 * @desc    Get ticket trends over time
 * @access  Private/Admin
 */
router.get('/trends', async (req, res) => {
  try {
    const { period = 'month', organization, groupBy = 'day' } = req.query
    
    const now = new Date()
    let startDate = new Date()
    
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        startDate.setMonth(now.getMonth() - 1)
    }

    const query = {
      createdAt: { $gte: startDate },
    }

    if (organization) {
      query.organization = organization
    }

    let dateFormat = {}
    if (groupBy === 'day') {
      dateFormat = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' },
      }
    } else if (groupBy === 'week') {
      dateFormat = {
        year: { $year: '$createdAt' },
        week: { $week: '$createdAt' },
      }
    } else if (groupBy === 'month') {
      dateFormat = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
      }
    }

    const trends = await Ticket.aggregate([
      { $match: query },
      {
        $group: {
          _id: dateFormat,
          count: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
    ])

    res.json({
      period,
      groupBy,
      data: trends,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router

