# Component Structure & Documentation

## Component Organization

Components are organized into logical groups:

### Layout Components (`components/layout/`)

#### Layout.jsx
Main layout wrapper for all protected pages.

**Props:**
- `children`: Page content to render

**Features:**
- Manages sidebar open/close state
- Provides consistent page structure
- Responsive layout

**Usage:**
```jsx
<Layout>
  <YourPageContent />
</Layout>
```

#### Sidebar.jsx
Navigation sidebar with glass morphism design.

**Props:**
- `isOpen`: Boolean for mobile sidebar visibility
- `onClose`: Function to close sidebar

**Features:**
- Dynamic menu based on user role
- Admin section (only for admins)
- Logo display from LogoContext
- User profile link
- Logout functionality
- Responsive: overlay on mobile

**Menu Items:**
- Dashboard
- Tickets
- Reports (admin/agent only)
- Settings
- Admin section (admin only)
- Department Dashboard (department-head only)

#### TopBar.jsx
Top navigation bar with search and user info.

**Props:**
- `onMenuClick`: Function to toggle mobile menu

**Features:**
- Search bar (desktop only)
- Notifications bell
- User avatar and info
- Mobile menu toggle

### UI Components (`components/ui/`)

#### Button.jsx
Reusable button component with multiple variants.

**Props:**
- `variant`: 'primary' | 'secondary' | 'danger' | 'outline'
- `transparent`: Boolean for glass effect
- `customColor`: Custom color override
- `children`: Button content
- `onClick`: Click handler
- `disabled`: Disabled state
- `className`: Additional classes

**Variants:**
- `primary`: Blue gradient button
- `secondary`: Gray button
- `danger`: Red button
- `outline`: Outlined button
- `transparent`: Glass morphism effect

#### Card.jsx
Card container with glass effect.

**Props:**
- `children`: Card content
- `className`: Additional classes

**Features:**
- Glass morphism styling
- Hover animations
- Shadow effects

#### Input.jsx
Form input component.

**Props:**
- `type`: Input type
- `placeholder`: Placeholder text
- `value`: Input value
- `onChange`: Change handler
- `disabled`: Disabled state
- `className`: Additional classes

**Features:**
- Focus glow effects
- Glass morphism styling
- Error states

#### Badge.jsx
Status badge component.

**Props:**
- `variant`: 'success' | 'warning' | 'danger' | 'info'
- `children`: Badge text

**Usage:**
```jsx
<Badge variant="success">Active</Badge>
```

#### Select.jsx
Dropdown select component.

**Props:**
- `options`: Array of {value, label} objects
- `value`: Selected value
- `onChange`: Change handler
- `placeholder`: Placeholder text

#### Modal.jsx
Modal dialog component.

**Props:**
- `isOpen`: Boolean for visibility
- `onClose`: Close handler
- `title`: Modal title
- `children`: Modal content

### Feature Components

#### ProtectedRoute.jsx
Route protection component.

**Props:**
- `children`: Route content
- `requireAdmin`: Boolean for admin-only routes

**Functionality:**
- Checks authentication status
- Validates user roles
- Shows loading state
- Redirects unauthorized users

**Usage:**
```jsx
<ProtectedRoute requireAdmin>
  <AdminPage />
</ProtectedRoute>
```

#### ErrorBoundary.jsx
Error boundary for catching React errors.

**Features:**
- Catches component errors
- Shows fallback UI
- Prevents app crashes

#### ChatWidget.jsx
Global chat widget component.

**Features:**
- Floating chat button
- Chat window with messages
- File attachment support
- 3D avatar display
- Session management
- Integration with chatbot API

**States:**
- `isOpen`: Chat window visibility
- `isMinimized`: Minimized state
- `messages`: Chat messages array
- `session`: Chat session ID

### 3D Components

#### ChatAvatar3D.jsx
3D avatar for chat widget using Three.js.

**Features:**
- Animated 3D avatar
- Interactive rotation
- Smooth animations

#### CyberGrid3D.jsx
3D grid background effect.

#### Laptop3D.jsx
3D laptop visualization.

## Page Components

### Authentication Pages

#### Login.jsx
User login page.

**Features:**
- Email/password authentication
- MFA support
- SSO links
- Rate limiting
- CSRF protection
- Form validation

#### MFALogin.jsx
Multi-factor authentication page.

**Features:**
- TOTP code input
- Temporary token handling
- Error handling

#### MFASetup.jsx
MFA setup page.

**Features:**
- QR code display
- Secret key backup
- Verification

### Main Pages

#### Dashboard.jsx
Main dashboard with statistics and charts.

**Features:**
- Real-time stats (30s refresh)
- Status cards (clickable)
- Charts (Recharts)
- Recent tickets
- Organization filtering (admin)
- Role-based views

**Data Displayed:**
- Total tickets
- Pending tickets
- Closed tickets
- Overdue tickets
- Status distribution
- Priority distribution
- Recent activity

#### TicketList.jsx
Ticket listing page with filtering.

**Features:**
- Search functionality
- Status filtering
- Priority filtering
- Real-time updates
- Pagination support
- Clickable tickets

**Filters:**
- Status: all, open, in-progress, resolved, closed
- Priority: all, low, medium, high, urgent
- Search: text search across tickets

#### TicketDetail.jsx
Individual ticket view.

**Features:**
- Full ticket information
- Comments section
- File attachments
- Status updates
- Assignment
- Activity timeline

#### NewTicket.jsx
Create new ticket page.

**Features:**
- Form validation
- File upload
- Category selection
- Priority selection
- Department assignment
- Rich text description

### Admin Pages

All admin pages located in `pages/Admin/`:

- **Users.jsx**: User management
- **Roles.jsx**: Role and permission management
- **Organizations.jsx**: Organization management
- **Categories.jsx**: Category management
- **Departments.jsx**: Department management
- **SLAPolicies.jsx**: SLA policy configuration
- **EmailSettings.jsx**: Email configuration
- **EmailTemplates.jsx**: Email template management
- **EmailAutomation.jsx**: Email automation rules
- **SSOConfig.jsx**: SSO configuration
- **LogoManagement.jsx**: Logo upload and management
- **Analytics.jsx**: Analytics dashboard
- **ApiKeys.jsx**: API key management
- **FAQ.jsx**: FAQ management
- **ChatHistory.jsx**: Chat history viewer
- **TeamsIntegration.jsx**: Microsoft Teams integration
- **TicketImport.jsx**: Bulk ticket import
- **BackupRestore.jsx**: Backup and restore functionality

## Component Patterns

### Custom Hooks Pattern
```jsx
// Usage in components
const { user, login, logout } = useAuth()
const { logo } = useLogo()
const { theme, toggleTheme } = useTheme()
```

### API Call Pattern
```jsx
// In component
useEffect(() => {
  const loadData = async () => {
    try {
      const data = await ticketsAPI.getAll()
      setTickets(data)
    } catch (error) {
      toast.error(error.message)
    }
  }
  loadData()
}, [])
```

### Form Handling Pattern
```jsx
const [formData, setFormData] = useState({})
const [errors, setErrors] = useState({})

const handleSubmit = async (e) => {
  e.preventDefault()
  try {
    await api.create(formData)
    toast.success('Created successfully')
  } catch (error) {
    setErrors(error.errors)
  }
}
```

## Component Best Practices

1. **Single Responsibility**: Each component should do one thing well
2. **Props Validation**: Use PropTypes or TypeScript for prop validation
3. **Error Handling**: Always handle errors gracefully
4. **Loading States**: Show loading indicators during async operations
5. **Accessibility**: Use semantic HTML and ARIA attributes
6. **Performance**: Memoize expensive computations
7. **Reusability**: Extract common patterns into reusable components

