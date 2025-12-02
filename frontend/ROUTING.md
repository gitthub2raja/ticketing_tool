# Routing Documentation

## Overview

The application uses **React Router v6** for client-side routing. All routes are defined in `App.jsx`.

## Route Structure

### Public Routes

Routes accessible without authentication:

```jsx
/login              # User login page
/mfa-login          # Multi-factor authentication
/sso/azure          # Azure AD SSO
/sso/google          # Google Workspace SSO
```

### Protected Routes

Routes requiring authentication:

```jsx
/dashboard          # Main dashboard
/tickets            # Ticket list
/tickets/search      # Ticket search
/tickets/new         # Create new ticket
/tickets/:id         # Ticket detail view
/profile            # User profile
/settings           # User settings
/reports            # Reports (admin/agent only)
/mfa-setup          # MFA setup
```

### Admin Routes

Routes requiring admin role:

```jsx
/admin/organizations        # Organization management
/admin/users                # User management
/admin/categories           # Category management
/admin/roles                # Role management
/admin/sla                  # SLA policies
/admin/departments          # Department management
/admin/email                # Email settings
/admin/email-templates      # Email templates
/admin/email-automation     # Email automation
/admin/sso                  # SSO configuration
/admin/logo                 # Logo management
/admin/tickets/import       # Ticket import
/admin/analytics            # Analytics dashboard
/admin/api-keys             # API key management
/admin/faq                  # FAQ management
/admin/chat-history          # Chat history
/admin/teams-integration    # Teams integration
/admin/backup-restore       # Backup & restore
```

### Department Head Routes

Routes for department heads:

```jsx
/department-head/dashboard  # Department dashboard
```

## Route Protection

### ProtectedRoute Component

All protected routes are wrapped with `ProtectedRoute`:

```jsx
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
```

### Protection Levels

1. **Public**: No protection (login, SSO pages)
2. **Protected**: Requires authentication
3. **Admin**: Requires authentication + admin role

### ProtectedRoute Logic

```jsx
export const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, loading } = useAuth()

  // Show loading while checking auth
  if (loading) return <LoadingScreen />

  // Redirect to login if not authenticated
  if (!user) return <Navigate to="/login" replace />

  // Redirect to dashboard if admin required but user isn't admin
  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  // All checks passed, render component
  return children
}
```

## Navigation

### Programmatic Navigation

```jsx
import { useNavigate } from 'react-router-dom'

function MyComponent() {
  const navigate = useNavigate()
  
  const handleClick = () => {
    navigate('/tickets/new')
  }
  
  // Navigate with state
  navigate('/tickets/123', { state: { from: 'dashboard' } })
  
  // Navigate with query params
  navigate('/tickets?status=open&priority=high')
  
  // Navigate back
  navigate(-1)
}
```

### Link Navigation

```jsx
import { Link, NavLink } from 'react-router-dom'

// Basic link
<Link to="/tickets">Tickets</Link>

// Active link (NavLink)
<NavLink to="/dashboard" className={({ isActive }) => 
  isActive ? 'active' : ''
}>
  Dashboard
</NavLink>
```

### Query Parameters

```jsx
import { useSearchParams } from 'react-router-dom'

function TicketList() {
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Get query param
  const status = searchParams.get('status')
  
  // Set query param
  setSearchParams({ status: 'open' })
  
  // Update query param
  setSearchParams(prev => {
    prev.set('status', 'open')
    return prev
  })
}
```

### Route Parameters

```jsx
import { useParams } from 'react-router-dom'

function TicketDetail() {
  const { id } = useParams() // Get :id from route
  // Use id to fetch ticket data
}
```

## Route Configuration

### Route Definition Pattern

```jsx
<Route
  path="/path/:param"
  element={
    <ProtectedRoute requireAdmin={false}>
      <Component />
    </ProtectedRoute>
  }
/>
```

### Default Route

```jsx
// Redirect root to dashboard
<Route path="/" element={<Navigate to="/dashboard" replace />} />

// Catch-all route (404)
<Route path="*" element={<Navigate to="/dashboard" replace />} />
```

## Route Guards

### Authentication Guard

Automatically handled by `ProtectedRoute`:
- Checks for valid token
- Validates user session
- Redirects to login if not authenticated

### Role-Based Guard

Admin routes use `requireAdmin` prop:
- Checks user role
- Redirects non-admins to dashboard
- Only admins can access

### Permission-Based Guard

Can be extended for fine-grained permissions:
```jsx
<ProtectedRoute requirePermission="manage_users">
  <UsersPage />
</ProtectedRoute>
```

## Dynamic Routes

### Route Parameters

```jsx
// Route definition
<Route path="/tickets/:id" element={<TicketDetail />} />

// Access in component
const { id } = useParams()
```

### Optional Parameters

```jsx
<Route path="/tickets/:id?" element={<TicketList />} />
```

### Multiple Parameters

```jsx
<Route path="/admin/:section/:action" element={<AdminPage />} />
```

## Nested Routes

Currently not used, but can be implemented:

```jsx
<Route path="/admin" element={<AdminLayout />}>
  <Route path="users" element={<Users />} />
  <Route path="roles" element={<Roles />} />
</Route>
```

## Route Transitions

### Loading States

Show loading during route transitions:

```jsx
<Suspense fallback={<Loading />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
  </Routes>
</Suspense>
```

## Best Practices

1. **Consistent Naming**: Use kebab-case for routes
2. **Clear Hierarchy**: Organize routes logically
3. **Protection**: Always protect sensitive routes
4. **404 Handling**: Provide fallback for unknown routes
5. **Query Params**: Use for filters, search, pagination
6. **Route Params**: Use for resource IDs
7. **State Passing**: Use state for temporary data, not sensitive info

## Route Examples

### Ticket Filtering with Query Params

```jsx
// Navigate with filters
navigate(`/tickets?status=${status}&priority=${priority}`)

// Read filters in component
const [searchParams] = useSearchParams()
const status = searchParams.get('status')
const priority = searchParams.get('priority')
```

### Passing State Between Routes

```jsx
// Navigate with state
navigate('/tickets/new', { 
  state: { 
    category: 'technical',
    department: 'IT'
  } 
})

// Access state in destination
const location = useLocation()
const { category, department } = location.state || {}
```

## Security Considerations

1. **Client-Side Only**: Route protection is client-side
2. **Backend Validation**: Always validate on backend
3. **Token Expiry**: Handle token expiration gracefully
4. **Redirect Loops**: Avoid infinite redirects
5. **Sensitive Data**: Don't pass sensitive data in URLs

## Future Enhancements

- [ ] Add route-based code splitting
- [ ] Implement route transitions/animations
- [ ] Add breadcrumb navigation
- [ ] Implement route-based analytics
- [ ] Add route preloading
- [ ] Implement nested routes for better organization

