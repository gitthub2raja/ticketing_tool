#!/bin/bash
# MongoDB Backup Script
# This script creates a backup of the MongoDB database and saves it to the local backups directory

set -e

BACKUP_DIR="./backups/mongodb"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="ticketing_tool_backup_${TIMESTAMP}"
CONTAINER_NAME="ticketing_mongodb"
DB_NAME="ticketing_tool"
DB_USER="mongoadmin"
DB_PASSWORD="mongopassword"
AUTH_DB="admin"

echo "🚀 Starting MongoDB backup..."
echo "📅 Timestamp: ${TIMESTAMP}"
echo "📁 Backup directory: ${BACKUP_DIR}"
echo ""

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Create backup using mongodump
echo "📦 Creating backup..."
docker exec ${CONTAINER_NAME} mongodump \
  --username ${DB_USER} \
  --password ${DB_PASSWORD} \
  --authenticationDatabase ${AUTH_DB} \
  --db ${DB_NAME} \
  --out /backups/${BACKUP_NAME}

# Compress the backup
echo "🗜️  Compressing backup..."
docker exec ${CONTAINER_NAME} tar -czf /backups/${BACKUP_NAME}.tar.gz -C /backups ${BACKUP_NAME}

# Remove uncompressed backup directory
docker exec ${CONTAINER_NAME} rm -rf /backups/${BACKUP_NAME}

# Fix permissions (if running as root in container)
docker exec ${CONTAINER_NAME} chmod 666 /backups/${BACKUP_NAME}.tar.gz 2>/dev/null || true

# Get file size
BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)

echo ""
echo "✅ Backup completed successfully!"
echo "📁 Backup file: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo "📊 Backup size: ${BACKUP_SIZE}"
echo ""
echo "💡 To restore this backup, run:"
echo "   ./restore_mongodb.sh ${BACKUP_NAME}.tar.gz"

