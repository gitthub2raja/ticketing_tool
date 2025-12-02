# OAuth2 Email Configuration - Complete Setup Guide

## ✅ OAuth2 Support Implemented

### Frontend Features:
- **Authentication Method Selection**: Choose between "Password" or "OAuth2"
- **OAuth2 Configuration UI**: 
  - Provider selection (Microsoft 365 / Google Workspace)
  - Client ID, Client Secret, Tenant ID fields
  - Authorization status indicator
  - One-click authorization button
- **OAuth2 Callback Handler**: Automatic token exchange and storage

### Backend Features:
- **OAuth2 Service**: `app/services/email_oauth2.py`
  - Microsoft 365 OAuth2 support
  - Google Workspace OAuth2 support
  - Automatic token refresh
  - Token storage in database
- **Email Endpoints**: Updated to support OAuth2
  - `/api/email/oauth2/auth-url` - Get authorization URL
  - `/api/email/oauth2/callback` - Handle OAuth2 callback
  - `/api/email/test-smtp` - Test SMTP (OAuth2/password)
  - `/api/email/test-imap` - Test IMAP (OAuth2/password)

## 📋 Setup Instructions

### Microsoft 365 OAuth2 Setup:

1. **Register App in Azure AD:**
   - Go to https://portal.azure.com
   - Navigate to "Azure Active Directory" → "App registrations"
   - Click "New registration"
   - Name: "Ticketing Tool Email"
   - Redirect URI: `http://localhost/admin/email/oauth2/callback` (or your domain)
   - Click "Register"

2. **Get Credentials:**
   - Copy "Application (client) ID" → This is your **Client ID**
   - Copy "Directory (tenant) ID" → This is your **Tenant ID**
   - Go to "Certificates & secrets" → "New client secret"
   - Copy the secret value → This is your **Client Secret**

3. **Configure in Email Settings:**
   - Go to Email Settings page
   - Select "OAuth2" as Authentication Method
   - Select "Microsoft 365" as Provider
   - Enter Client ID, Client Secret, Tenant ID
   - Click "Authorize OAuth2"
   - Complete authorization in popup
   - Tokens will be stored automatically

### Google Workspace OAuth2 Setup:

1. **Create OAuth2 Credentials:**
   - Go to https://console.cloud.google.com
   - Create a new project or select existing
   - Enable "Gmail API"
   - Go to "Credentials" → "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Authorized redirect URIs: `http://localhost/admin/email/oauth2/callback`
   - Click "Create"

2. **Get Credentials:**
   - Copy "Client ID" → This is your **Client ID**
   - Copy "Client secret" → This is your **Client Secret**

3. **Configure in Email Settings:**
   - Go to Email Settings page
   - Select "OAuth2" as Authentication Method
   - Select "Google Workspace" as Provider
   - Enter Client ID and Client Secret
   - Click "Authorize OAuth2"
   - Complete authorization in popup
   - Tokens will be stored automatically

## 🔄 How It Works

1. **Initial Setup:**
   - User selects OAuth2 authentication method
   - Enters OAuth2 credentials (Client ID, Secret, Tenant ID for Microsoft)
   - Clicks "Authorize OAuth2"

2. **Authorization Flow:**
   - Frontend requests authorization URL from backend
   - User is redirected to Microsoft/Google login
   - User authorizes the application
   - OAuth2 provider redirects back with authorization code
   - Backend exchanges code for access token and refresh token
   - Tokens are stored in database

3. **Token Management:**
   - Access tokens are automatically refreshed when expired
   - Refresh tokens are used to get new access tokens
   - No password needed for shared mailboxes!

## 🎯 Benefits

- ✅ **No Password Required**: Perfect for shared mailboxes
- ✅ **Secure**: OAuth2 is industry standard
- ✅ **Auto-Refresh**: Tokens automatically refresh
- ✅ **Multi-Provider**: Supports Microsoft 365 and Google Workspace
- ✅ **User-Friendly**: One-click authorization

## 📝 Database Storage

OAuth2 tokens are stored in `email_settings` collection:
```json
{
  "smtp": {
    "authMethod": "oauth2",
    "auth": {
      "oauth2": {
        "provider": "microsoft",
        "clientId": "...",
        "clientSecret": "...",
        "tenantId": "...",
        "accessToken": "...",
        "refreshToken": "...",
        "tokenExpiry": "2025-12-03T10:00:00"
      }
    }
  }
}
```

## 🔧 Troubleshooting

- **"OAuth2 authorization failed"**: Check redirect URI matches exactly
- **"Token expired"**: Tokens auto-refresh, but you can re-authorize
- **"Invalid client"**: Verify Client ID and Secret are correct
- **"Redirect URI mismatch"**: Ensure redirect URI in Azure/Google matches exactly

