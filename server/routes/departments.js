import express from 'express'
import Department from '../models/Department.js'
import User from '../models/User.js'
import { protect, admin } from '../middleware/auth.js'

const router = express.Router()

// @route   GET /api/departments
// @desc    Get all departments
// @access  Private (Admin, Department Head)
router.get('/', protect, async (req, res) => {
  try {
    let query = {}
    
    // Department heads can only see their own department
    if (req.user.role === 'department-head') {
      const user = await User.findById(req.user._id).populate('department')
      if (user.department) {
        query._id = user.department._id
      } else {
        return res.json([])
      }
    }
    
    // Filter by organization if not admin
    if (req.user.role !== 'admin' && req.user.organization) {
      query.organization = req.user.organization
    }

    const departments = await Department.find(query)
      .populate('departmentHead', 'name email')
      .populate('organization', 'name')
      .sort({ name: 1 })

    res.json(departments)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   GET /api/departments/:id
// @desc    Get department by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('departmentHead', 'name email')
      .populate('organization', 'name')

    if (!department) {
      return res.status(404).json({ message: 'Department not found' })
    }

    // Check access
    if (req.user.role !== 'admin' && req.user.role !== 'department-head') {
      return res.status(403).json({ message: 'Access denied' })
    }

    if (req.user.role === 'department-head') {
      const user = await User.findById(req.user._id)
      if (user.department?.toString() !== department._id.toString()) {
        return res.status(403).json({ message: 'Access denied' })
      }
    }

    res.json(department)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/departments
// @desc    Create department
// @access  Private (Admin and regular users can create departments for their organization)
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, departmentHead, organization } = req.body

    // Check if department already exists
    const existing = await Department.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      organization: organization || req.user.organization,
    })

    if (existing) {
      return res.status(400).json({ message: 'Department with this name already exists' })
    }

    // Regular users can only create departments for their own organization
    const targetOrganization = organization || req.user.organization
    if (req.user.role !== 'admin' && targetOrganization !== req.user.organization?.toString()) {
      return res.status(403).json({ message: 'You can only create departments for your own organization' })
    }

    const department = await Department.create({
      name,
      description,
      departmentHead: departmentHead || null,
      organization: targetOrganization,
    })

    // Update user's department if departmentHead is assigned
    if (departmentHead) {
      await User.findByIdAndUpdate(departmentHead, {
        department: department._id,
        role: 'department-head',
      })
    }

    const populated = await Department.findById(department._id)
      .populate('departmentHead', 'name email')
      .populate('organization', 'name')

    res.status(201).json(populated)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   PUT /api/departments/:id
// @desc    Update department
// @access  Private (Admin only)
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { name, description, departmentHead, isActive } = req.body
    const department = await Department.findById(req.params.id)

    if (!department) {
      return res.status(404).json({ message: 'Department not found' })
    }

    if (name) department.name = name
    if (description !== undefined) department.description = description
    if (isActive !== undefined) department.isActive = isActive

    // Handle department head assignment
    if (departmentHead !== undefined) {
      // Remove old department head's department assignment
      if (department.departmentHead) {
        const oldHead = await User.findById(department.departmentHead)
        if (oldHead && oldHead.department?.toString() === department._id.toString()) {
          oldHead.department = null
          if (oldHead.role === 'department-head') {
            oldHead.role = 'user'
          }
          await oldHead.save()
        }
      }

      // Assign new department head
      if (departmentHead) {
        department.departmentHead = departmentHead
        const newHead = await User.findById(departmentHead)
        if (newHead) {
          newHead.department = department._id
          newHead.role = 'department-head'
          await newHead.save()
        }
      } else {
        department.departmentHead = null
      }
    }

    await department.save()

    const populated = await Department.findById(department._id)
      .populate('departmentHead', 'name email')
      .populate('organization', 'name')

    res.json(populated)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   DELETE /api/departments/:id
// @desc    Delete department
// @access  Private (Admin only)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const department = await Department.findById(req.params.id)

    if (!department) {
      return res.status(404).json({ message: 'Department not found' })
    }

    // Remove department from users
    await User.updateMany(
      { department: department._id },
      { $unset: { department: 1 }, role: 'user' }
    )

    await Department.findByIdAndDelete(req.params.id)

    res.json({ message: 'Department deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router

