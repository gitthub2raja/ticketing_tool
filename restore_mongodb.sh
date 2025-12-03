#!/bin/bash
# MongoDB Restore Script
# This script restores a MongoDB backup from the local backups directory

set -e

if [ -z "$1" ]; then
    echo "❌ Error: Please provide a backup file name"
    echo "Usage: ./restore_mongodb.sh <backup_file.tar.gz>"
    echo ""
    echo "Available backups:"
    ls -lh ./backups/mongodb/*.tar.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"
BACKUP_DIR="./backups/mongodb"
FULL_BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

if [ ! -f "${FULL_BACKUP_PATH}" ]; then
    echo "❌ Error: Backup file not found: ${FULL_BACKUP_PATH}"
    exit 1
fi

CONTAINER_NAME="ticketing_mongodb"
DB_NAME="ticketing_tool"
DB_USER="mongoadmin"
DB_PASSWORD="mongopassword"
AUTH_DB="admin"
RESTORE_NAME=$(basename "${BACKUP_FILE}" .tar.gz)

echo "🔄 Starting MongoDB restore..."
echo "📁 Backup file: ${FULL_BACKUP_PATH}"
echo ""

# Extract backup
echo "📦 Extracting backup..."
docker exec ${CONTAINER_NAME} tar -xzf /backups/${BACKUP_FILE} -C /backups

# Restore database
echo "🔄 Restoring database..."
docker exec ${CONTAINER_NAME} mongorestore \
  --username ${DB_USER} \
  --password ${DB_PASSWORD} \
  --authenticationDatabase ${AUTH_DB} \
  --db ${DB_NAME} \
  --drop \
  /backups/${RESTORE_NAME}/${DB_NAME}

# Clean up extracted files
echo "🧹 Cleaning up..."
docker exec ${CONTAINER_NAME} rm -rf /backups/${RESTORE_NAME}

echo ""
echo "✅ Restore completed successfully!"
echo "💡 Database '${DB_NAME}' has been restored from ${BACKUP_FILE}"

