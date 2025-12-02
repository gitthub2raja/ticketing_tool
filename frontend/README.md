# Frontend Documentation

This folder contains comprehensive documentation for the Ticketing Tool frontend application.

## 📚 Documentation Index

1. [Architecture Overview](./ARCHITECTURE.md) - Overall system architecture and design patterns
2. [Component Structure](./COMPONENTS.md) - Detailed component breakdown and organization
3. [State Management](./STATE_MANAGEMENT.md) - Context API usage and state patterns
4. [Routing Guide](./ROUTING.md) - Route structure and protection mechanisms
5. [API Integration](./API_INTEGRATION.md) - API service layer and communication patterns
6. [UI/UX Design System](./DESIGN_SYSTEM.md) - Design tokens, components, and styling
7. [Security Features](./SECURITY.md) - Authentication, authorization, and security measures
8. [Performance Optimization](./PERFORMANCE.md) - Optimization strategies and best practices
9. [Development Guide](./DEVELOPMENT.md) - Setup, build process, and development workflow

## 🚀 Quick Start

### Tech Stack
- **React 18.2.0** - UI library
- **React Router v6** - Routing
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling framework
- **Three.js** - 3D components
- **Recharts** - Chart library
- **React Hot Toast** - Notifications

### Project Structure
```
src/
├── components/     # Reusable UI components
├── pages/         # Page-level components (routes)
├── contexts/      # React Context providers
├── services/      # API service layer
├── config/        # Configuration files
└── utils/         # Utility functions
```

### Key Features
- ✅ Role-based access control (Admin, Agent, User, Department Head)
- ✅ JWT-based authentication with MFA support
- ✅ SSO integration (Azure AD, Google Workspace)
- ✅ Real-time ticket management
- ✅ Advanced search and filtering
- ✅ Responsive design with glass morphism UI
- ✅ Global chat widget with 3D avatar
- ✅ Comprehensive admin panel

## 📖 Getting Started

1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Build for production: `npm run build`
4. Preview production build: `npm run preview`

## 🔗 Related Documentation

- Backend API documentation: See `server/` folder
- Installation guide: See `INSTALLATION.md` in project root
- Deployment guide: See `installation_files/DEPLOYMENT.md`

