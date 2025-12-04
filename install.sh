#!/bin/bash

###############################################################################
# Ticketing Tool - Automated Installation Script
#
# This script automates the complete installation process including:
# - Node.js and npm installation
# - PM2 process manager installation
# - MongoDB connection configuration
# - Frontend and backend dependency installation
# - React app build
# - Backend service startup
# - Systemd/PM2 configuration for auto-start
#
# Usage: 
#   1. Copy this script to your project root directory
#   2. Run from project root: sudo ./install.sh [options]
#   OR
#   Run from any location: sudo /path/to/install.sh
#   (Script will auto-detect project root)
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration variables
# Detect project root directory (where server/ directory exists)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CURRENT_DIR="$(pwd)"

# Check if we're in the project root (has server/ directory)
if [ -d "$CURRENT_DIR/server" ] && [ -f "$CURRENT_DIR/package.json" ]; then
    INSTALL_DIR="$CURRENT_DIR"
elif [ -d "$SCRIPT_DIR/../server" ] && [ -f "$SCRIPT_DIR/../package.json" ]; then
    # Script is in project root, use parent
    INSTALL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
else
    # Try to find project root by looking for server/ directory
    INSTALL_DIR="$CURRENT_DIR"
    if [ ! -d "$INSTALL_DIR/server" ]; then
        echo -e "${RED}[ERROR]${NC} Cannot find project root directory."
        echo "Please run this script from the ticketing_tool project root directory"
        echo "or ensure the script is located in the project root."
        exit 1
    fi
fi

NODE_VERSION="20"
MONGO_HOST="${MONGO_HOST:-localhost}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_DB="${MONGO_DB:-ticketing_tool}"
BACKEND_PORT="${BACKEND_PORT:-5000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
USE_PM2="${USE_PM2:-true}"
USE_SYSTEMD="${USE_SYSTEMD:-false}"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "\n${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}\n"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_warning "Running as root. Some commands may need sudo."
    fi
}

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            OS=$ID
            OS_VERSION=$VERSION_ID
        else
            log_error "Cannot detect OS version"
            exit 1
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    else
        log_error "Unsupported OS: $OSTYPE"
        exit 1
    fi
    log_info "Detected OS: $OS $OS_VERSION"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install Node.js
install_nodejs() {
    log_step "Step 1: Installing Node.js and npm"
    
    if command_exists node; then
        NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VER" -ge 16 ]; then
            log_success "Node.js $(node -v) is already installed"
            return 0
        else
            log_warning "Node.js version is too old. Upgrading..."
        fi
    fi
    
    log_info "Installing Node.js ${NODE_VERSION}..."
    
    if [ "$OS" == "ubuntu" ] || [ "$OS" == "debian" ]; then
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [ "$OS" == "centos" ] || [ "$OS" == "rhel" ] || [ "$OS" == "fedora" ]; then
        curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | sudo bash -
        sudo yum install -y nodejs
    elif [ "$OS" == "macos" ]; then
        if command_exists brew; then
            brew install node@${NODE_VERSION}
        else
            log_error "Homebrew not found. Please install Node.js manually."
            exit 1
        fi
    else
        log_error "Unsupported OS for automatic Node.js installation"
        log_info "Please install Node.js ${NODE_VERSION}+ manually"
        exit 1
    fi
    
    log_success "Node.js $(node -v) and npm $(npm -v) installed"
}

# Install PM2
install_pm2() {
    log_step "Step 2: Installing PM2 Process Manager"
    
    if command_exists pm2; then
        log_success "PM2 $(pm2 -v) is already installed"
        return 0
    fi
    
    log_info "Installing PM2 globally..."
    sudo npm install -g pm2
    
    # Setup PM2 startup script
    log_info "Configuring PM2 startup script..."
    sudo pm2 startup systemd -u $USER --hp $HOME || true
    
    log_success "PM2 installed and configured"
}

# Install MongoDB (optional - for local installation)
install_mongodb() {
    log_step "Step 3: MongoDB Setup"
    
    if command_exists mongod; then
        log_success "MongoDB is already installed"
        return 0
    fi
    
    log_info "MongoDB not found locally."
    read -p "Do you want to install MongoDB locally? (y/n) [n]: " install_mongo
    if [[ "$install_mongo" =~ ^[Yy]$ ]]; then
        log_info "Installing MongoDB..."
        
        if [ "$OS" == "ubuntu" ] || [ "$OS" == "debian" ]; then
            wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
            echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
            sudo apt-get update
            sudo apt-get install -y mongodb-org
            sudo systemctl enable mongod
            sudo systemctl start mongod
        elif [ "$OS" == "centos" ] || [ "$OS" == "rhel" ] || [ "$OS" == "fedora" ]; then
            cat > /tmp/mongodb-org-7.0.repo <<EOF
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/\$releasever/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc
EOF
            sudo mv /tmp/mongodb-org-7.0.repo /etc/yum.repos.d/
            sudo yum install -y mongodb-org
            sudo systemctl enable mongod
            sudo systemctl start mongod
        else
            log_warning "Automatic MongoDB installation not supported for this OS"
            log_info "Please install MongoDB manually or use MongoDB Atlas"
        fi
        
        log_success "MongoDB installed and started"
    else
        log_info "Skipping MongoDB installation. Using existing MongoDB or MongoDB Atlas."
    fi
}

# Configure MongoDB connection
configure_mongodb() {
    log_step "Step 4: MongoDB Connection Configuration"
    
    log_info "MongoDB Connection Setup"
    read -p "MongoDB host [$MONGO_HOST]: " input_host
    MONGO_HOST=${input_host:-$MONGO_HOST}
    
    read -p "MongoDB port [$MONGO_PORT]: " input_port
    MONGO_PORT=${input_port:-$MONGO_PORT}
    
    read -p "Database name [$MONGO_DB]: " input_db
    MONGO_DB=${input_db:-$MONGO_DB}
    
    read -p "Require authentication? (y/n) [n]: " require_auth
    
    if [[ "$require_auth" =~ ^[Yy]$ ]]; then
        read -p "MongoDB username: " mongo_user
        read -sp "MongoDB password: " mongo_pass
        echo
        read -p "Authentication database [admin]: " auth_db
        auth_db=${auth_db:-admin}
        
        # URL-encode the password to handle special characters
        if command_exists python3; then
            mongo_pass_encoded=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$mongo_pass', safe=''))")
        elif command_exists node; then
            mongo_pass_encoded=$(node -e "console.log(encodeURIComponent('$mongo_pass'))")
        else
            # Basic encoding for common characters if no tools available
            mongo_pass_encoded=$(echo "$mongo_pass" | sed 's/@/%40/g; s/:/%3A/g; s/#/%23/g; s/\[/%5B/g; s/\]/%5D/g')
        fi
        
        MONGODB_URI="mongodb://${mongo_user}:${mongo_pass_encoded}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=${auth_db}"
    else
        MONGODB_URI="mongodb://${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}"
    fi
    
    log_success "MongoDB URI configured"
}

# Create backend .env file
create_backend_env() {
    log_step "Step 5: Creating Backend Configuration"
    
    if [ ! -d "$INSTALL_DIR/server" ]; then
        log_error "Server directory not found: $INSTALL_DIR/server"
        exit 1
    fi
    
    cd "$INSTALL_DIR/server"
    
    # Generate JWT secret
    JWT_SECRET=$(openssl rand -hex 64 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 128 | head -n 1)
    
    # Create .env file
    cat > .env <<EOF
# Ticketing Tool - Backend Configuration
# Generated by install.sh

# Server Configuration
PORT=${BACKEND_PORT}
NODE_ENV=production

# MongoDB Configuration
MONGODB_URI=${MONGODB_URI}

# JWT Configuration
JWT_SECRET=${JWT_SECRET}

# Frontend URL
FRONTEND_URL=http://localhost:${FRONTEND_PORT}

# Email Configuration (Optional - configure later)
# SMTP_HOST=
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=
# SMTP_FROM=

# IMAP Configuration (Optional - configure later)
# IMAP_HOST=
# IMAP_PORT=993
# IMAP_USER=
# IMAP_PASS=
EOF
    
    log_success "Backend .env file created"
    cd "$INSTALL_DIR"
}

# Create frontend .env file
create_frontend_env() {
    log_step "Step 6: Creating Frontend Configuration"
    
    cd "$INSTALL_DIR"
    
    # Use relative API URL for nginx proxy
    cat > .env <<EOF
# Ticketing Tool - Frontend Configuration
# Generated by install.sh

VITE_API_URL=/api
EOF
    
    log_success "Frontend .env file created (configured for nginx proxy)"
}

# Install backend dependencies
install_backend_deps() {
    log_step "Step 7: Installing Backend Dependencies"
    
    cd "$INSTALL_DIR/server"
    log_info "Installing backend npm packages..."
    npm install --production
    
    log_success "Backend dependencies installed"
    cd "$INSTALL_DIR"
}

# Install frontend dependencies
install_frontend_deps() {
    log_step "Step 8: Installing Frontend Dependencies"
    
    cd "$INSTALL_DIR"
    log_info "Installing frontend npm packages..."
    npm install
    
    log_success "Frontend dependencies installed"
}

# Build frontend
build_frontend() {
    log_step "Step 9: Building Frontend Application"
    
    cd "$INSTALL_DIR"
    log_info "Building React application..."
    npm run build
    
    log_success "Frontend build completed"
}

# Test MongoDB connection
test_mongodb_connection() {
    log_info "Testing MongoDB connection..."
    
    cd "$INSTALL_DIR/server"
    
    # Load .env to get MONGODB_URI
    if [ -f .env ]; then
        export $(grep -v '^#' .env | xargs)
    fi
    
    MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/ticketing_tool}"
    
    # Create test script
    cat > test-connection.js <<'TESTSCRIPT'
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ticketing_tool';

// Validate URI format
if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
  console.error('ERROR: Invalid MongoDB URI format');
  process.exit(1);
}

const options = {};

mongoose.connect(mongoUri, options)
  .then(() => {
    console.log('SUCCESS');
    mongoose.disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error('ERROR:', error.message);
    process.exit(1);
  });
TESTSCRIPT
    
    if node test-connection.js 2>&1 | grep -q "SUCCESS"; then
        rm test-connection.js
        log_success "MongoDB connection test passed"
        return 0
    else
        ERROR_MSG=$(node test-connection.js 2>&1 | grep "ERROR" || echo "Connection failed")
        rm test-connection.js
        log_error "MongoDB connection test failed: $ERROR_MSG"
        log_error "Please check your MongoDB connection settings in server/.env"
        return 1
    fi
}

# Initialize database and create admin user
initialize_database() {
    log_step "Step 10: Database Initialization"
    
    cd "$INSTALL_DIR"
    
    # Test connection first
    if ! test_mongodb_connection; then
        log_error "Cannot proceed with database initialization. Please fix MongoDB connection first."
        exit 1
    fi
    
    log_info "Initializing database and creating admin user..."
    
    # Ask if user wants default admin or custom
    echo ""
    log_info "Admin User Creation Options:"
    echo "  1. Use default admin credentials (admin@example.com / admin123)"
    echo "  2. Create custom admin user"
    read -p "Choose option [1]: " admin_option
    admin_option=${admin_option:-1}
    
    if [ "$admin_option" = "1" ]; then
        # Use default admin creation script
        log_info "Creating default admin user..."
        
        if [ -f "$INSTALL_DIR/installation_files/create-admin.js" ]; then
            if node "$INSTALL_DIR/installation_files/create-admin.js"; then
                log_success "Default admin user created successfully"
                echo ""
                log_info "Default Admin Credentials:"
                log_info "  Email: admin@example.com"
                log_info "  Password: admin123"
                log_warning "Please change the default password after first login!"
                cd "$INSTALL_DIR"
                return 0
            else
                log_error "Failed to create default admin user"
                log_info "Falling back to custom admin creation..."
                admin_option="2"
            fi
        else
            log_warning "create-admin.js not found at installation_files/create-admin.js"
            log_info "Falling back to custom admin creation..."
            admin_option="2"
        fi
    fi
    
    if [ "$admin_option" = "2" ]; then
        # Create custom admin user
        log_info "Creating custom admin user..."
        
        # Create admin user script
        read -p "Admin email [admin@example.com]: " admin_email
        admin_email=${admin_email:-admin@example.com}
        
        read -p "Admin name [Administrator]: " admin_name
        admin_name=${admin_name:-Administrator}
        
        read -sp "Admin password (min 8 characters): " admin_password
        echo
        read -sp "Confirm admin password: " admin_password_confirm
        echo
        
        if [ "$admin_password" != "$admin_password_confirm" ]; then
            log_error "Passwords do not match"
            exit 1
        fi
        
        if [ ${#admin_password} -lt 8 ]; then
            log_error "Password must be at least 8 characters"
            exit 1
        fi
        
        # Create initialization script
        cat > init-db.js <<'INITSCRIPT'
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';
import Organization from './models/Organization.js';

dotenv.config();

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ticketing_tool';
    
    // Validate MongoDB URI format
    if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
      throw new Error('Invalid MongoDB URI format. Must start with mongodb:// or mongodb+srv://');
    }
    
    const options = {};
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, options);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Connection error:', error.message);
    if (error.message.includes('getaddrinfo')) {
      console.error('DNS resolution failed. Please check:');
      console.error('  1. MongoDB hostname/IP is correct');
      console.error('  2. MongoDB service is running');
      console.error('  3. Network connectivity');
      console.error(`  4. Connection string: ${process.env.MONGODB_URI || 'Not set (using default)'}`);
    }
    process.exit(1);
  }
};

async function initialize() {
  await connectDB();
  
  try {
    // Create default organization
    let org = await Organization.findOne({ name: 'Default Organization' });
    if (!org) {
      org = await Organization.create({
        name: 'Default Organization',
        description: 'Default organization created during installation',
      });
      console.log('✓ Default organization created');
    }
    
    // Create admin user
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminName = process.env.ADMIN_NAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      admin = await User.create({
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        status: 'active',
        organization: org._id,
      });
      console.log(`✓ Admin user created: ${adminEmail}`);
    } else {
      console.log(`ℹ Admin user already exists: ${adminEmail}`);
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

initialize();
INITSCRIPT
        
        ADMIN_EMAIL="$admin_email" ADMIN_NAME="$admin_name" ADMIN_PASSWORD="$admin_password" node init-db.js
        rm init-db.js
        
        log_success "Database initialized and custom admin user created"
        echo ""
        log_info "Admin user created: $admin_email"
    fi
    
    cd "$INSTALL_DIR"
}

# Create PM2 ecosystem file
create_pm2_config() {
    log_step "Step 11: Creating PM2 Configuration"
    
    cd "$INSTALL_DIR"
    
    # Create installation_files directory if it doesn't exist
    mkdir -p "$INSTALL_DIR/installation_files"
    
    cat > "$INSTALL_DIR/installation_files/ecosystem.config.cjs" <<EOF
module.exports = {
  apps: [
    {
      name: 'ticketing-backend',
      script: './server/server.js',
      cwd: '$(pwd)',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: ${BACKEND_PORT}
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024'
    }
  ]
};
EOF
    
    # Create logs directory
    mkdir -p logs
    
    log_success "PM2 ecosystem file created"
}

# Start services with PM2
start_with_pm2() {
    log_step "Step 12: Starting Services with PM2"
    
    cd "$INSTALL_DIR"
    
    log_info "Starting backend with PM2..."
    if [ -f "$INSTALL_DIR/installation_files/ecosystem.config.cjs" ]; then
        pm2 start "$INSTALL_DIR/installation_files/ecosystem.config.cjs"
    elif [ -f "$INSTALL_DIR/ecosystem.config.cjs" ]; then
        pm2 start "$INSTALL_DIR/ecosystem.config.cjs"
    else
        log_error "ecosystem.config.cjs not found"
        exit 1
    fi
    pm2 save
    
    log_success "Backend started with PM2"
    log_info "Use 'pm2 status' to check service status"
    log_info "Use 'pm2 logs' to view logs"
    log_info "Use 'pm2 stop ticketing-backend' to stop the service"
}

# Create systemd service (alternative to PM2)
create_systemd_service() {
    log_step "Step 12: Creating Systemd Service"
    
    SERVICE_FILE="/etc/systemd/system/ticketing-tool.service"
    
    cat > /tmp/ticketing-tool.service <<EOF
[Unit]
Description=Ticketing Tool Backend Service
After=network.target mongod.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR/server
Environment="NODE_ENV=production"
Environment="PORT=${BACKEND_PORT}"
ExecStart=$(which node) server.js
Restart=always
RestartSec=10
StandardOutput=append:$INSTALL_DIR/logs/backend-out.log
StandardError=append:$INSTALL_DIR/logs/backend-error.log

[Install]
WantedBy=multi-user.target
EOF
    
    sudo mv /tmp/ticketing-tool.service "$SERVICE_FILE"
    sudo systemctl daemon-reload
    sudo systemctl enable ticketing-tool
    sudo systemctl start ticketing-tool
    
    log_success "Systemd service created and started"
    log_info "Use 'sudo systemctl status ticketing-tool' to check service status"
}

# Setup Nginx
setup_nginx() {
    log_step "Step 13: Setting Up Nginx"
    
    # Check if nginx is installed
    if ! command_exists nginx; then
        log_info "Installing nginx..."
        if [ "$OS" == "ubuntu" ] || [ "$OS" == "debian" ]; then
            sudo apt-get update
            sudo apt-get install -y nginx
        elif [ "$OS" == "centos" ] || [ "$OS" == "rhel" ] || [ "$OS" == "fedora" ]; then
            sudo yum install -y nginx
        else
            log_warning "Automatic nginx installation not supported for this OS"
            log_info "Please install nginx manually"
            return 1
        fi
        log_success "Nginx installed"
    else
        log_success "Nginx is already installed"
    fi
    
    # Fix zabbix.conf issue if it exists
    if [ -L "/etc/nginx/conf.d/zabbix.conf" ] && [ ! -f "/etc/zabbix/nginx.conf" ]; then
        log_info "Fixing broken zabbix.conf symlink..."
        sudo rm -f /etc/nginx/conf.d/zabbix.conf 2>/dev/null || true
    fi
    
    # Comment out zabbix include if it exists in nginx.conf
    if grep -q "include /etc/nginx/conf.d/zabbix.conf;" /etc/nginx/nginx.conf 2>/dev/null; then
        log_info "Commenting out zabbix.conf include..."
        sudo sed -i 's|include /etc/nginx/conf.d/zabbix.conf;|# include /etc/nginx/conf.d/zabbix.conf;|g' /etc/nginx/nginx.conf
    fi
    
    # Create nginx configuration
    log_info "Creating nginx configuration..."
    cd "$INSTALL_DIR"
    
    # Ensure nginx-ticketing.conf exists
    if [ ! -f "installation_files/nginx-ticketing.conf" ] && [ ! -f "nginx-ticketing.conf" ]; then
        log_warning "nginx-ticketing.conf not found, creating it..."
        cat > nginx-ticketing.conf <<NGINXCONF
upstream backend {
    server localhost:${BACKEND_PORT};
    keepalive 64;
}

server {
    listen 80;
    server_name localhost;

    root ${INSTALL_DIR}/dist;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        try_files \$uri \$uri/ /index.html;
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
    }

    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /health {
        proxy_pass http://backend/api/health;
        access_log off;
    }

    location = /favicon.ico {
        log_not_found off;
        access_log off;
    }

    location = /robots.txt {
        log_not_found off;
        access_log off;
    }
}
NGINXCONF
    fi
    
    # Copy configuration to nginx sites-available
    NGINX_CONF="$INSTALL_DIR/installation_files/nginx-ticketing.conf"
    if [ ! -f "$NGINX_CONF" ]; then
        NGINX_CONF="$INSTALL_DIR/nginx-ticketing.conf"
    fi
    sudo cp "$NGINX_CONF" "/etc/nginx/sites-available/ticketing-tool"
    log_success "Nginx configuration copied"
    
    # Create symlink
    if [ -L "/etc/nginx/sites-enabled/ticketing-tool" ]; then
        sudo rm "/etc/nginx/sites-enabled/ticketing-tool"
    fi
    sudo ln -s "/etc/nginx/sites-available/ticketing-tool" "/etc/nginx/sites-enabled/ticketing-tool"
    log_success "Nginx site enabled"
    
    # Remove default site if it exists
    if [ -L "/etc/nginx/sites-enabled/default" ]; then
        log_info "Removing default nginx site..."
        sudo rm "/etc/nginx/sites-enabled/default"
    fi
    
    # Test nginx configuration
    log_info "Testing nginx configuration..."
    if sudo nginx -t; then
        log_success "Nginx configuration is valid"
    else
        log_error "Nginx configuration has errors"
        return 1
    fi
    
    # Start or reload nginx
    if systemctl is-active --quiet nginx; then
        log_info "Reloading nginx..."
        sudo systemctl reload nginx
    else
        log_info "Starting nginx..."
        sudo systemctl start nginx
    fi
    
    # Enable nginx to start on boot
    sudo systemctl enable nginx
    
    log_success "Nginx configured and started"
    log_info "Application will be accessible at http://localhost"
}

# Main installation function
main() {
    echo -e "${CYAN}"
    echo "═══════════════════════════════════════════════════════════"
    echo "  Ticketing Tool - Automated Installation Script"
    echo "═══════════════════════════════════════════════════════════"
    echo -e "${NC}\n"
    
    log_info "Project root directory: $INSTALL_DIR"
    
    # Verify project structure
    if [ ! -d "$INSTALL_DIR/server" ]; then
        log_error "Server directory not found at $INSTALL_DIR/server"
        log_error "Please run this script from the ticketing_tool project root directory"
        exit 1
    fi
    
    if [ ! -f "$INSTALL_DIR/package.json" ]; then
        log_error "package.json not found at $INSTALL_DIR/package.json"
        log_error "Please run this script from the ticketing_tool project root directory"
        exit 1
    fi
    
    check_root
    detect_os
    
    install_nodejs
    install_pm2
    install_mongodb
    configure_mongodb
    create_backend_env
    create_frontend_env
    install_backend_deps
    install_frontend_deps
    build_frontend
    initialize_database
    create_pm2_config
    
    if [ "$USE_PM2" == "true" ]; then
        start_with_pm2
    elif [ "$USE_SYSTEMD" == "true" ]; then
        create_systemd_service
    else
        read -p "Start backend with PM2? (y/n) [y]: " use_pm2
        if [[ "$use_pm2" =~ ^[Yy]$ ]] || [ -z "$use_pm2" ]; then
            start_with_pm2
        else
            create_systemd_service
        fi
    fi
    
    # Setup nginx
    read -p "Set up nginx to serve the application? (y/n) [y]: " setup_nginx
    if [[ "$setup_nginx" =~ ^[Yy]$ ]] || [ -z "$setup_nginx" ]; then
        setup_nginx
        # Fix loading issues after nginx setup
        fix_loading_issues
    else
        log_info "Skipping nginx setup. You can set it up later with: sudo ./setup-nginx.sh"
    fi
    
    # Final summary
    log_step "Installation Complete!"
    
    echo -e "${GREEN}✓${NC} Node.js and npm installed"
    echo -e "${GREEN}✓${NC} PM2 installed and configured"
    echo -e "${GREEN}✓${NC} Dependencies installed"
    echo -e "${GREEN}✓${NC} Frontend built"
    echo -e "${GREEN}✓${NC} Database initialized"
    echo -e "${GREEN}✓${NC} Admin user created"
    echo -e "${GREEN}✓${NC} Backend service started"
    
    if systemctl is-active --quiet nginx 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Nginx configured and running"
        echo -e "\n${CYAN}Next Steps:${NC}"
        echo "1. Access the application at: http://localhost"
        echo "2. Login with admin credentials"
        echo "3. Configure email settings in the admin panel"
        echo "4. Review INSTALLATION.md for additional configuration"
    else
        echo -e "\n${CYAN}Next Steps:${NC}"
        echo "1. Access the application at: http://localhost:${FRONTEND_PORT}"
        echo "2. Or set up nginx: sudo ./setup-nginx.sh"
        echo "3. Login with admin credentials"
        echo "4. Configure email settings in the admin panel"
        echo "5. Review INSTALLATION.md for additional configuration"
    fi
    
    echo -e "\n${CYAN}Useful Commands:${NC}"
    echo "  pm2 status              - Check service status"
    echo "  pm2 logs                - View logs"
    echo "  pm2 restart ticketing-backend - Restart service"
    echo "  pm2 stop ticketing-backend    - Stop service"
    
    echo -e "\n${GREEN}Installation completed successfully!${NC}\n"
}

# Run main function
main "$@"

