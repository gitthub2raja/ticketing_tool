#!/bin/bash

echo "=== Fixing Docker Containers ==="
echo ""

# Check current status
echo "1. Current container status:"
docker compose ps
echo ""

# Check backend logs to see why it's restarting
echo "2. Checking backend logs (last 30 lines):"
docker compose logs backend --tail 30
echo ""

# Try to restart backend
echo "3. Restarting backend container:"
docker compose restart backend
echo "Waiting 10 seconds for backend to start..."
sleep 10
echo ""

# Check if backend is healthy now
echo "4. Checking backend health:"
docker compose ps backend
echo ""

# Start Nginx (it depends on backend being healthy)
echo "5. Starting Nginx container:"
docker compose up -d nginx
echo ""

# Wait a moment
sleep 5

# Final status check
echo "6. Final container status:"
docker compose ps
echo ""

echo "=== Done ==="
echo ""
echo "If all containers are running:"
echo "  - Wait 10-15 seconds"
echo "  - Hard refresh browser: Ctrl+Shift+R"
echo "  - Email Templates should appear in sidebar!"
echo ""
echo "If backend is still restarting, check:"
echo "  - MongoDB connection"
echo "  - Backend environment variables"
echo "  - Backend logs: docker compose logs backend"

