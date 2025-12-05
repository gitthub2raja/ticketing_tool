# External Integrations & OAuth2 Email Guide

This guide explains how to use the new OAuth2 email authentication, External API Integrations, and Azure Sentinel integration features.

## Table of Contents

1. [OAuth2 Email Authentication](#oauth2-email-authentication)
2. [External API Integrations](#external-api-integrations)
3. [Azure Sentinel Integration](#azure-sentinel-integration)
4. [API Usage](#api-usage)

---

## OAuth2 Email Authentication

### Overview

OAuth2 authentication allows you to use shared email accounts (like Microsoft 365 shared mailboxes) without storing passwords. This is especially useful for organizations using shared email addresses for ticketing.

### Supported Providers

- **Microsoft 365 / Office 365** (Primary support)
- **Gmail / Google Workspace** (via OAuth2)
- Other OAuth2-compatible email providers

### Setup Instructions

#### For Microsoft 365 / Office 365:

1. **Register an Azure AD Application:**
   - Go to [Azure Portal](https://portal.azure.com)
   - Navigate to **Azure Active Directory** > **App registrations**
   - Click **New registration**
   - Name: "Ticketing Tool Email Integration"
   - Supported account types: **Accounts in any organizational directory**
   - Redirect URI: `http://localhost` (for testing) or your production URL
   - Click **Register**

2. **Configure API Permissions:**
   - In your app registration, go to **API permissions**
   - Click **Add a permission** > **Microsoft Graph**
   - Select **Delegated permissions**
   - Add the following permissions:
     - `Mail.Send` (Send mail as user)
     - `Mail.Read` (Read mail)
     - `offline_access` (Maintain access to data)
   - Click **Add permissions**
   - Click **Grant admin consent** (if you're an admin)

3. **Create Client Secret:**
   - Go to **Certificates & secrets**
   - Click **New client secret**
   - Description: "Email Integration Secret"
   - Expires: Choose appropriate expiration
   - Click **Add**
   - **Copy the secret value immediately** (you won't see it again)

4. **Get Refresh Token:**
   - Use Microsoft's OAuth2 flow to get a refresh token
   - You can use tools like [OAuth2 Playground](https://oauthplayground.com/) or implement the flow
   - Required scopes:
     - `https://outlook.office.com/SMTP.Send`
     - `https://outlook.office.com/IMAP.AccessAsUser.All`
     - `offline_access`

5. **Configure in Ticketing Tool:**
   - Go to **Admin** > **Email Settings**
   - For **SMTP Settings**:
     - Enable **Use OAuth2 for Shared Email Authentication**
     - Enter your **Email Address** (shared mailbox)
     - Enter **Client ID** (from Azure AD app registration)
     - Enter **Client Secret** (from step 3)
     - Enter **Refresh Token** (from step 4)
   - For **IMAP Settings**:
     - Enable **Use OAuth2 for Shared Email Authentication**
     - Enter the same OAuth2 credentials
   - Click **Save**

### How It Works

- The system automatically refreshes OAuth2 access tokens when they expire
- Tokens are stored securely in the database
- No passwords are stored for OAuth2-authenticated accounts
- Supports both SMTP (sending) and IMAP (receiving) with OAuth2

---

## External API Integrations

### Overview

External API Integrations allow you to connect external systems to your ticketing tool via webhooks. This enables automatic ticket creation from external systems.

### Features

- **Webhook Endpoints**: Unique URLs for receiving external data
- **Field Mapping**: Map external data fields to ticket fields
- **Multiple Integration Types**: Webhook, API, Azure Sentinel, Custom
- **Organization Scoping**: Limit integrations to specific organizations
- **Trigger Tracking**: Monitor how many times each integration has been triggered

### Creating an Integration

1. Go to **Admin** > **External Integrations**
2. Click **Create Integration**
3. Fill in the form:
   - **Name**: Descriptive name (e.g., "Azure Sentinel Production")
   - **Type**: Choose from:
     - `Azure Sentinel`: Pre-configured for Azure Sentinel alerts
     - `Generic Webhook`: For any webhook-based integration
     - `External API`: For API-based integrations
     - `Custom`: For custom integrations
   - **Description**: Optional description
   - **Organization**: Optional (leave blank for global)
4. Click **Create**

### Webhook URL

After creating an integration, you'll receive a unique webhook URL:
```
https://your-domain.com/api/integrations/webhook/{unique-id}
```

Use this URL in your external system to send data to the ticketing tool.

---

## Azure Sentinel Integration

### Overview

Azure Sentinel integration automatically creates tickets from Azure Sentinel security alerts. This enables seamless security incident management.

### Setup Instructions

1. **Create Azure Sentinel Integration:**
   - Go to **Admin** > **External Integrations**
   - Click **Create Integration**
   - Select **Type**: `Azure Sentinel`
   - Enter **Name**: "Azure Sentinel Production" (or your preferred name)
   - Optionally enter:
     - **Workspace ID**: Your Azure Sentinel workspace ID
     - **Subscription ID**: Your Azure subscription ID
     - **Resource Group**: Your resource group name

2. **Configure Field Mapping:**
   - Map Azure Sentinel alert fields to ticket fields:
     - **Title Field**: Default `AlertDisplayName` or `Title`
     - **Description Field**: Default `Description`
     - **Priority Field**: Default `Severity` (maps to ticket priority)
     - **Category Field**: Default `Category`

3. **Get Webhook URL:**
   - After creating the integration, copy the **Webhook URL**
   - This URL will be displayed in the integration details

4. **Configure Azure Sentinel:**
   - In Azure Sentinel, create a **Playbook** or **Automation Rule**
   - Add a **HTTP** action
   - Set the **Method** to `POST`
   - Set the **URI** to your webhook URL
   - Set the **Body** to send the alert data:
     ```json
     {
       "data": {
         "AlertDisplayName": "@{triggerBody()?['AlertDisplayName']}",
         "Description": "@{triggerBody()?['Description']}",
         "Severity": "@{triggerBody()?['Severity']}",
         "Category": "@{triggerBody()?['Category']}",
         "AlertId": "@{triggerBody()?['SystemAlertId']}"
       }
     }
     ```

5. **Test the Integration:**
   - Trigger a test alert in Azure Sentinel
   - Verify that a ticket is created in your ticketing tool
   - Check the ticket details to ensure all fields are mapped correctly

### Alert to Ticket Mapping

Azure Sentinel alerts are automatically mapped to tickets:

- **Alert Title** → Ticket Title
- **Alert Description** → Ticket Description
- **Alert Severity** → Ticket Priority:
  - `Critical` → `urgent`
  - `High` → `high`
  - `Medium` → `medium`
  - `Low` → `low`
  - `Informational` → `low`
- **Alert Category** → Ticket Category
- **Alert ID** → Stored in ticket metadata for deduplication

### Deduplication

The system automatically prevents duplicate tickets for the same Azure Sentinel alert by checking the `AlertId` field. If a ticket already exists for an alert ID, no new ticket will be created.

---

## API Usage

### Webhook Endpoint

**Endpoint:** `POST /api/integrations/webhook/{webhookId}`

**Headers:**
```
Content-Type: application/json
```

**Body Example (Azure Sentinel):**
```json
{
  "data": {
    "AlertDisplayName": "Suspicious login detected",
    "Description": "Multiple failed login attempts from unusual location",
    "Severity": "High",
    "Category": "Security",
    "AlertId": "abc123-def456-ghi789",
    "AdditionalData": {
      "SourceIP": "192.168.1.100",
      "User": "admin@example.com"
    }
  }
}
```

**Body Example (Generic Webhook):**
```json
{
  "title": "System Alert",
  "description": "Server CPU usage exceeded 90%",
  "priority": "high",
  "category": "Infrastructure"
}
```

### Integration Management API

**Get All Integrations:**
```
GET /api/integrations
Authorization: Bearer {token}
```

**Get Integration by ID:**
```
GET /api/integrations/{id}
Authorization: Bearer {token}
```

**Create Integration:**
```
POST /api/integrations
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "My Integration",
  "type": "webhook",
  "description": "Description here",
  "organization": null,
  "isActive": true,
  "config": {
    "fieldMapping": {
      "title": "title",
      "description": "description",
      "priority": "priority",
      "category": "category"
    }
  }
}
```

**Update Integration:**
```
PUT /api/integrations/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Name",
  "isActive": false
}
```

**Delete Integration:**
```
DELETE /api/integrations/{id}
Authorization: Bearer {token}
```

---

## Troubleshooting

### OAuth2 Email Issues

**Problem:** OAuth2 authentication fails
- **Solution:** Verify that:
  - Client ID and Client Secret are correct
  - Refresh token is valid and not expired
  - Required API permissions are granted in Azure AD
  - Admin consent has been granted for the permissions

**Problem:** Emails not sending with OAuth2
- **Solution:** Check that:
  - SMTP host is set correctly (e.g., `smtp.office365.com`)
  - Port is 587 with TLS encryption
  - OAuth2 toggle is enabled for SMTP settings

### Webhook Issues

**Problem:** Webhook not receiving data
- **Solution:** Verify that:
  - Integration is active (`isActive: true`)
  - Webhook URL is correct
  - External system is sending POST requests
  - Content-Type header is `application/json`

**Problem:** Tickets not being created from webhook
- **Solution:** Check:
  - Field mapping is correct
  - Required fields (title, description) are present in webhook payload
  - Check server logs for error messages

### Azure Sentinel Issues

**Problem:** Azure Sentinel alerts not creating tickets
- **Solution:** Ensure:
  - Playbook/Automation Rule is correctly configured
  - Webhook URL is correct in Azure Sentinel
  - Alert data structure matches expected format
  - Field mapping is configured correctly

---

## Security Considerations

1. **OAuth2 Credentials:**
   - Store OAuth2 credentials securely
   - Rotate client secrets regularly
   - Use environment variables for sensitive data in production

2. **Webhook URLs:**
   - Webhook URLs contain unique IDs that act as authentication
   - Keep webhook URLs confidential
   - Regenerate webhook URLs if compromised (delete and recreate integration)

3. **Rate Limiting:**
   - Consider implementing rate limiting for webhook endpoints
   - Monitor webhook trigger counts

4. **Data Validation:**
   - Validate incoming webhook data
   - Sanitize user input to prevent injection attacks

---

## Support

For issues or questions:
1. Check server logs for detailed error messages
2. Verify configuration settings
3. Test with sample data first
4. Contact your system administrator

---

## Changelog

### Version 1.0.0 (Current)
- ✅ OAuth2 support for SMTP and IMAP
- ✅ External API Integration management
- ✅ Azure Sentinel webhook integration
- ✅ Automatic ticket creation from webhooks
- ✅ Field mapping for custom integrations
- ✅ Webhook trigger tracking


