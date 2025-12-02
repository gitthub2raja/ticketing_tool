# API Integration Documentation

## Overview

All backend communication is handled through a centralized API service layer located in `services/api.js`. This provides a clean abstraction between components and the backend.

## API Service Structure

### Base Configuration

```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
```

- Configurable via environment variable `VITE_API_URL`
- Defaults to `/api` (relative URL for same-origin requests)

### Authentication

All API requests automatically include the authentication token:

```javascript
const getAuthToken = () => {
  return localStorage.getItem('token')
}

// Token added to headers
headers.Authorization = `Bearer ${token}`
```

## API Helper Function

### apiCall()

Central function for all API requests:

```javascript
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
      // Handle 401 Unauthorized
      if (response.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        throw new Error('Session expired')
      }
      
      const error = await response.json()
      throw new Error(error.message || 'Request failed')
    }

    return response.json()
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to server')
    }
    throw error
  }
}
```

**Features:**
- Automatic token injection
- Error handling
- 401 auto-logout
- Network error detection

## API Services

### Auth API (`authAPI`)

```javascript
authAPI.login(email, password)
authAPI.register(userData)
authAPI.getMe()
```

**Login Response:**
```javascript
{
  token: "jwt_token",
  user: { ... },
  mfaRequired: false,
  tempToken: "..." // if MFA required
}
```

### Tickets API (`ticketsAPI`)

```javascript
// Get all tickets with filters
ticketsAPI.getAll(filters)
// filters: { status, priority, search, organization }

// Get single ticket
ticketsAPI.getById(id)

// Create ticket
ticketsAPI.create(ticketData)

// Create ticket with files
ticketsAPI.createWithFiles(formData)

// Update ticket
ticketsAPI.update(id, ticketData)

// Add comment
ticketsAPI.addComment(id, comment)

// Approve ticket
ticketsAPI.approveTicket(id)

// Reject ticket
ticketsAPI.rejectTicket(id, rejectionReason)

// Get dashboard stats
ticketsAPI.getDashboardStats(organization)

// Import tickets
ticketsAPI.importTickets(ticketsData)
```

### Users API (`usersAPI`)

```javascript
usersAPI.getAll(organization)
usersAPI.getMentions()
usersAPI.getById(id)
usersAPI.create(userData)
usersAPI.update(id, userData)
usersAPI.delete(id)
```

### Admin API (`adminAPI`)

Comprehensive admin operations:

```javascript
// SSO Configuration
adminAPI.getSSOConfig()
adminAPI.updateSSOConfig(config)

// Email Settings
adminAPI.getEmailSettings()
adminAPI.updateEmailSettings(settings)
adminAPI.testSMTP(to, settings)
adminAPI.testIMAP(settings)
adminAPI.sendTestEmail(to, subject, html)

// Logo Management
adminAPI.getLogo()
adminAPI.updateLogo(logo, filename, showOnLogin, loginTitle)

// Roles
adminAPI.getRoles()
adminAPI.createRole(roleData)
adminAPI.updateRole(id, roleData)
adminAPI.deleteRole(id)

// SLA Policies
adminAPI.getSLAPolicies(organization)
adminAPI.createSLAPolicy(policyData)
adminAPI.updateSLAPolicy(id, policyData)
adminAPI.deleteSLAPolicy(id)

// Email Templates
adminAPI.getEmailTemplates()
adminAPI.getEmailTemplate(id)
adminAPI.createEmailTemplate(templateData)
adminAPI.updateEmailTemplate(id, templateData)
adminAPI.deleteEmailTemplate(id)
adminAPI.previewEmailTemplate(id)

// Backup & Restore
adminAPI.createBackup()
adminAPI.listBackups()
adminAPI.downloadBackup(backupName)
adminAPI.deleteBackup(backupName)
adminAPI.restoreBackup(backupName, clearExisting)
adminAPI.uploadBackup(file, clearExisting)
```

### Other APIs

- `organizationsAPI`: Organization management
- `categoriesAPI`: Category management
- `departmentsAPI`: Department management
- `mfaAPI`: Multi-factor authentication
- `reportsAPI`: Reports and analytics
- `apiKeysAPI`: API key management
- `emailTemplatesAPI`: Email template operations
- `emailAutomationAPI`: Email automation rules
- `chatbotAPI`: Chatbot integration
- `faqAPI`: FAQ management
- `teamsAPI`: Microsoft Teams integration

## Usage Patterns

### Basic GET Request

```javascript
import { ticketsAPI } from '../services/api'

const loadTickets = async () => {
  try {
    const tickets = await ticketsAPI.getAll()
    setTickets(tickets)
  } catch (error) {
    toast.error(error.message)
  }
}
```

### POST Request with Data

```javascript
const createTicket = async (ticketData) => {
  try {
    const newTicket = await ticketsAPI.create({
      title: ticketData.title,
      description: ticketData.description,
      priority: ticketData.priority,
      category: ticketData.category
    })
    toast.success('Ticket created successfully')
    navigate(`/tickets/${newTicket.id}`)
  } catch (error) {
    toast.error(error.message)
  }
}
```

### File Upload

```javascript
const createTicketWithFiles = async (ticketData, files) => {
  const formData = new FormData()
  formData.append('title', ticketData.title)
  formData.append('description', ticketData.description)
  
  files.forEach(file => {
    formData.append('attachments', file)
  })

  try {
    const ticket = await ticketsAPI.createWithFiles(formData)
    toast.success('Ticket created with attachments')
  } catch (error) {
    toast.error(error.message)
  }
}
```

### Request with Filters

```javascript
const loadFilteredTickets = async () => {
  const filters = {
    status: 'open',
    priority: 'high',
    search: 'server issue'
  }
  
  const tickets = await ticketsAPI.getAll(filters)
  setTickets(tickets)
}
```

### Error Handling

```javascript
try {
  const data = await api.call()
} catch (error) {
  // Network error
  if (error.message.includes('Network error')) {
    toast.error('Cannot connect to server')
  }
  // Authentication error (handled automatically)
  // Other errors
  else {
    toast.error(error.message)
  }
}
```

## Error Handling

### Automatic Error Handling

1. **401 Unauthorized**: Automatically logs out and redirects to login
2. **Network Errors**: Shows user-friendly message
3. **Other Errors**: Displays error message from backend

### Custom Error Handling

```javascript
try {
  await api.call()
} catch (error) {
  if (error.message.includes('Validation')) {
    setFormErrors(parseValidationErrors(error))
  } else {
    toast.error(error.message)
  }
}
```

## Request Patterns

### Loading States

```javascript
const [loading, setLoading] = useState(false)

const loadData = async () => {
  setLoading(true)
  try {
    const data = await api.getData()
    setData(data)
  } finally {
    setLoading(false)
  }
}
```

### Optimistic Updates

```javascript
const handleDelete = async (id) => {
  // Update UI immediately
  setItems(items.filter(item => item.id !== id))
  
  try {
    await api.delete(id)
  } catch (error) {
    // Rollback on error
    setItems(originalItems)
    toast.error('Delete failed')
  }
}
```

### Retry Logic

```javascript
const fetchWithRetry = async (fn, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === retries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
}
```

## Query Parameters

### Building Query Strings

```javascript
const params = new URLSearchParams()
if (status) params.append('status', status)
if (priority) params.append('priority', priority)
if (search) params.append('search', search)

const query = params.toString()
const url = `/tickets${query ? `?${query}` : ''}`
```

## File Uploads

### FormData Pattern

```javascript
const uploadFile = async (file, metadata) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('metadata', JSON.stringify(metadata))

  const token = localStorage.getItem('token')
  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // Don't set Content-Type - browser sets it with boundary
    },
    body: formData
  })

  return response.json()
}
```

## Best Practices

1. **Always Handle Errors**: Use try-catch blocks
2. **Show Loading States**: Indicate when requests are in progress
3. **User Feedback**: Show success/error messages
4. **Token Management**: Let apiCall handle token automatically
5. **Error Messages**: Display user-friendly error messages
6. **Network Errors**: Handle network failures gracefully
7. **Request Cancellation**: Cancel requests when component unmounts

## Environment Configuration

### Development

```env
VITE_API_URL=http://localhost:5000/api
```

### Production

```env
VITE_API_URL=/api
```

## API Response Formats

### Success Response

```javascript
{
  success: true,
  data: { ... },
  message: "Operation successful"
}
```

### Error Response

```javascript
{
  success: false,
  message: "Error message",
  errors: { field: "Error details" }
}
```

## Future Enhancements

- [ ] Add request interceptors
- [ ] Implement response caching
- [ ] Add request cancellation (AbortController)
- [ ] Implement request queuing
- [ ] Add request/response logging
- [ ] Implement retry with exponential backoff
- [ ] Add request timeout handling

