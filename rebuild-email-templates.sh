#!/bin/bash

echo "=== Rebuilding Frontend for Email Templates ==="
echo ""

# Verify code is correct
echo "1. Verifying Email Templates is in code..."
if grep -q "email-templates" src/components/layout/Sidebar.jsx; then
    echo "   ✅ Email Templates found in Sidebar.jsx"
else
    echo "   ❌ Email Templates NOT found in code!"
    exit 1
fi

echo ""
echo "2. Rebuilding frontend container (no cache)..."
docker compose build frontend --no-cache

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Frontend build completed!"
    echo ""
    echo "3. Restarting containers..."
    docker compose up -d frontend nginx
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Containers restarted!"
        echo ""
        echo "📋 Next Steps:"
        echo "   1. Wait 15-20 seconds for containers to fully start"
        echo "   2. HARD REFRESH browser: Ctrl+Shift+R (or Cmd+Shift+R on Mac)"
        echo "   3. Check sidebar - Email Templates should appear between"
        echo "      'Email Settings' and 'Email Automation'"
        echo ""
        echo "If still not visible:"
        echo "   - Try Incognito/Private mode"
        echo "   - Clear browser cache completely"
        echo "   - Check: docker compose ps (all containers should be Up)"
    else
        echo ""
        echo "❌ Error restarting containers"
        exit 1
    fi
else
    echo ""
    echo "❌ Error building frontend"
    exit 1
fi

