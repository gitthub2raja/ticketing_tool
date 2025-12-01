#!/bin/bash

echo "=== Rebuilding Frontend Container ==="
echo ""
echo "This will rebuild the frontend Docker container with the latest changes"
echo "including the Email Templates menu item."
echo ""

# Rebuild frontend container
echo "1. Rebuilding frontend container..."
docker-compose build frontend --no-cache

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Frontend container rebuilt successfully!"
    echo ""
    echo "2. Restarting frontend and nginx containers..."
    docker-compose up -d frontend nginx
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Containers restarted successfully!"
        echo ""
        echo "📋 Next Steps:"
        echo "   1. Wait 10-15 seconds for containers to start"
        echo "   2. Hard refresh your browser: Ctrl+Shift+R (or Cmd+Shift+R on Mac)"
        echo "   3. The Email Templates menu item should now appear in the sidebar"
        echo ""
        echo "The menu item will be between 'Email Settings' and 'Email Automation'"
        echo "in the Administration section."
    else
        echo ""
        echo "❌ Error restarting containers"
        exit 1
    fi
else
    echo ""
    echo "❌ Error rebuilding frontend container"
    exit 1
fi

