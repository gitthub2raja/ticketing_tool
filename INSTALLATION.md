# Ticketing Tool - Complete Installation Guide

This comprehensive guide covers installation, configuration, troubleshooting, and maintenance of the Ticketing Tool.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Installation Methods](#installation-methods)
3. [Nginx Setup](#nginx-setup)
4. [Service Management](#service-management)
5. [Uninstallation](#uninstallation)
6. [Troubleshooting](#troubleshooting)
7. [Common Issues & Fixes](#common-issues--fixes)

---

## Quick Start

### Automated Installation (Recommended)

```bash
cd /path/to/ticketing_tool
sudo ./install.sh
```

The script will:
- Install Node.js, npm, PM2, MongoDB (optional)
- Configure MongoDB connection
- Install dependencies
- Build frontend
- Initialize database
- Create admin user
- Start backend with PM2
- Set up nginx (optional)

### After Installation

1. **Access the application**: http://localhost (with nginx) or http://localhost:3000 (without nginx)
2. **Login**: Use admin credentials created during installation
3. **Configure**: Set up email settings in Admin → Email Settings

---

## Installation Methods

### Method 1: Automated Script (Recommended)

```bash
sudo ./install.sh
```

**Features:**
- Automatic dependency installation
- Environment detection
- Interactive configuration
- PM2 process management
- Optional nginx setup

### Method 2: Interactive Wizard

```bash
node install-wizard.js
```

**Features:**
- Step-by-step guided installation
- GLPI-style workflow
- Interactive prompts
- Configuration validation

### Method 3: Manual Installation

See detailed manual steps in the [Manual Installation](#manual-installation) section below.

---

## Nginx Setup

### Quick Setup

```bash
sudo ./setup-nginx.sh
```

### What Nginx Setup Does

1. Installs nginx (if not installed)
2. Fixes common configuration issues (zabbix.conf)
3. Creates nginx configuration
4. Serves frontend from `dist/` folder
5. Proxies `/api` to backend on port 5000
6. Enables SPA routing
7. Sets up caching and compression
8. Starts and enables nginx

### Manual Nginx Setup

1. **Fix permissions**:
   ```bash
   sudo chown -R www-data:www-data dist/
   sudo chmod -R 755 dist/
   ```

2. **Copy configuration**:
```bash
sudo cp installation_files/nginx-ticketing.conf /etc/nginx/sites-available/ticketing-tool
```
   sudo ln -s /etc/nginx/sites-available/ticketing-tool /etc/nginx/sites-enabled/
   ```

3. **Test and reload**:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### Nginx Configuration

- **Frontend**: Served from `dist/` folder on port 80
- **Backend API**: Proxied from `/api` to `http://localhost:5000/api`
- **Access URL**: http://localhost (no port needed)

---

## Service Management

### PM2 Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs
pm2 logs ticketing-backend
pm2 logs ticketing-frontend

# Restart services
pm2 restart all
pm2 restart ticketing-backend

# Stop services
pm2 stop all
pm2 stop ticketing-backend

# Delete services
pm2 delete ticketing-backend

# Save configuration
pm2 save
```

### Nginx Commands

```bash
# Check status
sudo systemctl status nginx

# Start/Stop/Restart
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx
sudo systemctl reload nginx

# Test configuration
sudo nginx -t

# View logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### MongoDB Commands

```bash
# Check status
sudo systemctl status mongod

# Start/Stop
sudo systemctl start mongod
sudo systemctl stop mongod

# Connect
mongosh mongodb://localhost:27017
```

---

## Troubleshooting

### Check Service Status

```bash
# Backend
pm2 status
curl http://localhost:5000/api/health

# Frontend (if using PM2)
pm2 status ticketing-frontend

# Nginx
sudo systemctl status nginx
curl http://localhost
```

### View Logs

```bash
# PM2 logs
pm2 logs --lines 50

# Nginx logs
sudo tail -f /var/log/nginx/error.log

# Backend logs
pm2 logs ticketing-backend --lines 50
```

---

## Uninstallation

### Automated Uninstall (Recommended)

```bash
sudo ./uninstall.sh
```

**Options:**
- `--full` - Remove everything including node_modules, .env files, and dist folder
- `--keep-data` - Keep MongoDB data (default: ask)
- `--remove-nginx` - Remove nginx configuration (default: ask)
- `--yes` - Skip all confirmation prompts

**Examples:**
```bash
# Standard uninstall (asks for confirmation)
sudo ./uninstall.sh

# Full uninstall (removes everything)
sudo ./uninstall.sh --full --yes

# Uninstall but keep MongoDB data
sudo ./uninstall.sh --keep-data

# Uninstall and remove nginx config
sudo ./uninstall.sh --remove-nginx --yes
```

### What Gets Removed

**Always Removed:**
- PM2 processes (ticketing-backend, ticketing-frontend)
- PM2 startup configuration
- Systemd service (if created)
- Logs directory
- PM2 ecosystem config files

**Optional (with confirmation or --full flag):**
- Nginx configuration
- Frontend build (dist folder)
- node_modules (frontend and backend)
- .env files (backend and frontend)
- MongoDB database (only with explicit flag)

### Manual Uninstall Steps

If you prefer to uninstall manually:

```bash
# 1. Stop and remove PM2 processes
pm2 stop ticketing-backend
pm2 delete ticketing-backend
pm2 unstartup
pm2 save --force

# 2. Remove systemd service (if exists)
sudo systemctl stop ticketing-tool
sudo systemctl disable ticketing-tool
sudo rm /etc/systemd/system/ticketing-tool.service
sudo systemctl daemon-reload

# 3. Remove nginx configuration
sudo rm /etc/nginx/sites-enabled/ticketing-tool
sudo rm /etc/nginx/sites-available/ticketing-tool
sudo nginx -t
sudo systemctl reload nginx

# 4. Remove logs
rm -rf logs/

# 5. Remove build artifacts (optional)
rm -rf dist/

# 6. Remove dependencies (optional)
rm -rf node_modules/ server/node_modules/

# 7. Remove configuration files (optional)
rm -f server/.env .env

# 8. Remove MongoDB data (optional, requires MongoDB access)
mongosh ticketing_tool --eval "db.dropDatabase()"
```

### After Uninstallation

To reinstall:
```bash
sudo ./install.sh
```

---

## Quick Fix for "Application Not Loading"

If the application shows "500 Internal Server Error" or "Permission denied" errors:

```bash
# Run the comprehensive fix script (RECOMMENDED)
sudo ./installation_files/fix-nginx-permissions.sh
```

This script fixes:
- Parent directory permissions (nginx needs execute to traverse paths)
- Dist folder ownership and permissions
- Nginx configuration
- Reloads nginx service

### Manual Fix (if script doesn't work)

```bash
# 1. Fix parent directory permissions (CRITICAL for /home paths)
sudo chmod 755 /home
sudo chmod 755 /home/raja
sudo chmod 755 /home/raja/Desktop
sudo chmod 755 /home/raja/Desktop/new_project
sudo chmod 755 /home/raja/Desktop/new_project/ticketing_tool

# 2. Fix dist folder permissions
sudo chown -R www-data:www-data dist/
sudo chmod -R 755 dist/
sudo find dist/ -type f -exec chmod 644 {} \;
sudo find dist/ -type d -exec chmod 755 {} \;

# 3. Alternative: Add www-data to your group
sudo usermod -a -G raja www-data
sudo chmod g+x /home/raja/Desktop/new_project/ticketing_tool
sudo chgrp -R raja dist/
sudo chmod -R g+r dist/

# 4. Update nginx config
sudo cp installation_files/nginx-ticketing.conf /etc/nginx/sites-available/ticketing-tool
sudo nginx -t

# 5. Reload nginx
sudo systemctl reload nginx

# 6. Check nginx error log
sudo tail -20 /var/log/nginx/error.log
```

## Common Issues & Fixes

### 1. Nginx 500 Internal Server Error

**Symptoms**: Browser shows "500 Internal Server Error"

**Causes**:
- Permission issues (nginx can't read dist folder)
- Invalid nginx configuration
- Backend not running

**Fix**:
```bash
# Automated fix
sudo ./installation_files/fix-nginx-permissions.sh

# Manual fix
sudo chown -R www-data:www-data dist/
sudo chmod -R 755 dist/
sudo cp installation_files/nginx-ticketing.conf /etc/nginx/sites-available/ticketing-tool
sudo nginx -t
sudo systemctl reload nginx
```

### 2. MongoDB Connection Error

**Symptoms**: `getaddrinfo EAI_AGAIN` or authentication failed

**Causes**:
- Unencoded special characters in password (like `@`)
- Wrong credentials
- MongoDB not running

**Fix**:
```bash
# Fix password encoding in .env
# Change: DBPassword@2k25
# To:     DBPassword%402k25

# Or recreate MongoDB user
mongosh mongodb://localhost:27017/admin
use admin
db.createUser({
  user: "admin",
  pwd: "DBPassword@2k25",
  roles: [{role: "readWrite", db: "ticketing_tool"}]
})
```

### 3. PM2 Config Error (ERR_REQUIRE_ESM)

**Symptoms**: `ecosystem.config.js malformated` error

**Cause**: Project uses ES modules but PM2 expects CommonJS

**Fix**:
```bash
# Rename to .cjs extension
mv ecosystem.config.js installation_files/ecosystem.config.cjs

# Update PM2 start command
pm2 start installation_files/ecosystem.config.cjs
```

### 4. Invalid Credentials Error

**Symptoms**: Login fails even with correct password

**Causes**:
- User doesn't exist in database
- Wrong email/password
- Database connection issue

**Fix**:
```bash
# Check if user exists
cd server
node -e "import('./config/database.js').then(m => m.default()).then(() => import('mongoose')).then(m => m.default.connection.db.collection('users').findOne({email: 'admin@example.com'}).then(u => console.log(u ? 'User exists' : 'User not found')))"

# Create admin user manually
node scripts/create-admin-user.js
```

### 5. Frontend Not Loading

**Symptoms**: Blank page or 404 errors

**Causes**:
- Frontend not built
- Wrong API URL configuration
- Nginx not serving files correctly

**Fix**:
```bash
# Rebuild frontend
npm run build

# Check .env file
cat .env
# Should have: VITE_API_URL=/api (for nginx) or VITE_API_URL=http://localhost:5000/api (direct)

# Check nginx
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

### 6. Backend Not Starting

**Symptoms**: PM2 shows "errored" or backend not responding

**Causes**:
- Port 5000 already in use
- MongoDB connection failed
- Missing environment variables

**Fix**:
```bash
# Check if port is in use
netstat -tuln | grep 5000

# Check backend logs
pm2 logs ticketing-backend --lines 50

# Check .env file exists
ls -la server/.env

# Restart backend
pm2 restart ticketing-backend
```

### 7. Nginx Zabbix Configuration Error

**Symptoms**: `nginx: configuration file test failed` - zabbix.conf error

**Fix**:
```bash
# Remove broken symlink
sudo rm /etc/nginx/conf.d/zabbix.conf

# Comment out include
sudo sed -i 's|include /etc/nginx/conf.d/zabbix.conf;|# include /etc/nginx/conf.d/zabbix.conf;|g' /etc/nginx/nginx.conf

# Test
sudo nginx -t
```

---

## Manual Installation

### Prerequisites

- Node.js 16+ and npm
- MongoDB 4.4+ (or MongoDB Atlas)
- PM2 (optional but recommended)

### Step-by-Step

1. **Install Node.js**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Install PM2**:
   ```bash
   sudo npm install -g pm2
   pm2 startup
   ```

3. **Install MongoDB** (if local):
   ```bash
   # Ubuntu/Debian
   wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
   sudo apt-get update
   sudo apt-get install -y mongodb-org
   sudo systemctl start mongod
   ```

4. **Configure Backend**:
   ```bash
   cd server
   npm install
   # Create .env file with MongoDB URI, JWT_SECRET, etc.
   ```

5. **Configure Frontend**:
   ```bash
   cd ..
   npm install
   # Create .env file with VITE_API_URL
   npm run build
   ```

6. **Initialize Database**:
   ```bash
   cd server
   node scripts/create-admin-user.js
   ```

7. **Start Services**:
   ```bash
   # Backend
   pm2 start installation_files/ecosystem.config.cjs
   pm2 save
   
   # Frontend (optional, if not using nginx)
   pm2 start installation_files/ecosystem.config.cjs
   ```

8. **Setup Nginx** (optional):
   ```bash
   sudo ./setup-nginx.sh
   ```

---

## Configuration Files

### Backend (.env)
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/ticketing_tool
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost
```

### Frontend (.env)
```env
# For nginx
VITE_API_URL=/api

# For direct access (without nginx)
VITE_API_URL=http://localhost:5000/api
```

### PM2 (ecosystem.config.cjs)
```javascript
module.exports = {
  apps: [
    {
      name: 'ticketing-backend',
      script: './server/server.js',
      // ... configuration
    }
  ]
};
```

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

1. Set `NODE_ENV=production`
2. Use MongoDB Atlas or secured MongoDB instance
3. Configure HTTPS with SSL certificates
4. Set up firewall rules
5. Configure proper CORS settings
6. Use environment variable management
7. Set up monitoring and logging
8. Configure backup strategy

---

## Support & Resources

- **Project README**: See `README.md` for application features
- **MongoDB Setup**: See `SETUP.md` for database-specific setup
- **Deployment**: See `DEPLOYMENT.md` for production deployment

---

## Quick Reference

### Access URLs
- **With Nginx**: http://localhost
- **Without Nginx**: http://localhost:3000 (frontend), http://localhost:5000 (backend API)

### Default Admin Credentials

After installation, you can create default admin credentials:

```bash
node installation_files/create-admin.js
```

This creates/updates admin user with:
- **Email**: admin@example.com
- **Password**: admin123

**Note**: Change the password immediately after first login for security.

### Important Commands
```bash
# Installation
sudo ./install.sh

# Nginx setup
sudo ./setup-nginx.sh

# Check status
pm2 status
sudo systemctl status nginx

# View logs
pm2 logs
sudo tail -f /var/log/nginx/error.log

# Restart services
pm2 restart all
sudo systemctl reload nginx
```

---

**Installation Guide Complete!** 🎉

For issues not covered here, check the logs and error messages for specific guidance.

