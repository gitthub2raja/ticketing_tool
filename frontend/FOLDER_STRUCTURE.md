# Frontend Folder Structure

## 📁 Complete Directory Overview

```
frontend/
├── 📄 Configuration Files
│   ├── package.json              # Dependencies and scripts
│   ├── package-lock.json        # Locked dependency versions
│   ├── vite.config.js           # Vite build configuration
│   ├── tailwind.config.js       # Tailwind CSS configuration
│   ├── postcss.config.js        # PostCSS configuration
│   └── index.html               # HTML entry point
│
├── 📁 public/                    # Static assets
│   └── logo.svg                 # Application logo
│
├── 📁 src/                       # Source code
│   ├── main.jsx                 # React entry point
│   ├── App.jsx                  # Root component with routing
│   ├── index.css                # Global styles
│   │
│   ├── 📁 components/            # Reusable components
│   │   ├── layout/              # Layout components
│   │   │   ├── Layout.jsx       # Main layout wrapper
│   │   │   ├── Sidebar.jsx      # Navigation sidebar
│   │   │   └── TopBar.jsx       # Top navigation bar
│   │   │
│   │   ├── ui/                  # Base UI components
│   │   │   ├── Button.jsx       # Button component
│   │   │   ├── Card.jsx         # Card container
│   │   │   ├── Input.jsx        # Form input
│   │   │   ├── Select.jsx       # Dropdown select
│   │   │   ├── Textarea.jsx    # Text area input
│   │   │   ├── Badge.jsx        # Status badge
│   │   │   ├── Modal.jsx        # Modal dialog
│   │   │   ├── ThemeToggle.jsx  # Theme switcher
│   │   │   ├── CyberGrid.jsx    # Grid background
│   │   │   ├── CyberGrid3D.jsx  # 3D grid effect
│   │   │   └── Laptop3D.jsx     # 3D laptop component
│   │   │
│   │   ├── ProtectedRoute.jsx   # Route protection
│   │   ├── ErrorBoundary.jsx    # Error handling
│   │   ├── ChatWidget.jsx       # Global chat widget
│   │   └── ChatAvatar3D.jsx     # 3D chat avatar
│   │
│   ├── 📁 pages/                 # Page components
│   │   ├── Login.jsx            # Login page
│   │   ├── MFALogin.jsx         # MFA login
│   │   ├── MFASetup.jsx         # MFA setup
│   │   ├── Dashboard.jsx        # Main dashboard
│   │   ├── Profile.jsx          # User profile
│   │   ├── Settings.jsx         # User settings
│   │   ├── Reports.jsx          # Reports page
│   │   │
│   │   ├── 📁 Tickets/          # Ticket pages
│   │   │   ├── TicketList.jsx   # Ticket listing
│   │   │   ├── TicketDetail.jsx # Ticket details
│   │   │   ├── NewTicket.jsx    # Create ticket
│   │   │   └── TicketSearch.jsx # Ticket search
│   │   │
│   │   ├── 📁 Admin/            # Admin pages (18 files)
│   │   │   ├── Users.jsx
│   │   │   ├── Roles.jsx
│   │   │   ├── Organizations.jsx
│   │   │   ├── Categories.jsx
│   │   │   ├── Departments.jsx
│   │   │   ├── SLAPolicies.jsx
│   │   │   ├── EmailSettings.jsx
│   │   │   ├── EmailTemplates.jsx
│   │   │   ├── EmailAutomation.jsx
│   │   │   ├── SSOConfig.jsx
│   │   │   ├── LogoManagement.jsx
│   │   │   ├── Analytics.jsx
│   │   │   ├── ApiKeys.jsx
│   │   │   ├── FAQ.jsx
│   │   │   ├── ChatHistory.jsx
│   │   │   ├── TeamsIntegration.jsx
│   │   │   ├── TicketImport.jsx
│   │   │   └── BackupRestore.jsx
│   │   │
│   │   ├── 📁 DepartmentHead/   # Department head pages
│   │   │   └── Dashboard.jsx
│   │   │
│   │   └── 📁 SSO/              # SSO pages
│   │       ├── Azure.jsx
│   │       ├── GoogleWorkspace.jsx
│   │       ├── OAuth.jsx
│   │       └── SAML.jsx
│   │
│   ├── 📁 contexts/             # React Context providers
│   │   ├── AuthContext.jsx      # Authentication state
│   │   ├── SSOContext.jsx       # SSO configuration
│   │   ├── LogoContext.jsx      # Logo management
│   │   └── ThemeContext.jsx     # Theme preferences
│   │
│   ├── 📁 services/             # API services
│   │   ├── api.js               # Main API service (764 lines)
│   │   ├── emailService.js      # Email utilities
│   │   └── securityService.js   # Security utilities
│   │
│   ├── 📁 config/               # Configuration
│   │   └── theme.js             # Theme configuration
│   │
│   └── 📁 utils/                # Utility functions
│       └── soundEffects.js     # Sound effects
│
└── 📁 docs/                      # Documentation
    ├── README.md                 # Main documentation
    ├── ARCHITECTURE.md           # Architecture overview
    ├── COMPONENTS.md             # Component documentation
    ├── STATE_MANAGEMENT.md       # State management guide
    ├── ROUTING.md                # Routing documentation
    ├── API_INTEGRATION.md        # API integration guide
    └── MIGRATION.md              # Migration notes
```

## 📊 Statistics

- **Total Pages**: ~35 page components
- **Admin Pages**: 18 admin management pages
- **UI Components**: 12 base UI components
- **Layout Components**: 3 layout components
- **Context Providers**: 4 context providers
- **API Services**: 3 service files (main api.js is 764 lines)
- **Documentation Files**: 7 markdown files

## 🎯 Key Directories Explained

### `src/components/`
Reusable React components organized by purpose:
- **layout/**: Page structure components
- **ui/**: Base UI elements (buttons, inputs, cards)
- **Feature components**: ChatWidget, ProtectedRoute, ErrorBoundary

### `src/pages/`
Page-level components corresponding to routes:
- **Admin/**: All admin management pages
- **Tickets/**: Ticket-related pages
- **SSO/**: Single Sign-On pages
- **Root pages**: Login, Dashboard, Profile, etc.

### `src/contexts/`
React Context API for global state:
- **AuthContext**: User authentication and session
- **SSOContext**: SSO provider configuration
- **LogoContext**: Organization logo management
- **ThemeContext**: Light/dark theme switching

### `src/services/`
API communication layer:
- **api.js**: Centralized API service (all backend endpoints)
- **emailService.js**: Email-related utilities
- **securityService.js**: Security helper functions

### `src/config/`
Configuration files:
- **theme.js**: Theme colors, glass effects, transparent styles

### `src/utils/`
Utility functions:
- **soundEffects.js**: Sound effect utilities

## 🔧 Configuration Files

### `package.json`
- **Dependencies**: React, React Router, Three.js, Recharts, etc.
- **Scripts**: `dev`, `build`, `preview`, `lint`
- **Type**: ES modules (`"type": "module"`)

### `vite.config.js`
- **Build Tool**: Vite 7.2.2
- **Port**: 3000 (dev), 4173 (preview)
- **Output**: `dist/` directory
- **Path Alias**: `@/` → `./src`

### `tailwind.config.js`
- **Framework**: Tailwind CSS 3.3.6
- **Content**: Scans `./index.html` and `./src/**/*.{js,ts,jsx,tsx}`
- **Custom Colors**: Primary blue, gray scale
- **Custom Animations**: fade-in, slide-up, glow-pulse, etc.

### `index.html`
- **Entry Point**: Loads `main.jsx`
- **Root Element**: `<div id="root"></div>`
- **Title**: "Ticketing Tool"

## 📦 Dependencies

### Core
- **React 18.2.0**: UI library
- **React Router 6.20.0**: Routing
- **Vite 7.2.2**: Build tool

### UI & Styling
- **Tailwind CSS 3.3.6**: Utility-first CSS
- **Lucide React 0.294.0**: Icons
- **React Hot Toast 2.4.1**: Notifications

### 3D Graphics
- **Three.js 0.160.1**: 3D library
- **@react-three/fiber 8.18.0**: React renderer for Three.js
- **@react-three/drei 9.122.0**: Three.js helpers

### Data Visualization
- **Recharts 2.10.3**: Chart library

### Utilities
- **date-fns 2.30.0**: Date formatting

## 🚀 Development Workflow

### Local Development
```bash
cd frontend
npm install
npm run dev        # Starts dev server on port 3000
```

### Building for Production
```bash
cd frontend
npm run build     # Outputs to frontend/dist/
npm run preview    # Preview production build
```

### Docker Build
```bash
# From project root
docker-compose build frontend
```

## 📝 File Organization Principles

1. **Feature-Based**: Pages organized by feature (Tickets, Admin, SSO)
2. **Component Reusability**: Shared components in `components/ui/`
3. **Separation of Concerns**: Services, contexts, pages separated
4. **Documentation**: Comprehensive docs in `docs/` folder
5. **Configuration**: All config files at root of `frontend/`

## 🔍 Important Files

### Entry Points
- `index.html` → `main.jsx` → `App.jsx`

### Core Files
- `App.jsx`: Route definitions, context providers, global components
- `main.jsx`: React DOM rendering
- `services/api.js`: All API endpoints (764 lines)

### Key Components
- `ProtectedRoute.jsx`: Route protection logic
- `Layout.jsx`: Page layout wrapper
- `ChatWidget.jsx`: Global chat functionality

## 🎨 Design System

- **Styling**: Tailwind CSS with custom configuration
- **Theme**: Glass morphism with transparent effects
- **Colors**: Primary blue (#0ea5e9) with gray scale
- **Components**: Consistent UI component library
- **3D Effects**: Three.js for interactive 3D elements

## 📚 Documentation

All documentation is in the `docs/` folder:
- **README.md**: Overview and quick start
- **ARCHITECTURE.md**: System architecture
- **COMPONENTS.md**: Component documentation
- **STATE_MANAGEMENT.md**: State management patterns
- **ROUTING.md**: Routing structure
- **API_INTEGRATION.md**: API usage guide

## ✅ Migration Status

All files have been successfully moved from root to `frontend/` folder:
- ✅ Source code (`src/`)
- ✅ Public assets (`public/`)
- ✅ Configuration files
- ✅ Documentation
- ✅ Docker configuration updated

