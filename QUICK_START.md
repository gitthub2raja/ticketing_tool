# Quick Start Guide

Get the Ticketing Tool up and running in minutes!

## Prerequisites

### Required
- **Docker** (version 20.10 or higher)
- **Docker Compose** (version 2.0 or higher)
- **4GB RAM** minimum (8GB recommended)
- **10GB free disk space**

### Platform-Specific Installation

#### Linux (Ubuntu/Debian)
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Add user to docker group (optional, to avoid sudo)
sudo usermod -aG docker $USER
newgrp docker
```

#### macOS
```bash
# Install Docker Desktop (includes Docker Compose)
# Download from: https://www.docker.com/products/docker-desktop

# Or use Homebrew
brew install --cask docker
```

#### Windows
1. Download **Docker Desktop** from https://www.docker.com/products/docker-desktop
2. Install and restart your computer
3. Enable WSL 2 if prompted

### Verify Installation
```bash
# Check Docker version
docker --version

# Check Docker Compose version
docker compose version

# Test Docker
docker run hello-world
```

## Installation

### 1. Clone or Navigate to Project
```bash
cd /home/raja/ticketing_tool
```

### 2. Start All Services
```bash
docker compose up -d --build
```

This will:
- Build frontend and backend containers
- Start MongoDB database
- Start FastAPI backend
- Start React frontend
- Start Nginx reverse proxy

### 3. Wait for Services to Start
```bash
# Check status
docker compose ps

# View logs
docker compose logs -f backend
```

Wait until all services show as "healthy" or "running".

### 4. Access the Application

Once all services are healthy, access:

- **Frontend (Web UI)**: http://localhost
- **Backend API**: http://localhost/api
- **API Documentation**: http://localhost/api/docs (Interactive Swagger UI)
- **MongoDB**: localhost:27018
- **MongoDB Compass**: Connect to `mongodb://mongoadmin:mongopassword@localhost:27018/ticketing_tool?authSource=admin`

**Note**: To ensure all collections are visible in MongoDB Compass (even when empty), run:
```bash
docker compose exec backend python init_all_collections.py
```

### 5. Verify Services

```bash
# Check all services status
docker compose ps

# Expected output:
# - ticketing_backend: Up (healthy)
# - ticketing_frontend: Up
# - ticketing_mongodb: Up (healthy)
# - ticketing_nginx: Up (healthy)

# Test backend health
curl http://localhost/api/health

# Should return: {"status":"healthy"}
```

## First-Time Setup

### Create Demo Data (Recommended for First Run)

This creates sample organizations, users, departments, categories, and tickets:

```bash
docker compose exec backend python create_demo_data.py
```

**Output**: You should see messages like:
```
🚀 Starting demo data creation...
📦 Clearing existing collections...
🏢 Creating organizations...
✅ Created 2 organizations
...
✅ Demo data creation complete!
```

### Default Login Credentials

After running the demo data script, use these credentials:

- **Email**: `admin@example.com`
- **Password**: `Admin123!`

**User Roles Available**:
- **Admin**: Full access to all features
- **Agent**: Can manage assigned tickets
- **User**: Can create and view own tickets
- **Department Head**: Can manage department tickets

### Create Additional Users

1. Login as admin
2. Navigate to **Admin → Users**
3. Click **+ Create User**
4. Fill in user details and assign role

## Common Commands

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mongodb
```

### Restart Services
```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart backend
```

### Stop Services
```bash
docker compose down
```

### Rebuild After Code Changes
```bash
docker compose up -d --build
```

## Troubleshooting

### Service Won't Start

#### Backend Not Starting
```bash
# Check detailed logs
docker compose logs backend

# Common issues and solutions:

# 1. MongoDB not ready (wait 30-60 seconds)
# Solution: Wait for MongoDB to be healthy, then restart backend
docker compose restart backend

# 2. Port 5000 already in use
# Solution: Stop the process using port 5000 or change port in docker-compose.yml
sudo lsof -i :5000  # Find process
kill -9 <PID>       # Kill process

# 3. Missing environment variables
# Solution: Check .env file exists in backend/ directory
ls -la backend/.env

# 4. Python import errors
# Solution: Rebuild the container
docker compose up -d --build backend
```

#### Frontend Not Loading
```bash
# Check logs
docker compose logs frontend

# Common issues:

# 1. Backend not responding
# Solution: Ensure backend is healthy first
docker compose ps backend
docker compose restart frontend

# 2. Nginx configuration error
# Solution: Check nginx logs
docker compose logs nginx
docker compose restart nginx

# 3. Port 80 already in use
# Solution: Stop Apache/Nginx or change port
sudo systemctl stop apache2  # Ubuntu/Debian
sudo systemctl stop nginx    # If system nginx running
# Or change port in docker-compose.yml

# 4. Build errors
# Solution: Rebuild frontend
docker compose up -d --build frontend
```

#### MongoDB Connection Issues
```bash
# Check MongoDB status
docker compose ps mongodb

# Connect to MongoDB shell
docker compose exec mongodb mongosh -u mongoadmin -p mongopassword --authenticationDatabase admin ticketing_tool

# Test connection from backend
docker compose exec backend python -c "from app.db.database import init_db; import asyncio; asyncio.run(init_db()); print('✅ Connection successful')"

# Common issues:

# 1. MongoDB not accepting connections
# Solution: Wait 30 seconds, then restart
docker compose restart mongodb

# 2. Authentication failed
# Solution: Check credentials in docker-compose.yml match connection string

# 3. Database not found
# Solution: It will be created automatically on first use
```

### Login Issues

#### "Invalid email or password"
```bash
# Ensure demo data was created
docker compose exec backend python create_demo_data.py

# Verify user exists
docker compose exec mongodb mongosh -u mongoadmin -p mongopassword --authenticationDatabase admin ticketing_tool --eval "db.users.find({email: 'admin@example.com'}).pretty()"
```

#### "Session expired" or 401 errors
```bash
# Clear browser cache and localStorage
# In browser console:
localStorage.clear()
# Then refresh page and login again
```

### Performance Issues

#### Slow Response Times
```bash
# Check resource usage
docker stats

# Restart services
docker compose restart

# Check MongoDB indexes
docker compose exec mongodb mongosh -u mongoadmin -p mongopassword --authenticationDatabase admin ticketing_tool --eval "db.tickets.getIndexes()"
```

#### Out of Memory
```bash
# Check Docker memory limits
docker info | grep -i memory

# Increase Docker Desktop memory (macOS/Windows)
# Settings → Resources → Memory → Increase to 4GB+

# On Linux, ensure sufficient swap space
free -h
```

### Network Issues

#### Can't Access http://localhost
```bash
# Check if services are running
docker compose ps

# Check if ports are bound
netstat -tulpn | grep -E ':(80|443|5000|27018)'

# Try accessing via IP instead
# Find Docker network IP
docker network inspect ticketing_tool_ticketing_network
```

#### CORS Errors
```bash
# Check backend CORS settings
docker compose exec backend cat /app/app/core/config.py | grep CORS

# Verify frontend API URL
docker compose exec frontend cat /usr/share/nginx/html/.env 2>/dev/null || echo "Check frontend build"
```

## Development Workflow

### Hot Reload Setup

For faster development, the backend code is mounted as a volume:

```bash
# Backend changes are reflected immediately (no rebuild needed)
# Edit: backend/app/**/*.py
# Changes take effect after container restart or uvicorn auto-reload

# Frontend changes require rebuild
docker compose up -d --build frontend
```

### Making Changes

#### Backend Changes
```bash
# 1. Edit files in backend/app/
vim backend/app/api/v1/endpoints/tickets.py

# 2. Restart backend (or it will auto-reload if uvicorn --reload is enabled)
docker compose restart backend

# 3. Check logs to verify
docker compose logs -f backend
```

#### Frontend Changes
```bash
# 1. Edit files in frontend/src/
vim frontend/src/pages/Dashboard.jsx

# 2. Rebuild frontend
docker compose up -d --build frontend

# 3. Wait for build to complete (check logs)
docker compose logs -f frontend

# 4. Refresh browser
```

### Development Tips

1. **Use API Docs**: Visit http://localhost/api/docs to test endpoints
2. **Check Logs**: Always check logs when something doesn't work
3. **Database Access**: Use MongoDB Compass for visual database inspection
4. **Clear Cache**: Clear browser cache if UI changes don't appear

### Testing Changes

```bash
# Test backend endpoint
curl -X GET http://localhost/api/health \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test frontend build
docker compose exec frontend ls -la /usr/share/nginx/html/

# Check for errors
docker compose logs backend | grep -i error
docker compose logs frontend | grep -i error
```

## Project Structure

```
ticketing_tool/
├── frontend/          # React frontend
│   └── src/
│       ├── pages/     # Page components
│       ├── components/# Reusable components
│       ├── services/  # API calls
│       └── contexts/  # State management
├── backend/           # FastAPI backend
│   └── app/
│       ├── api/       # API endpoints
│       ├── db/        # Database layer
│       └── middleware/# Auth middleware
├── docker-compose.yml # Container orchestration
└── nginx-ssl.conf     # Nginx configuration
```

## Next Steps

### For Developers

1. **📖 Read Architecture Guide**: 
   - See `COMPLETE_ARCHITECTURE_GUIDE.md` for complete system overview
   - Understand how frontend, backend, and database connect

2. **🔍 Explore API**: 
   - Visit http://localhost/api/docs for interactive API documentation
   - Test endpoints directly from the browser
   - View request/response schemas

3. **✅ Review Implementation**: 
   - Check `IMPLEMENTATION_VERIFICATION.md` to see what's implemented
   - Verify code matches architecture guide

4. **🛠️ Customize**: 
   - Modify components in `frontend/src/components/`
   - Add endpoints in `backend/app/api/v1/endpoints/`
   - Update database schemas as needed

### For Administrators

1. **👥 User Management**: 
   - Create users via Admin → Users
   - Assign roles and departments
   - Configure permissions

2. **⚙️ System Configuration**: 
   - Set up email settings (Admin → Email Settings)
   - Configure SSO (Admin → SSO Configuration)
   - Manage API keys (Admin → API Keys)

3. **📊 Monitoring**: 
   - View analytics (Admin → Analytics)
   - Check reports (Reports page)
   - Monitor ticket metrics

### For End Users

1. **🎫 Create Tickets**: 
   - Navigate to Tickets → New Ticket
   - Fill in details and attach files
   - Submit for review

2. **📋 View Tickets**: 
   - See all tickets in Tickets page
   - Filter by status, priority, category
   - Search for specific tickets

3. **💬 Add Comments**: 
   - Open ticket details
   - Add comments and updates
   - Track ticket progress

## Additional Resources

### Documentation Files

- **📐 Architecture Guide**: `COMPLETE_ARCHITECTURE_GUIDE.md`
  - Complete system architecture
  - Code examples and flows
  - API reference

- **✅ Implementation Verification**: `IMPLEMENTATION_VERIFICATION.md`
  - Checklist of implemented features
  - Code verification status

- **🗄️ MongoDB Collections**: `MONGODB_COLLECTIONS.md`
  - Database schema reference
  - Collection names and structures

- **💾 Backup Guide**: `BACKUP_README.md`
  - How to backup and restore data
  - Automated backup scripts

- **🔄 Compass Refresh**: `COMPASS_REFRESH_GUIDE.md`
  - MongoDB Compass troubleshooting
  - Data visibility issues

### Useful Commands Reference

```bash
# Start everything
docker compose up -d

# Stop everything
docker compose down

# View all logs
docker compose logs -f

# Rebuild specific service
docker compose up -d --build backend

# Execute command in container
docker compose exec backend python script.py
docker compose exec mongodb mongosh -u mongoadmin -p mongopassword --authenticationDatabase admin

# Clean up (removes containers, networks, but keeps volumes)
docker compose down

# Full cleanup (removes everything including volumes)
docker compose down -v

# View resource usage
docker stats

# Check container health
docker compose ps
```

### Getting Help

1. **Check Logs First**: Most issues are visible in logs
2. **Review Documentation**: Check relevant .md files
3. **Verify Services**: Ensure all containers are healthy
4. **Test Connectivity**: Use curl or browser to test endpoints

### Common Tasks

```bash
# Reset admin password
docker compose exec backend python reset_admin_password.py

# Create fresh demo data
docker compose exec backend python create_demo_data.py

# Backup database
./backup_mongodb.sh

# Restore database
./restore_mongodb.sh backup_file.tar.gz

# View API documentation
open http://localhost/api/docs
```

---

## Quick Reference Card

| Task | Command |
|------|---------|
| Start services | `docker compose up -d` |
| Stop services | `docker compose down` |
| View logs | `docker compose logs -f [service]` |
| Restart service | `docker compose restart [service]` |
| Rebuild | `docker compose up -d --build` |
| Check status | `docker compose ps` |
| Access MongoDB | `docker compose exec mongodb mongosh -u mongoadmin -p mongopassword --authenticationDatabase admin` |
| Create demo data | `docker compose exec backend python create_demo_data.py` |

**URLs**:
- Frontend: http://localhost
- API: http://localhost/api
- API Docs: http://localhost/api/docs

**Default Login**:
- Email: `admin@example.com`
- Password: `Admin123!`

---

Happy coding! 🚀

For questions or issues, check the troubleshooting section above or review the detailed documentation files.

