#!/bin/bash

echo "=== Complete Frontend Rebuild with Node.js 20 ==="
echo ""

# Step 1: Stop everything
echo "1. Stopping all containers..."
docker compose down

# Step 2: Remove frontend images
echo ""
echo "2. Removing old frontend images..."
docker rmi ticketing_tool-frontend 2>/dev/null || echo "   (Image not found)"
docker images | grep -E "ticketing.*frontend|frontend.*ticketing" | awk '{print $3}' | xargs docker rmi 2>/dev/null || echo "   (No additional images found)"

# Step 3: Rebuild with --no-cache and --pull
echo ""
echo "3. Rebuilding frontend with Node.js 20 (--no-cache --pull)..."
echo "   This will take 2-3 minutes..."
docker compose build frontend --no-cache --pull

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Build failed!"
    exit 1
fi

echo ""
echo "✅ Build completed!"

# Step 4: Start containers
echo ""
echo "4. Starting all containers..."
docker compose up -d

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Failed to start containers"
    exit 1
fi

echo ""
echo "✅ Containers started!"

# Step 5: Wait for containers
echo ""
echo "5. Waiting for containers to be ready..."
sleep 20

# Step 6: Verify Email Templates is in container
echo ""
echo "6. Verifying Email Templates in container..."
if docker compose exec frontend grep -q "email-templates" /usr/share/nginx/html/assets/*.js 2>/dev/null; then
    echo "   ✅ Email Templates FOUND in container!"
else
    echo "   ⚠️  Email Templates not found - checking container status..."
    docker compose ps
fi

echo ""
echo "=== ✅ REBUILD COMPLETE ==="
echo ""
echo "Next steps:"
echo "1. Wait 10 more seconds"
echo "2. HARD REFRESH browser: Ctrl+Shift+R (or Cmd+Shift+R)"
echo "3. Check sidebar - Email Templates should appear between"
echo "   'Email Settings' and 'Email Automation'"
echo ""
echo "If still not visible, check browser console (F12) for errors"

