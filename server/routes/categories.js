import express from 'express'
import Category from '../models/Category.js'
import Ticket from '../models/Ticket.js'
import { protect, admin } from '../middleware/auth.js'

const router = express.Router()

// @route   GET /api/categories
// @desc    Get all categories (global + organization-specific)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const query = {
      $or: [
        { organization: null }, // Global categories
        { organization: req.user.organization }, // Organization-specific
      ],
      status: 'active',
    }
    
    const categories = await Category.find(query).sort({ name: 1 })
    res.json(categories)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   GET /api/categories/all
// @desc    Get all categories including inactive (admin only)
// @access  Private/Admin
router.get('/all', protect, admin, async (req, res) => {
  try {
    const { organization } = req.query
    const query = {}
    
    if (organization) {
      query.$or = [
        { organization: null },
        { organization },
      ]
    } else {
      query.$or = [
        { organization: null },
        { organization: req.user.organization },
      ]
    }
    
    const categories = await Category.find(query).sort({ name: 1 })
    res.json(categories)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   GET /api/categories/:id
// @desc    Get single category
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
    if (!category) {
      return res.status(404).json({ message: 'Category not found' })
    }
    res.json(category)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/categories
// @desc    Create new category
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, description, color, organization, status } = req.body

    const categoryExists = await Category.findOne({ name, organization: organization || null })
    if (categoryExists) {
      return res.status(400).json({ message: 'Category with this name already exists' })
    }

    const category = await Category.create({
      name,
      description: description || '',
      color: color || '#00ffff',
      organization: organization || null, // null = global
      status: status || 'active',
    })

    res.status(201).json(category)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   PUT /api/categories/:id
// @desc    Update category
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
    if (!category) {
      return res.status(404).json({ message: 'Category not found' })
    }

    const { name, description, color, status } = req.body

    if (name && name !== category.name) {
      const categoryExists = await Category.findOne({ 
        name, 
        organization: category.organization,
        _id: { $ne: category._id }
      })
      if (categoryExists) {
        return res.status(400).json({ message: 'Category with this name already exists' })
      }
      category.name = name
    }

    if (description !== undefined) category.description = description
    if (color) category.color = color
    if (status) category.status = status

    await category.save()
    res.json(category)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   DELETE /api/categories/:id
// @desc    Delete category
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
    if (!category) {
      return res.status(404).json({ message: 'Category not found' })
    }

    // Check if category is used in any tickets
    const ticketCount = await Ticket.countDocuments({ category: category.name })
    if (ticketCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete category. It is used in ${ticketCount} ticket(s). Please reassign those tickets first.` 
      })
    }

    await category.deleteOne()
    res.json({ message: 'Category deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router

