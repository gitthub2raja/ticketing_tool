# Frontend Architecture Overview

## System Architecture

The frontend is built as a **Single Page Application (SPA)** using React, following modern architectural patterns.

### Architecture Patterns

#### 1. Component-Based Architecture
- **Atomic Design**: Components organized from smallest (atoms) to largest (pages)
- **Composition**: Small, reusable components combined to build complex UIs
- **Separation of Concerns**: UI, logic, and data fetching separated

#### 2. Context-Based State Management
- **No Redux**: Uses React Context API for global state
- **Multiple Contexts**: Separate contexts for different concerns
  - `AuthContext`: Authentication state
  - `SSOContext`: SSO configuration
  - `LogoContext`: Logo management
  - `ThemeContext`: Theme preferences

#### 3. Service Layer Pattern
- **Centralized API**: All backend communication through `services/api.js`
- **Abstraction**: Components don't directly call fetch/axios
- **Error Handling**: Centralized error handling in service layer

#### 4. Route Protection Pattern
- **ProtectedRoute Component**: Wraps protected routes
- **Role-Based Access**: Different access levels (public, protected, admin)
- **Automatic Redirects**: Handles unauthorized access gracefully

## Component Hierarchy

```
App (Root)
├── AuthProvider
│   ├── SSOProvider
│   │   ├── LogoProvider
│   │   │   ├── Router
│   │   │   │   ├── ErrorBoundary
│   │   │   │   │   ├── ChatWidget (Global)
│   │   │   │   │   ├── Toaster (Notifications)
│   │   │   │   │   └── Routes
│   │   │   │   │       ├── Public Routes (Login, SSO)
│   │   │   │   │       ├── Protected Routes
│   │   │   │   │       │   └── Layout
│   │   │   │   │       │       ├── Sidebar
│   │   │   │   │       │       └── TopBar
│   │   │   │   │       └── Page Components
```

## File Structure

```
src/
├── main.jsx                 # Entry point
├── App.jsx                  # Root component with routing
├── index.css                # Global styles
│
├── components/              # Reusable components
│   ├── layout/             # Layout components
│   │   ├── Layout.jsx      # Main layout wrapper
│   │   ├── Sidebar.jsx     # Navigation sidebar
│   │   └── TopBar.jsx      # Top navigation bar
│   ├── ui/                 # Base UI components
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── Input.jsx
│   │   ├── Badge.jsx
│   │   └── ...
│   ├── ProtectedRoute.jsx  # Route protection
│   ├── ErrorBoundary.jsx   # Error handling
│   └── ChatWidget.jsx      # Global chat
│
├── pages/                   # Page components
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   ├── Tickets/
│   ├── Admin/
│   └── ...
│
├── contexts/                # Context providers
│   ├── AuthContext.jsx
│   ├── SSOContext.jsx
│   ├── LogoContext.jsx
│   └── ThemeContext.jsx
│
├── services/                # API services
│   ├── api.js              # Main API service
│   ├── emailService.js
│   └── securityService.js
│
├── config/                  # Configuration
│   └── theme.js
│
└── utils/                   # Utilities
    └── soundEffects.js
```

## Data Flow

### Authentication Flow
```
User Login
  ↓
AuthContext.login()
  ↓
authAPI.login() → Backend
  ↓
Store token in localStorage
  ↓
Set user in AuthContext
  ↓
Navigate to Dashboard
```

### API Request Flow
```
Component
  ↓
Service API (e.g., ticketsAPI.getAll())
  ↓
apiCall() helper
  ↓
Add Authorization header (Bearer token)
  ↓
Fetch request to backend
  ↓
Handle response/error
  ↓
Return data to component
```

### Route Protection Flow
```
User navigates to protected route
  ↓
ProtectedRoute component checks:
  ├── Is user authenticated? → No → Redirect to /login
  ├── Is admin required? → Yes → Check role → No → Redirect to /dashboard
  └── All checks pass → Render component
```

## Design Principles

1. **Single Responsibility**: Each component has one clear purpose
2. **DRY (Don't Repeat Yourself)**: Reusable components and utilities
3. **Separation of Concerns**: UI, business logic, and data fetching separated
4. **Progressive Enhancement**: Works without JavaScript for basic functionality
5. **Accessibility**: Semantic HTML and ARIA attributes
6. **Performance**: Code splitting, lazy loading, debouncing

## Technology Choices

### Why React?
- Component reusability
- Large ecosystem
- Strong community support
- Virtual DOM for performance

### Why Context API over Redux?
- Simpler for this use case
- Less boilerplate
- Built into React
- Sufficient for current state complexity

### Why Vite?
- Fast development server
- Quick hot module replacement
- Optimized production builds
- Modern ES modules support

### Why Tailwind CSS?
- Utility-first approach
- Rapid development
- Consistent design system
- Small production bundle size

## Scalability Considerations

1. **Code Splitting**: Dynamic imports for admin pages
2. **Lazy Loading**: Components loaded on demand
3. **API Optimization**: Debouncing, caching strategies
4. **Bundle Size**: Tree shaking, minification
5. **State Management**: Can migrate to Redux if needed

## Future Enhancements

- [ ] Add Redux for complex state management if needed
- [ ] Implement service workers for offline support
- [ ] Add unit and integration tests
- [ ] Implement Storybook for component documentation
- [ ] Add E2E tests with Cypress/Playwright
- [ ] Optimize bundle size further with code splitting
- [ ] Add PWA capabilities

