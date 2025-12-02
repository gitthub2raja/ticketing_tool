# Clear Rate Limit - Quick Fix

## Issue
You're seeing "Too many login attempts. Please try again in 15 minutes" error.

## Quick Solution

### Option 1: Clear via Browser Console (Fastest)
1. Open browser console (F12 or Right-click → Inspect → Console)
2. Paste and run:
```javascript
localStorage.removeItem('rate_limit_login_admin@example.com')
```
3. Refresh the page and try logging in again

### Option 2: Clear All Rate Limits
```javascript
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('rate_limit_')) {
    localStorage.removeItem(key)
  }
})
```

### Option 3: Clear All LocalStorage (Nuclear Option)
```javascript
localStorage.clear()
```

## What Happened?
The frontend has client-side rate limiting that blocks login after 5 failed attempts within 15 minutes. This is stored in your browser's localStorage.

## Prevention
- Make sure you're using the correct credentials:
  - Admin: `admin@example.com` / `Admin123!`
  - Agent: `agent1@example.com` / `Agent123!`
  - User: `user1@example.com` / `User123!`

## For Development
The login page now includes a "Clear (Dev)" button in the error toast that will clear the rate limit immediately.

