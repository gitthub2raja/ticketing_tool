# State Management Documentation

## Overview

The application uses **React Context API** for global state management instead of Redux. This approach is simpler and sufficient for the current application complexity.

## Context Providers

### AuthContext (`contexts/AuthContext.jsx`)

Manages user authentication state.

**State:**
- `user`: Current user object (null if not authenticated)
- `loading`: Boolean indicating auth check in progress

**Methods:**
- `login(email, password)`: Authenticate user
- `logout()`: Clear authentication
- `updateUser(userData)`: Update user information

**Usage:**
```jsx
import { useAuth } from '../contexts/AuthContext'

function MyComponent() {
  const { user, login, logout, loading } = useAuth()
  
  if (loading) return <Loading />
  if (!user) return <Login />
  
  return <div>Welcome {user.name}</div>
}
```

**Features:**
- Automatic token validation on app load
- Token stored in localStorage
- MFA support (returns tempToken if MFA required)
- Auto-cleanup on token expiration

**Token Management:**
- Token stored as: `localStorage.getItem('token')`
- User data stored as: `localStorage.getItem('user')`
- Auto-removed on logout or 401 errors

### SSOContext (`contexts/SSOContext.jsx`)

Manages Single Sign-On configuration and state.

**State:**
- SSO configuration
- SSO providers (Azure, Google, SAML)

**Usage:**
```jsx
import { useSSO } from '../contexts/SSOContext'

function SSOComponent() {
  const { ssoConfig, providers } = useSSO()
  // Use SSO configuration
}
```

### LogoContext (`contexts/LogoContext.jsx`)

Manages organization logo display.

**State:**
- `logo`: Logo URL or data

**Methods:**
- Fetches logo from API
- Provides logo to components

**Usage:**
```jsx
import { useLogo } from '../contexts/LogoContext'

function Header() {
  const { logo } = useLogo()
  return <img src={logo} alt="Logo" />
}
```

### ThemeContext (`contexts/ThemeContext.jsx`)

Manages theme preferences (light/dark mode).

**State:**
- `theme`: 'light' | 'dark'
- `isDark`: Boolean

**Methods:**
- `toggleTheme()`: Switch between themes

**Usage:**
```jsx
import { useTheme } from '../contexts/ThemeContext'

function ThemeToggle() {
  const { theme, toggleTheme, isDark } = useTheme()
  return <button onClick={toggleTheme}>Toggle Theme</button>
}
```

**Persistence:**
- Theme preference saved to localStorage
- Respects system preference on first load

## Local State Management

### Component State (`useState`)

For component-specific state:

```jsx
const [tickets, setTickets] = useState([])
const [loading, setLoading] = useState(false)
const [searchTerm, setSearchTerm] = useState('')
```

### Derived State

Computed from other state:

```jsx
const filteredTickets = tickets.filter(ticket => 
  ticket.status === statusFilter
)
```

### Form State

Form data management:

```jsx
const [formData, setFormData] = useState({
  title: '',
  description: '',
  priority: 'medium'
})

const handleChange = (e) => {
  setFormData({
    ...formData,
    [e.target.name]: e.target.value
  })
}
```

## State Patterns

### 1. Loading States

Always track loading state for async operations:

```jsx
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

### 2. Error States

Handle errors gracefully:

```jsx
const [error, setError] = useState(null)

try {
  await api.call()
} catch (err) {
  setError(err.message)
  toast.error(err.message)
}
```

### 3. Optimistic Updates

Update UI immediately, rollback on error:

```jsx
const handleDelete = async (id) => {
  // Optimistic update
  setTickets(tickets.filter(t => t.id !== id))
  
  try {
    await api.delete(id)
  } catch (error) {
    // Rollback
    setTickets(originalTickets)
    toast.error('Delete failed')
  }
}
```

### 4. Debounced State

For search and filtering:

```jsx
const [searchTerm, setSearchTerm] = useState('')

useEffect(() => {
  const timer = setTimeout(() => {
    // Perform search after user stops typing
    performSearch(searchTerm)
  }, 500)
  
  return () => clearTimeout(timer)
}, [searchTerm])
```

## State Flow

### Authentication Flow
```
1. User enters credentials
2. AuthContext.login() called
3. API request to backend
4. Token received and stored
5. User state updated in context
6. Components re-render with user data
```

### Data Fetching Flow
```
1. Component mounts
2. useEffect triggers
3. API service called
4. Loading state set to true
5. API response received
6. State updated with data
7. Loading state set to false
8. Component re-renders with data
```

## Best Practices

1. **Minimize Global State**: Only use Context for truly global state
2. **Local State First**: Prefer useState for component-specific state
3. **Derive Don't Store**: Compute derived values instead of storing them
4. **Single Source of Truth**: Don't duplicate state
5. **Immutable Updates**: Always create new objects/arrays when updating
6. **Error Boundaries**: Use ErrorBoundary for error handling
7. **Loading States**: Always show loading indicators
8. **Cleanup**: Clear timers, subscriptions in useEffect cleanup

## State Management Checklist

- [ ] Is this state needed by multiple components? → Use Context
- [ ] Is this state component-specific? → Use useState
- [ ] Can this be computed from other state? → Derive it
- [ ] Is this state from API? → Fetch in useEffect
- [ ] Does this need persistence? → Use localStorage
- [ ] Is this state complex? → Consider useReducer

## Future Considerations

If the application grows in complexity, consider:

1. **Redux**: For complex state management
2. **Zustand**: Lightweight alternative to Redux
3. **React Query**: For server state management
4. **Jotai/Recoil**: Atomic state management

For now, Context API is sufficient and keeps the codebase simple.

