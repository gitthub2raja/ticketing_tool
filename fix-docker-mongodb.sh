#!/bin/bash

###############################################################################
# Fix Docker MongoDB SSL Permission Issue
#
# This script fixes the MongoDB container SSL certificate permission issue
# by either:
# 1. Fixing permissions on SSL certificates (for TLS version)
# 2. Using simplified docker-compose without TLS (recommended for dev)
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

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

echo -e "${CYAN}"
echo "═══════════════════════════════════════════════════════════"
echo "  Fix Docker MongoDB SSL Permission Issue"
echo "═══════════════════════════════════════════════════════════"
echo -e "${NC}\n"

# Check if docker compose is running
if ! docker compose ps >/dev/null 2>&1; then
    log_error "Docker Compose is not running or not accessible"
    exit 1
fi

log_info "Current MongoDB container status:"
docker compose ps mongodb

echo ""
log_info "Choose fix method:"
echo "  1. Use simplified docker-compose (no TLS) - Recommended for development"
echo "  2. Fix SSL certificate permissions (keep TLS)"
read -p "Choose option [1]: " fix_option
fix_option=${fix_option:-1}

if [ "$fix_option" = "1" ]; then
    log_info "Stopping current containers..."
    docker compose down
    
    log_info "Using simplified docker-compose.yml (no TLS)..."
    
    # Backup original
    if [ -f "docker-compose.yml" ]; then
        cp docker-compose.yml docker-compose.yml.backup
        log_info "Backed up original docker-compose.yml to docker-compose.yml.backup"
    fi
    
    # Use simplified version
    cp docker-compose.simple.yml docker-compose.yml
    log_success "Updated docker-compose.yml to simplified version (no TLS)"
    
    log_info "Starting containers with simplified configuration..."
    docker compose up -d
    
    log_info "Waiting for MongoDB to be healthy..."
    sleep 5
    
    # Check status
    if docker compose ps mongodb | grep -q "healthy"; then
        log_success "MongoDB container is now healthy!"
    else
        log_warning "MongoDB may still be starting. Check status with: docker compose ps"
    fi
    
    echo ""
    log_info "To restore original TLS configuration:"
    log_info "  mv docker-compose.yml.backup docker-compose.yml"
    
elif [ "$fix_option" = "2" ]; then
    log_info "Fixing SSL certificate permissions..."
    
    # Fix permissions on SSL certificates
    if [ -d "ssl/mongodb" ]; then
        log_info "Setting permissions on SSL certificates..."
        chmod 644 ssl/mongodb/*.crt 2>/dev/null || true
        chmod 644 ssl/mongodb/*.pem 2>/dev/null || true
        chmod 600 ssl/mongodb/*.key 2>/dev/null || true
        
        # Make sure files are readable
        chmod +r ssl/mongodb/server.pem
        chmod +r ssl/mongodb/ca.crt
        
        log_success "SSL certificate permissions fixed"
        
        log_info "Restarting MongoDB container..."
        docker compose restart mongodb
        
        log_info "Waiting for MongoDB to be healthy..."
        sleep 10
        
        # Check status
        if docker compose ps mongodb | grep -q "healthy"; then
            log_success "MongoDB container is now healthy!"
        else
            log_warning "MongoDB may still be starting. Check logs with: docker compose logs mongodb"
        fi
    else
        log_error "SSL directory not found: ssl/mongodb"
        log_info "Please ensure SSL certificates are in ssl/mongodb/"
        exit 1
    fi
fi

echo ""
log_info "Container status:"
docker compose ps

echo ""
log_success "Fix completed!"
log_info "Check logs: docker compose logs mongodb"
log_info "Check status: docker compose ps"

