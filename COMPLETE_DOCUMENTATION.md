# Ticketing Tool - Complete Documentation

This is a comprehensive documentation file consolidating all project documentation.

---

## Table of Contents

1. [Installation & Setup](#installation--setup)
2. [Docker Deployment](#docker-deployment)
3. [Database Setup](#database-setup)
4. [Backend API](#backend-api)
5. [Frontend Architecture](#frontend-architecture)
6. [Backup & Restore](#backup--restore)
7. [Email Configuration](#email-configuration)
8. [Troubleshooting](#troubleshooting)
9. [API Endpoints](#api-endpoints)
10. [Development Guide](#development-guide)

---

## Installation & Setup

### Quick Start

```bash
cd /path/to/ticketing_tool
docker compose up -d --build
```

### Prerequisites

- Docker and Docker Compose
- MongoDB (via Docker or external)
- Node.js 20+ (for local development)

### Access Points

- **Frontend**: http://localhost
- **Backend API**: http://localhost:5000
- **Swagger UI**: http://localhost:5000/docs
- **MongoDB**: localhost:27018

### Default Credentials

After demo data creation:
- **Admin**: `admin@example.com` / `Admin123!`
- **Agent**: `agent1@example.com` / `Agent123!`
- **User**: `user1@example.com` / `User123!`

---

## Docker Deployment

### Docker Compose Services

| Service | Container | Status | Ports |
|---------|-----------|--------|-------|
| Backend | `ticketing_backend` | Healthy | `5000:5000` |
| Frontend | `ticketing_frontend` | Running | `80` (via nginx) |
| MongoDB | `ticketing_mongodb` | Healthy | `27018:27017` |
| Nginx | `ticketing_nginx` | Healthy | `80:80`, `443:443` |

### Quick Commands

```bash
# Start all services
docker compose up -d --build

# View logs
docker compose logs -f

# Restart services
docker compose restart

# Stop services
docker compose down

# Check status
docker compose ps
```

### Environment Variables

Backend environment (in docker-compose.yml):
```yaml
MONGODB_URI: mongodb://mongoadmin:mongopassword@mongodb:27017/ticketing_tool?authSource=admin
SECRET_KEY: change-this-secret-in-production
JWT_SECRET: change-this-jwt-secret-in-production
FRONTEND_URL: http://localhost
```

---

## Database Setup

### MongoDB Connection

**From Host Machine (MongoDB Compass):**
```
mongodb://mongoadmin:mongopassword@localhost:27018/ticketing_tool?authSource=admin
```

**From Backend Container:**
```
mongodb://mongoadmin:mongopassword@mongodb:27017/ticketing_tool?authSource=admin
```

### Create Demo Data

```bash
docker compose exec backend python /app/create_demo_data.py
```

### Demo Data Summary

- **Organizations**: 2 (Acme Corporation, TechStart Inc)
- **Departments**: 3 (IT Support, HR, Finance)
- **Categories**: 4 (Hardware, Software, Network, Account Access)
- **Users**: 6 (1 admin, 2 agents, 3 users)
- **Tickets**: 8 sample tickets

### Database Collections

- `users` - User accounts
- `tickets` - Ticket records
- `organizations` - Organizations
- `categories` - Ticket categories
- `departments` - Departments
- `roles` - User roles
- `sla_policies` - SLA policies
- `email_settings` - Email configuration
- `email_templates` - Email templates
- `email_automations` - Email automation rules
- `faqs` - FAQ entries
- `chat_sessions` - Chat history
- `teams_configs` - Microsoft Teams configurations
- `logos` - Logo files

---

## Backend API

### Tech Stack

- **FastAPI** - Web framework
- **Uvicorn** - ASGI server
- **Motor** - Async MongoDB driver
- **Pydantic** - Data validation
- **python-jose** - JWT handling

### Project Structure

```
backend/
├── app/
│   ├── api/v1/endpoints/    # API endpoints
│   ├── core/                # Configuration
│   ├── db/                  # Database connection
│   ├── services/            # Business logic
│   └── main.py             # Application entry
├── requirements.txt
└── Dockerfile
```

### Local Development

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 5000
```

### API Documentation

- **Swagger UI**: http://localhost:5000/docs
- **ReDoc**: http://localhost:5000/redoc
- **OpenAPI JSON**: http://localhost:5000/api/openapi.json

---

## Frontend Architecture

### Tech Stack

- **React 18.2.0** - UI library
- **React Router v6** - Routing
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Three.js** - 3D components
- **Recharts** - Charts
- **React Hot Toast** - Notifications

### Project Structure

```
frontend/src/
├── components/     # Reusable UI components
├── pages/         # Page-level components
├── contexts/      # React Context providers
├── services/      # API service layer
├── config/        # Configuration
└── utils/         # Utility functions
```

### Key Features

- Role-based access control (Admin, Agent, User, Department Head)
- JWT-based authentication with MFA support
- SSO integration (Azure AD, Google Workspace)
- Real-time ticket management
- Advanced search and filtering
- Responsive design with glass morphism UI
- Global chat widget with 3D avatar
- Comprehensive admin panel

### State Management

Uses React Context API:
- `AuthContext` - Authentication state
- `SSOContext` - SSO configuration
- `LogoContext` - Logo management
- `ThemeContext` - Theme preferences

### API Integration

All backend communication through `services/api.js`:
- Centralized API service
- Automatic token injection
- Error handling
- Request/response interceptors

---

## Backup & Restore

### Backup Location

- **Local Path**: `./backups/mongodb/`
- **Container Path**: `/backups`
- **Mount Type**: Bind mount (direct access to local filesystem)

### Create Backup

```bash
./backup_mongodb.sh
```

This creates a timestamped compressed backup:
- Format: `ticketing_tool_backup_YYYYMMDD_HHMMSS.tar.gz`
- Location: `./backups/mongodb/`

### Restore Backup

```bash
./restore_mongodb.sh ticketing_tool_backup_YYYYMMDD_HHMMSS.tar.gz
```

**Warning**: Restore will drop existing data before restoring.

### Automated Backups

Add to crontab for daily backups at 2 AM:
```bash
0 2 * * * cd /home/raja/ticketing_tool && ./backup_mongodb.sh >> /var/log/mongodb_backup.log 2>&1
```

### Manual Backup/Restore

```bash
# Backup
docker exec ticketing_mongodb mongodump \
  --username mongoadmin \
  --password mongopassword \
  --authenticationDatabase admin \
  --db ticketing_tool \
  --out /backups/manual_backup_$(date +%Y%m%d_%H%M%S)

# Restore
docker exec ticketing_mongodb mongorestore \
  --username mongoadmin \
  --password mongopassword \
  --authenticationDatabase admin \
  --db ticketing_tool \
  --drop \
  /backups/backup_path/ticketing_tool
```

---

## Email Configuration

### OAuth2 Support

The system supports both password-based and OAuth2 authentication for email.

#### Microsoft 365 OAuth2 Setup

1. Register app in Azure AD
2. Get Client ID, Client Secret, Tenant ID
3. Configure redirect URI: `http://localhost/admin/email/oauth2/callback`
4. In Email Settings:
   - Select "OAuth2" authentication method
   - Select "Microsoft 365" provider
   - Enter credentials
   - Click "Authorize OAuth2"

#### Google Workspace OAuth2 Setup

1. Create OAuth2 credentials in Google Cloud Console
2. Enable Gmail API
3. Get Client ID and Client Secret
4. Configure redirect URI
5. In Email Settings:
   - Select "OAuth2" authentication method
   - Select "Google Workspace" provider
   - Enter credentials
   - Click "Authorize OAuth2"

### Email Endpoints

- `GET /api/admin/email` - Get email settings
- `PUT /api/admin/email` - Update email settings
- `POST /api/email/test-smtp` - Test SMTP connection
- `POST /api/email/test-imap` - Test IMAP connection
- `GET /api/email/oauth2/auth-url` - Get OAuth2 authorization URL
- `POST /api/email/oauth2/callback` - Handle OAuth2 callback

### Benefits of OAuth2

- No password required (perfect for shared mailboxes)
- Secure industry-standard authentication
- Automatic token refresh
- Multi-provider support (Microsoft 365, Google Workspace)

---

## Troubleshooting

### Rate Limit Issues

If you see "Too many login attempts" error:

**Quick Fix (Browser Console):**
```javascript
localStorage.removeItem('rate_limit_login_admin@example.com')
```

**Clear All Rate Limits:**
```javascript
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('rate_limit_')) {
    localStorage.removeItem(key)
  }
})
```

### MongoDB Connection Issues

**Check container status:**
```bash
docker compose ps mongodb
```

**Test connection:**
```bash
docker exec ticketing_mongodb mongosh --eval "db.runCommand('ping')" \
  --username mongoadmin \
  --password mongopassword \
  --authenticationDatabase admin
```

**Check logs:**
```bash
docker compose logs mongodb
```

### Backend Not Starting

**Check logs:**
```bash
docker compose logs backend
```

**Check port availability:**
```bash
netstat -tuln | grep 5000
```

**Restart service:**
```bash
docker compose restart backend
```

### Frontend Not Loading

**Rebuild frontend:**
```bash
docker compose up -d --build frontend
```

**Check nginx logs:**
```bash
docker compose logs nginx
```

### Database Not Connected

**Verify connection:**
```bash
docker compose exec backend python -c "
from app.db.database import init_db
import asyncio
asyncio.run(init_db())
print('✅ Connected!')
"
```

**Create demo data:**
```bash
docker compose exec backend python /app/create_demo_data.py
```

---

## API Endpoints

### Authentication

- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh token
- `POST /api/mfa/setup` - Setup MFA
- `POST /api/mfa/verify-login` - Verify MFA

### Tickets

- `GET /api/tickets` - Get all tickets
- `POST /api/tickets` - Create ticket
- `GET /api/tickets/{ticket_id}` - Get ticket
- `PUT /api/tickets/{ticket_id}` - Update ticket
- `DELETE /api/tickets/{ticket_id}` - Delete ticket

### Admin Endpoints

- `GET /api/admin/users` - Get all users
- `POST /api/admin/users` - Create user
- `GET /api/admin/roles` - Get all roles
- `GET /api/admin/sla` - Get SLA policies
- `GET /api/admin/logo` - Get logo
- `POST /api/admin/logo` - Update logo

### Email Management

- `GET /api/admin/email` - Get email settings
- `PUT /api/admin/email` - Update email settings
- `GET /api/email-templates` - Get templates
- `GET /api/email-automation` - Get automations

### Analytics

- `GET /api/analytics/overview` - Analytics overview
- `GET /api/analytics/performance` - Performance analytics
- `GET /api/analytics/trends` - Trends analytics

### Chatbot

- `POST /api/chatbot/session` - Create chat session
- `POST /api/chatbot/message` - Send message
- `GET /api/chatbot/history` - Get chat history
- `GET /api/chatbot/session/{session_id}` - Get session

### Backup & Restore

- `POST /api/backup/create` - Create backup
- `GET /api/backup/list` - List backups
- `GET /api/backup/download/{backup_name}` - Download backup
- `POST /api/backup/restore` - Restore backup

### Complete Endpoint List

All 80+ endpoints are implemented:
- ✅ Authentication & Authorization
- ✅ Ticket Management
- ✅ User Management
- ✅ Organizations, Categories, Departments
- ✅ Admin Functions
- ✅ Reports & Analytics
- ✅ API Keys
- ✅ Email Templates & Automation
- ✅ Chatbot
- ✅ FAQ
- ✅ Teams Integration
- ✅ Backup & Restore
- ✅ MFA Support

---

## Development Guide

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

### Testing

```bash
# Backend tests
cd backend
pytest tests/

# Frontend tests
cd frontend
npm test
```

### Building for Production

```bash
# Backend (Docker)
docker compose build backend

# Frontend (Docker)
docker compose build frontend

# Or locally
cd frontend
npm run build
```

### Code Structure

**Backend:**
- Async/await pattern throughout
- Pydantic models for validation
- Motor for MongoDB operations
- FastAPI dependency injection

**Frontend:**
- Component-based architecture
- Context API for state management
- Service layer for API calls
- Protected routes with role-based access

---

## Security Considerations

1. **Change default credentials** immediately after installation
2. **Use strong JWT_SECRET** (minimum 64 characters)
3. **Enable MongoDB authentication** in production
4. **Use HTTPS** in production (configure SSL certificates)
5. **Restrict database access** by IP
6. **Keep dependencies updated**
7. **Never commit .env files** to version control

---

## Production Deployment

1. Set `NODE_ENV=production` or `ENVIRONMENT=production`
2. Use MongoDB Atlas or secured MongoDB instance
3. Configure HTTPS with SSL certificates
4. Set up firewall rules
5. Configure proper CORS settings
6. Use environment variable management
7. Set up monitoring and logging
8. Configure backup strategy

---

## Quick Reference

### Access URLs
- **With Nginx**: http://localhost
- **Backend API**: http://localhost:5000
- **Swagger UI**: http://localhost:5000/docs
- **MongoDB Compass**: `mongodb://mongoadmin:mongopassword@localhost:27018/ticketing_tool?authSource=admin`

### Important Commands
```bash
# Start all services
docker compose up -d --build

# View logs
docker compose logs -f

# Restart services
docker compose restart

# Create backup
./backup_mongodb.sh

# Restore backup
./restore_mongodb.sh <backup_file>

# Create demo data
docker compose exec backend python /app/create_demo_data.py
```

### Default Credentials
- **Admin**: `admin@example.com` / `Admin123!`
- **Agent**: `agent1@example.com` / `Agent123!`
- **User**: `user1@example.com` / `User123!`

---

**Documentation Complete!** 🎉

For issues not covered here, check the logs and error messages for specific guidance.

