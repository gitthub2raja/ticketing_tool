# Quick Fix: Clear Rate Limit Now

## Immediate Solution

### Step 1: Open Browser Console
- Press **F12** or **Right-click → Inspect → Console**

### Step 2: Run This Command
Copy and paste this into the console and press Enter:

```javascript
localStorage.removeItem('rate_limit_login_admin@example.com'); console.log('✅ Rate limit cleared!');
```

### Step 3: Refresh Page
- Press **F5** or click the refresh button

### Step 4: Login
- Email: `admin@example.com`
- Password: `Admin123!`

## Alternative: Clear All Rate Limits

If the above doesn't work, clear all rate limits:

```javascript
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('rate_limit_')) {
    localStorage.removeItem(key);
    console.log('Cleared:', key);
  }
});
console.log('✅ All rate limits cleared!');
```

## Why This Happened

The frontend has client-side rate limiting that blocks login after 5 failed attempts within 15 minutes. This is stored in your browser's localStorage.

## Prevention

Make sure you're using the correct credentials:
- ✅ Admin: `admin@example.com` / `Admin123!`
- ✅ Agent: `agent1@example.com` / `Agent123!`
- ✅ User: `user1@example.com` / `User123!`

## Note

The login page now has a "Clear (Dev)" button in the error toast that appears when rate limited. You can also use the browser console method above for immediate clearing.

