#!/bin/bash

echo "=== Force Rebuild Frontend Container ==="
echo ""
echo "This will completely rebuild the frontend container"
echo "to include the Email Templates menu item."
echo ""

# Step 1: Stop containers
echo "1. Stopping containers..."
docker compose down

# Step 2: Remove old frontend image
echo ""
echo "2. Removing old frontend image..."
docker rmi ticketing_tool-frontend 2>/dev/null || echo "   (Image not found or already removed)"

# Step 3: Rebuild with no cache
echo ""
echo "3. Rebuilding frontend container (NO CACHE) - This will take 2-3 minutes..."
docker compose build frontend --no-cache

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Build failed!"
    exit 1
fi

echo ""
echo "✅ Build completed successfully!"

# Step 4: Start all containers
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

# Step 5: Wait and show status
echo ""
echo "5. Waiting for containers to be ready..."
sleep 20

echo ""
echo "6. Container status:"
docker compose ps

echo ""
echo "=== ✅ REBUILD COMPLETE ==="
echo ""
echo "Next steps:"
echo "1. Wait 10 more seconds"
echo "2. HARD REFRESH browser: Ctrl+Shift+R"
echo "3. Check sidebar - Email Templates should appear between"
echo "   'Email Settings' and 'Email Automation'"
echo ""
echo "The Email Templates menu item is now in the Docker container!"

