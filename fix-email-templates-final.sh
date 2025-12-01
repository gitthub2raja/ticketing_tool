#!/bin/bash

echo "=== Final Fix: Email Templates Menu Item ==="
echo ""

# Step 1: Verify code
echo "1. Verifying Email Templates in code..."
if ! grep -q "email-templates" src/components/layout/Sidebar.jsx; then
    echo "   ❌ Email Templates NOT in code! Adding it now..."
    exit 1
fi
echo "   ✅ Email Templates found in code"

# Step 2: Rebuild frontend with no cache
echo ""
echo "2. Rebuilding frontend container (this will take 2-3 minutes)..."
docker compose build frontend --no-cache

if [ $? -ne 0 ]; then
    echo "   ❌ Build failed!"
    exit 1
fi

echo "   ✅ Build completed"

# Step 3: Restart containers
echo ""
echo "3. Restarting containers..."
docker compose up -d frontend nginx

if [ $? -ne 0 ]; then
    echo "   ❌ Failed to restart containers"
    exit 1
fi

echo "   ✅ Containers restarted"

# Step 4: Wait and verify
echo ""
echo "4. Waiting for containers to be ready..."
sleep 15

echo ""
echo "5. Container status:"
docker compose ps | grep -E "frontend|nginx|NAME"

echo ""
echo "=== ✅ COMPLETE ==="
echo ""
echo "Next steps:"
echo "1. Wait 10 more seconds"
echo "2. HARD REFRESH browser: Ctrl+Shift+R (or Cmd+Shift+R)"
echo "3. Check sidebar - Email Templates should appear between"
echo "   'Email Settings' and 'Email Automation'"
echo ""
echo "If still not visible:"
echo "- Try Incognito/Private mode"
echo "- Clear browser cache completely"
echo "- Check browser console (F12) for errors"

