#!/bin/bash

###############################################################################
# Ticketing Tool - Uninstall Script
#
# This script removes the Ticketing Tool installation including:
# - PM2 processes and configuration
# - Nginx configuration
# - Logs and temporary files
# - Optional: node_modules, .env files, dist folder
# - Optional: MongoDB data
#
# Usage: 
#   sudo ./uninstall.sh [options]
#
# Options:
#   --full          Remove everything including node_modules, .env, dist
#   --keep-data     Keep MongoDB data (default: ask)
#   --remove-nginx  Remove nginx configuration (default: ask)
#   --yes           Skip all confirmation prompts
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
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CURRENT_DIR="$(pwd)"

# Check if we're in the project root
if [ -d "$CURRENT_DIR/server" ] && [ -f "$CURRENT_DIR/package.json" ]; then
    INSTALL_DIR="$CURRENT_DIR"
elif [ -d "$SCRIPT_DIR/server" ] && [ -f "$SCRIPT_DIR/package.json" ]; then
    INSTALL_DIR="$SCRIPT_DIR"
else
    INSTALL_DIR="$CURRENT_DIR"
    if [ ! -d "$INSTALL_DIR/server" ]; then
        echo -e "${RED}[ERROR]${NC} Cannot find project root directory."
        echo "Please run this script from the ticketing_tool project root directory"
        exit 1
    fi
fi

# Flags
FULL_REMOVE=false
KEEP_DATA=true
REMOVE_NGINX=false
SKIP_CONFIRM=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --full)
            FULL_REMOVE=true
            shift
            ;;
        --keep-data)
            KEEP_DATA=true
            shift
            ;;
        --remove-nginx)
            REMOVE_NGINX=true
            shift
            ;;
        --yes)
            SKIP_CONFIRM=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--full] [--keep-data] [--remove-nginx] [--yes]"
            exit 1
            ;;
    esac
done

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

# Confirmation prompt
confirm() {
    if [ "$SKIP_CONFIRM" = true ]; then
        return 0
    fi
    read -p "$1 (y/n) [n]: " response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        return 0
    else
        return 1
    fi
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Stop and remove PM2 processes
remove_pm2() {
    log_step "Step 1: Removing PM2 Processes"
    
    if ! command_exists pm2; then
        log_info "PM2 not installed, skipping..."
        return
    fi
    
    cd "$INSTALL_DIR"
    
    # Stop all ticketing processes
    log_info "Stopping PM2 processes..."
    pm2 stop ticketing-backend 2>/dev/null || true
    pm2 stop ticketing-frontend 2>/dev/null || true
    pm2 delete ticketing-backend 2>/dev/null || true
    pm2 delete ticketing-frontend 2>/dev/null || true
    
    # Remove from PM2 startup
    log_info "Removing PM2 from startup..."
    pm2 unstartup 2>/dev/null || true
    
    # Save PM2 configuration
    pm2 save --force 2>/dev/null || true
    
    log_success "PM2 processes removed"
}

# Remove systemd service
remove_systemd_service() {
    log_step "Step 2: Removing Systemd Service"
    
    SERVICE_FILE="/etc/systemd/system/ticketing-tool.service"
    
    if [ -f "$SERVICE_FILE" ]; then
        log_info "Stopping and disabling systemd service..."
        sudo systemctl stop ticketing-tool 2>/dev/null || true
        sudo systemctl disable ticketing-tool 2>/dev/null || true
        sudo rm -f "$SERVICE_FILE"
        sudo systemctl daemon-reload
        log_success "Systemd service removed"
    else
        log_info "Systemd service not found, skipping..."
    fi
}

# Remove nginx configuration
remove_nginx_config() {
    log_step "Step 3: Removing Nginx Configuration"
    
    if ! command_exists nginx; then
        log_info "Nginx not installed, skipping..."
        return
    fi
    
    NGINX_CONF="/etc/nginx/sites-available/ticketing-tool"
    NGINX_ENABLED="/etc/nginx/sites-enabled/ticketing-tool"
    
    if [ -f "$NGINX_CONF" ] || [ -L "$NGINX_ENABLED" ]; then
        if [ "$SKIP_CONFIRM" = false ]; then
            if ! confirm "Remove nginx configuration for Ticketing Tool?"; then
                log_info "Keeping nginx configuration"
                return
            fi
        fi
        
        log_info "Removing nginx configuration..."
        
        # Remove symlink
        if [ -L "$NGINX_ENABLED" ]; then
            sudo rm -f "$NGINX_ENABLED"
        fi
        
        # Remove config file
        if [ -f "$NGINX_CONF" ]; then
            sudo rm -f "$NGINX_CONF"
        fi
        
        # Test and reload nginx
        if sudo nginx -t 2>/dev/null; then
            sudo systemctl reload nginx 2>/dev/null || true
            log_success "Nginx configuration removed"
        else
            log_warning "Nginx configuration removed but test failed. Please check manually."
        fi
    else
        log_info "Nginx configuration not found, skipping..."
    fi
}

# Remove logs
remove_logs() {
    log_step "Step 4: Removing Logs"
    
    cd "$INSTALL_DIR"
    
    if [ -d "logs" ]; then
        log_info "Removing logs directory..."
        rm -rf logs
        log_success "Logs removed"
    else
        log_info "Logs directory not found, skipping..."
    fi
}

# Remove build artifacts
remove_build_artifacts() {
    log_step "Step 5: Removing Build Artifacts"
    
    cd "$INSTALL_DIR"
    
    if [ -d "dist" ]; then
        if [ "$FULL_REMOVE" = true ] || confirm "Remove frontend build (dist folder)?"; then
            log_info "Removing dist folder..."
            rm -rf dist
            log_success "Build artifacts removed"
        else
            log_info "Keeping dist folder"
        fi
    else
        log_info "dist folder not found, skipping..."
    fi
    
    # Remove .next if exists (Next.js)
    if [ -d ".next" ]; then
        rm -rf .next
        log_info "Removed .next folder"
    fi
}

# Remove node_modules
remove_node_modules() {
    log_step "Step 6: Removing Dependencies"
    
    if [ "$FULL_REMOVE" = false ]; then
        if ! confirm "Remove node_modules (will need to run 'npm install' to reinstall)?"; then
            log_info "Keeping node_modules"
            return
        fi
    fi
    
    cd "$INSTALL_DIR"
    
    # Remove root node_modules
    if [ -d "node_modules" ]; then
        log_info "Removing root node_modules..."
        rm -rf node_modules
        log_success "Root node_modules removed"
    fi
    
    # Remove server node_modules
    if [ -d "server/node_modules" ]; then
        log_info "Removing server node_modules..."
        rm -rf server/node_modules
        log_success "Server node_modules removed"
    fi
}

# Remove .env files
remove_env_files() {
    log_step "Step 7: Removing Configuration Files"
    
    if [ "$FULL_REMOVE" = false ]; then
        if ! confirm "Remove .env files (will need to reconfigure)?"; then
            log_info "Keeping .env files"
            return
        fi
    fi
    
    cd "$INSTALL_DIR"
    
    # Remove backend .env
    if [ -f "server/.env" ]; then
        log_info "Removing server/.env..."
        rm -f server/.env
        log_success "Backend .env removed"
    fi
    
    # Remove frontend .env
    if [ -f ".env" ]; then
        log_info "Removing .env..."
        rm -f .env
        log_success "Frontend .env removed"
    fi
    
    # Remove .env.local, .env.production, etc.
    rm -f .env.local .env.production .env.development 2>/dev/null || true
    rm -f server/.env.local server/.env.production server/.env.development 2>/dev/null || true
    
    log_info "Configuration files removed"
}

# Remove PM2 ecosystem config
remove_pm2_config() {
    log_step "Step 8: Removing PM2 Configuration Files"
    
    cd "$INSTALL_DIR"
    
    if [ -f "installation_files/ecosystem.config.cjs" ]; then
        log_info "Removing PM2 ecosystem config..."
        rm -f installation_files/ecosystem.config.cjs
        log_success "PM2 config removed"
    fi
    
    if [ -f "ecosystem.config.cjs" ]; then
        rm -f ecosystem.config.cjs
        log_info "Removed root ecosystem.config.cjs"
    fi
}

# Remove MongoDB data (optional)
remove_mongodb_data() {
    log_step "Step 9: MongoDB Data"
    
    if [ "$KEEP_DATA" = true ]; then
        log_info "Keeping MongoDB data (use --remove-data to delete)"
        return
    fi
    
    if [ "$SKIP_CONFIRM" = false ]; then
        log_warning "This will DELETE all MongoDB data for this application!"
        if ! confirm "Are you sure you want to remove MongoDB data?"; then
            log_info "Keeping MongoDB data"
            return
        fi
    fi
    
    # Try to get database name from .env if exists
    DB_NAME="ticketing_tool"
    if [ -f "server/.env" ]; then
        DB_NAME=$(grep -i "MONGODB_URI" server/.env | sed -n 's/.*\/\([^/?]*\).*/\1/p' | head -1)
        if [ -z "$DB_NAME" ]; then
            DB_NAME="ticketing_tool"
        fi
    fi
    
    log_warning "Attempting to remove MongoDB database: $DB_NAME"
    log_info "This requires MongoDB connection. If MongoDB is not accessible, data will remain."
    
    if command_exists mongosh; then
        if mongosh --eval "use $DB_NAME; db.dropDatabase()" --quiet 2>/dev/null; then
            log_success "MongoDB database removed"
        else
            log_warning "Could not remove MongoDB database. You may need to remove it manually."
        fi
    elif command_exists mongo; then
        if mongo "$DB_NAME" --eval "db.dropDatabase()" --quiet 2>/dev/null; then
            log_success "MongoDB database removed"
        else
            log_warning "Could not remove MongoDB database. You may need to remove it manually."
        fi
    else
        log_warning "MongoDB client not found. Please remove database manually:"
        log_info "  mongosh $DB_NAME --eval 'db.dropDatabase()'"
    fi
}

# Show summary
show_summary() {
    log_step "Uninstall Summary"
    
    echo -e "${GREEN}✓${NC} PM2 processes stopped and removed"
    echo -e "${GREEN}✓${NC} Systemd service removed (if existed)"
    echo -e "${GREEN}✓${NC} Nginx configuration removed (if existed)"
    echo -e "${GREEN}✓${NC} Logs removed"
    
    if [ "$FULL_REMOVE" = true ]; then
        echo -e "${GREEN}✓${NC} Build artifacts removed"
        echo -e "${GREEN}✓${NC} Dependencies removed"
        echo -e "${GREEN}✓${NC} Configuration files removed"
    fi
    
    echo ""
    log_info "Uninstall completed!"
    echo ""
    log_info "To reinstall, run: sudo ./install.sh"
    echo ""
    
    if [ "$FULL_REMOVE" = false ]; then
        log_info "Note: Some files were kept. Use --full flag to remove everything."
    fi
}

# Main uninstall function
main() {
    echo -e "${CYAN}"
    echo "═══════════════════════════════════════════════════════════"
    echo "  Ticketing Tool - Uninstall Script"
    echo "═══════════════════════════════════════════════════════════"
    echo -e "${NC}\n"
    
    log_info "Project root directory: $INSTALL_DIR"
    
    # Verify project structure
    if [ ! -d "$INSTALL_DIR/server" ]; then
        log_error "Server directory not found at $INSTALL_DIR/server"
        log_error "Please run this script from the ticketing_tool project root directory"
        exit 1
    fi
    
    # Confirmation
    if [ "$SKIP_CONFIRM" = false ]; then
        echo ""
        log_warning "This will uninstall the Ticketing Tool application."
        if [ "$FULL_REMOVE" = true ]; then
            log_warning "FULL REMOVE mode: All files including node_modules and .env will be deleted!"
        fi
        echo ""
        if ! confirm "Continue with uninstall?"; then
            log_info "Uninstall cancelled"
            exit 0
        fi
    fi
    
    # Run uninstall steps
    remove_pm2
    remove_systemd_service
    remove_nginx_config
    remove_logs
    remove_build_artifacts
    remove_pm2_config
    
    if [ "$FULL_REMOVE" = true ]; then
        remove_node_modules
        remove_env_files
    else
        remove_node_modules
        remove_env_files
    fi
    
    # MongoDB data removal (only if explicitly requested)
    if [ "$KEEP_DATA" = false ]; then
        remove_mongodb_data
    fi
    
    show_summary
}

# Run main function
main

