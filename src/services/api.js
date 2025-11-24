// API service for all backend calls
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('token')
}

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
  const token = getAuthToken()
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      // Handle 401 Unauthorized - token expired or invalid
      if (response.status === 401) {
        // Clear invalid token
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        // Redirect to login if not already there
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        const error = await response.json().catch(() => ({ message: 'Session expired. Please login again.' }))
        throw new Error(error.message || 'Session expired. Please login again.')
      }
      
      const error = await response.json().catch(() => ({ message: 'An error occurred' }))
      throw new Error(error.message || 'Request failed')
    }

    return response.json()
  } catch (error) {
    // Handle network errors (fetch failures)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to server. Please check your connection and try again.')
    }
    // Re-throw other errors
    throw error
  }
}

// Auth API
export const authAPI = {
  login: async (email, password) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },
  register: async (userData) => {
    return apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  },
  getMe: async () => {
    return apiCall('/auth/me')
  },
}

// Tickets API
export const ticketsAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.status) params.append('status', filters.status)
    if (filters.priority) params.append('priority', filters.priority)
    if (filters.search) params.append('search', filters.search)
    if (filters.organization) params.append('organization', filters.organization)
    
    const query = params.toString()
    return apiCall(`/tickets${query ? `?${query}` : ''}`)
  },
  getById: async (id) => {
    return apiCall(`/tickets/${id}`)
  },
  create: async (ticketData) => {
    return apiCall('/tickets', {
      method: 'POST',
      body: JSON.stringify(ticketData),
    })
  },
  createWithFiles: async (formData) => {
    const token = localStorage.getItem('token')
    const response = await fetch(`${API_BASE_URL}/tickets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to create ticket')
    }
    
    return response.json()
  },
  update: async (id, ticketData) => {
    return apiCall(`/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(ticketData),
    })
  },
  addComment: async (id, comment) => {
    return apiCall(`/tickets/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify(comment),
    })
  },
  getDashboardStats: async (organization = null) => {
    const params = new URLSearchParams()
    if (organization) params.append('organization', organization)
    const query = params.toString()
    return apiCall(`/tickets/stats/dashboard${query ? `?${query}` : ''}`)
  },
}

// Users API
export const usersAPI = {
  getAll: async (organization = null) => {
    const params = new URLSearchParams()
    if (organization) params.append('organization', organization)
    const query = params.toString()
    return apiCall(`/users${query ? `?${query}` : ''}`)
  },
  getMentions: async () => {
    return apiCall('/users/mentions')
  },
  getById: async (id) => {
    return apiCall(`/users/${id}`)
  },
  create: async (userData) => {
    return apiCall('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  },
  update: async (id, userData) => {
    return apiCall(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    })
  },
  delete: async (id) => {
    return apiCall(`/users/${id}`, {
      method: 'DELETE',
    })
  },
}

// Admin API
export const adminAPI = {
  // SSO Config
  getSSOConfig: async () => {
    return apiCall('/admin/sso')
  },
  updateSSOConfig: async (config) => {
    return apiCall('/admin/sso', {
      method: 'POST',
      body: JSON.stringify(config),
    })
  },
  
  // Email Settings
  getEmailSettings: async () => {
    return apiCall('/admin/email')
  },
  updateEmailSettings: async (settings) => {
    return apiCall('/admin/email', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
  },
  testSMTP: async (to, settings) => {
    return apiCall('/email/test-smtp', {
      method: 'POST',
      body: JSON.stringify({ to, settings }),
    })
  },
  testIMAP: async (settings) => {
    return apiCall('/email/test-imap', {
      method: 'POST',
      body: JSON.stringify({ settings }),
    })
  },
  sendTestEmail: async (to, subject, html) => {
    return apiCall('/email/send', {
      method: 'POST',
      body: JSON.stringify({ to, subject, html }),
    })
  },
  
  // Logo
  getLogo: async () => {
    return apiCall('/admin/logo')
  },
  updateLogo: async (logo, filename) => {
    return apiCall('/admin/logo', {
      method: 'POST',
      body: JSON.stringify({ logo, filename }),
    })
  },
  
  // Roles
  getRoles: async () => {
    return apiCall('/admin/roles')
  },
  createRole: async (roleData) => {
    return apiCall('/admin/roles', {
      method: 'POST',
      body: JSON.stringify(roleData),
    })
  },
  updateRole: async (id, roleData) => {
    return apiCall(`/admin/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(roleData),
    })
  },
  deleteRole: async (id) => {
    return apiCall(`/admin/roles/${id}`, {
      method: 'DELETE',
    })
  },
}

// Organizations API
export const organizationsAPI = {
  getAll: async () => {
    return apiCall('/organizations')
  },
  getById: async (id) => {
    return apiCall(`/organizations/${id}`)
  },
  create: async (orgData) => {
    return apiCall('/organizations', {
      method: 'POST',
      body: JSON.stringify(orgData),
    })
  },
  update: async (id, orgData) => {
    return apiCall(`/organizations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(orgData),
    })
  },
  delete: async (id) => {
    return apiCall(`/organizations/${id}`, {
      method: 'DELETE',
    })
  },
}

// Categories API
export const categoriesAPI = {
  getAll: async () => {
    return apiCall('/categories')
  },
  getAllAdmin: async (organization = null) => {
    const params = new URLSearchParams()
    if (organization) params.append('organization', organization)
    const query = params.toString()
    return apiCall(`/categories/all${query ? `?${query}` : ''}`)
  },
  getById: async (id) => {
    return apiCall(`/categories/${id}`)
  },
  create: async (categoryData) => {
    return apiCall('/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    })
  },
  update: async (id, categoryData) => {
    return apiCall(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    })
  },
  delete: async (id) => {
    return apiCall(`/categories/${id}`, {
      method: 'DELETE',
    })
  },
}

// MFA API
export const mfaAPI = {
  getSetup: async () => {
    return apiCall('/mfa/setup')
  },
  verify: async (token) => {
    return apiCall('/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
  },
  verifyLogin: async (tempToken, code) => {
    return apiCall('/mfa/verify-login', {
      method: 'POST',
      body: JSON.stringify({ tempToken, code }),
    })
  },
  disable: async () => {
    return apiCall('/mfa/disable', {
      method: 'POST',
    })
  },
}

