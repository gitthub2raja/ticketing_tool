# MongoDB Collections Reference

This document lists all MongoDB collections used in the Ticketing Tool and ensures they are visible in MongoDB Compass.

## All Collections

The following collections are used by the application:

### Core Collections
- **users** - User accounts and authentication
- **tickets** - Support tickets
- **organizations** - Organization/company data
- **categories** - Ticket categories
- **departments** - Department information

### Administration Collections
- **roles** - User roles and permissions
- **sla_policies** - SLA (Service Level Agreement) policies
- **apikeys** - API keys for external integrations (note: no underscore)
- **ticket_settings** - Ticket configuration settings

### Email Collections
- **email_settings** - SMTP/IMAP email configuration
- **email_templates** - Email template definitions
- **email_automations** - Automated email rules

### Support Collections
- **faqs** - Frequently Asked Questions
- **chat_sessions** - Chatbot conversation sessions
- **chat_messages** - Individual chat messages (if separate collection)

### Integration Collections
- **teams_configs** - Microsoft Teams integration settings
- **sso_configs** - Single Sign-On (SSO) configuration

### System Collections
- **logos** - Application logo and branding
- **reports** - Generated reports (if stored)

## Collection Naming Convention

Most collections use **snake_case** naming, but some use **camelCase**:
- ✅ `apikeys` - API keys collection (no underscore, matches MongoDB Compass)
- ✅ `api_keys` - Old collection name (deprecated, data migrated to `apikeys`)
- ✅ `chat_sessions` - Chat sessions (with underscore)
- ✅ `email_settings` - Email settings (with underscore)

## Viewing in MongoDB Compass

1. **Refresh Collections**: Click the refresh button in Compass to see newly created collections
2. **Collection Names**: Look for collections with underscores (e.g., `api_keys`, not `apikeys`)
3. **Empty Collections**: Collections with 0 documents will still appear in Compass

## Verifying Data Persistence

To verify all collections exist and have data:

```bash
docker compose exec mongodb mongosh -u mongoadmin -p mongopassword --authenticationDatabase admin ticketing_tool --eval "db.getCollectionNames().sort().forEach(c => print(c + ': ' + db[c].countDocuments() + ' documents'))"
```

## Troubleshooting

If a collection doesn't appear in Compass:
1. Check the collection name matches exactly (case-sensitive)
2. Refresh the Compass view
3. Verify data was actually inserted (check backend logs)
4. Ensure you're connected to the correct database (`ticketing_tool`)

