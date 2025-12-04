/**
 * API Key Management Routes
 * Admin Only - Manage API keys for external integrations
 */

import express from 'express'
import ApiKey from '../models/ApiKey.js'
import { protect, admin } from '../middleware/auth.js'

const router = express.Router()

// All routes require admin access
router.use(protect, admin)

/**
 * @route   GET /api/api-keys
 * @desc    Get all API keys
 * @access  Private/Admin
 */
router.get('/', async (req, res) => {
  try {
    const { organization } = req.query
    const query = {}

    if (organization) {
      query.organization = organization
    }

    const apiKeys = await ApiKey.find(query)
      .populate('organization', 'name')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })

    // Don't send the actual key, only metadata
    const safeKeys = apiKeys.map(key => ({
      _id: key._id,
      name: key.name,
      keyPrefix: key.key.substring(0, 10) + '...',
      organization: key.organization,
      permissions: key.permissions,
      isActive: key.isActive,
      lastUsed: key.lastUsed,
      expiresAt: key.expiresAt,
      createdBy: key.createdBy,
      usageCount: key.usageCount,
      rateLimit: key.rateLimit,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
    }))

    res.json(safeKeys)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/api-keys
 * @desc    Create new API key
 * @access  Private/Admin
 */
router.post('/', async (req, res) => {
  try {
    const { name, organization, permissions, expiresAt, rateLimit } = req.body

    if (!name) {
      return res.status(400).json({ message: 'API key name is required' })
    }

    // Generate key
    const key = ApiKey.generateKey()
    const keyHash = ApiKey.hashKey(key)

    const apiKeyData = {
      name,
      key,
      keyHash,
      organization: organization || null,
      permissions: permissions || ['read'],
      createdBy: req.user._id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      rateLimit: rateLimit || 1000,
    }

    const apiKey = await ApiKey.create(apiKeyData)

    // Return the key only once (for display to user)
    res.status(201).json({
      _id: apiKey._id,
      name: apiKey.name,
      key, // Only returned on creation
      organization: apiKey.organization,
      permissions: apiKey.permissions,
      expiresAt: apiKey.expiresAt,
      rateLimit: apiKey.rateLimit,
      createdAt: apiKey.createdAt,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   PUT /api/api-keys/:id
 * @desc    Update API key
 * @access  Private/Admin
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, permissions, isActive, expiresAt, rateLimit } = req.body

    const apiKey = await ApiKey.findById(req.params.id)

    if (!apiKey) {
      return res.status(404).json({ message: 'API key not found' })
    }

    if (name) apiKey.name = name
    if (permissions) apiKey.permissions = permissions
    if (isActive !== undefined) apiKey.isActive = isActive
    if (expiresAt !== undefined) apiKey.expiresAt = expiresAt ? new Date(expiresAt) : null
    if (rateLimit !== undefined) apiKey.rateLimit = rateLimit

    await apiKey.save()

    res.json({
      _id: apiKey._id,
      name: apiKey.name,
      keyPrefix: apiKey.key.substring(0, 10) + '...',
      organization: apiKey.organization,
      permissions: apiKey.permissions,
      isActive: apiKey.isActive,
      expiresAt: apiKey.expiresAt,
      rateLimit: apiKey.rateLimit,
      updatedAt: apiKey.updatedAt,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   DELETE /api/api-keys/:id
 * @desc    Delete API key
 * @access  Private/Admin
 */
router.delete('/:id', async (req, res) => {
  try {
    const apiKey = await ApiKey.findById(req.params.id)

    if (!apiKey) {
      return res.status(404).json({ message: 'API key not found' })
    }

    await apiKey.deleteOne()

    res.json({ message: 'API key deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/api-keys/:id/revoke
 * @desc    Revoke API key (deactivate)
 * @access  Private/Admin
 */
router.post('/:id/revoke', async (req, res) => {
  try {
    const apiKey = await ApiKey.findById(req.params.id)

    if (!apiKey) {
      return res.status(404).json({ message: 'API key not found' })
    }

    apiKey.isActive = false
    await apiKey.save()

    res.json({ message: 'API key revoked successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @route   POST /api/api-keys/:id/activate
 * @desc    Activate API key
 * @access  Private/Admin
 */
router.post('/:id/activate', async (req, res) => {
  try {
    const apiKey = await ApiKey.findById(req.params.id)

    if (!apiKey) {
      return res.status(404).json({ message: 'API key not found' })
    }

    apiKey.isActive = true
    await apiKey.save()

    res.json({ message: 'API key activated successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

export default router

