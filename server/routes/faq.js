/**
 * FAQ Management Routes
 * Admin Only
 */

import express from 'express'
import FAQ from '../models/FAQ.js'
import { protect, admin } from '../middleware/auth.js'

const router = express.Router()

// All routes require admin access
router.use(protect, admin)

/**
 * @route   GET /api/faq
 * @desc    Get all FAQs (public endpoint for chatbot, admin endpoint for management)
 * @access  Public for GET, Private/Admin for POST/PUT/DELETE
 */
router.get('/', async (req, res) => {
  try {
    const { organization, category, search } = req.query
    const query = { isActive: true }

    if (organization) {
      query.$or = [
        { organization },
        { organization: null },
      ]
    }

    if (category) {
      query.category = category
    }

    if (search) {
      query.$text = { $search: search }
    }

    const faqs = await FAQ.find(query)
      .populate('organization', 'name')
      .populate('department', 'name')
      .populate('createdBy', 'name')
      .sort({ priority: -1, viewCount: -1 })

    res.json(faqs)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   GET /api/faq/:id
 * @desc    Get FAQ by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const faq = await FAQ.findById(req.params.id)
      .populate('organization', 'name')
      .populate('department', 'name')

    if (!faq) {
      return res.status(404).json({ message: 'FAQ not found' })
    }

    res.json(faq)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/faq
 * @desc    Create FAQ
 * @access  Private/Admin
 */
router.post('/', admin, async (req, res) => {
  try {
    const { question, answer, keywords, category, organization, department, priority } = req.body

    if (!question || !answer) {
      return res.status(400).json({ message: 'Question and answer are required' })
    }

    const faq = await FAQ.create({
      question,
      answer,
      keywords: keywords || [],
      category: category || 'general',
      organization: organization || null,
      department: department || null,
      priority: priority || 0,
      createdBy: req.user._id,
    })

    res.status(201).json(faq)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   PUT /api/faq/:id
 * @desc    Update FAQ
 * @access  Private/Admin
 */
router.put('/:id', admin, async (req, res) => {
  try {
    const { question, answer, keywords, category, isActive, priority } = req.body

    const faq = await FAQ.findById(req.params.id)

    if (!faq) {
      return res.status(404).json({ message: 'FAQ not found' })
    }

    if (question) faq.question = question
    if (answer) faq.answer = answer
    if (keywords) faq.keywords = keywords
    if (category) faq.category = category
    if (isActive !== undefined) faq.isActive = isActive
    if (priority !== undefined) faq.priority = priority

    await faq.save()

    res.json(faq)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   DELETE /api/faq/:id
 * @desc    Delete FAQ
 * @access  Private/Admin
 */
router.delete('/:id', admin, async (req, res) => {
  try {
    const faq = await FAQ.findById(req.params.id)

    if (!faq) {
      return res.status(404).json({ message: 'FAQ not found' })
    }

    await faq.deleteOne()

    res.json({ message: 'FAQ deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/faq/:id/helpful
 * @desc    Mark FAQ as helpful
 * @access  Public
 */
router.post('/:id/helpful', async (req, res) => {
  try {
    const faq = await FAQ.findById(req.params.id)

    if (!faq) {
      return res.status(404).json({ message: 'FAQ not found' })
    }

    faq.helpfulCount += 1
    await faq.save()

    res.json({ helpfulCount: faq.helpfulCount })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router

