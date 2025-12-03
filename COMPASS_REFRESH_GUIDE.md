# MongoDB Compass Refresh Guide

## Issue: Data Not Showing in Compass

If you see collections with 0 documents in MongoDB Compass but the application shows data, follow these steps:

### 1. Refresh Compass View
- Click the **Refresh** button (circular arrow icon) in the top right of Compass
- Or press `F5` to refresh
- Collections are cached and may need a manual refresh

### 2. Verify Collection Names
The application uses these collection names (with underscores):
- `apikeys` (no underscore - special case)
- `chat_sessions` (with underscore)
- `email_templates` (with underscore)
- `email_automations` (with underscore)
- `email_settings` (with underscore)
- `sla_policies` (with underscore)
- `sso_configs` (with underscore)
- `teams_configs` (with underscore)

### 3. Check Database Connection
- Ensure you're connected to: `localhost:27017/ticketing_tool`
- Verify authentication: `mongoadmin` / `mongopassword`
- Database name: `ticketing_tool`

### 4. Verify Data Exists
Run this command to check document counts:
```bash
docker compose exec mongodb mongosh -u mongoadmin -p mongopassword --authenticationDatabase admin ticketing_tool --eval "db.getCollectionNames().sort().forEach(c => print(c + ': ' + db[c].countDocuments() + ' documents'))"
```

### 5. Common Issues

**Issue: Collection shows 0 documents but data exists**
- **Solution**: Refresh Compass (F5 or refresh button)
- Data is saved correctly, Compass just needs to refresh

**Issue: Collection name mismatch**
- Application uses: `apikeys` (no underscore)
- Old collection: `api_keys` (with underscore) - can be ignored
- Always check the collection name matches exactly

**Issue: Data not persisting**
- Check backend logs: `docker compose logs backend | grep -i error`
- Verify database connection in `.env` file
- Ensure MongoDB container is running: `docker compose ps`

### 6. Quick Verification Script
```bash
# Check all collections and document counts
docker compose exec mongodb mongosh -u mongoadmin -p mongopassword --authenticationDatabase admin ticketing_tool --eval "db.getCollectionNames().sort().forEach(c => print(c + ': ' + db[c].countDocuments()))"
```

## All Collections Reference

| Collection Name | Purpose | Expected Data |
|----------------|---------|---------------|
| `apikeys` | API keys for integrations | Created when API keys are added |
| `users` | User accounts | Created during registration |
| `tickets` | Support tickets | Created when tickets are created |
| `organizations` | Organization data | Created in admin panel |
| `categories` | Ticket categories | Created in admin panel |
| `departments` | Department information | Created in admin panel |
| `roles` | User roles | Created in admin panel |
| `sla_policies` | SLA policies | Created in admin panel |
| `email_templates` | Email templates | Created in admin panel |
| `email_automations` | Email automation rules | Created in admin panel |
| `email_settings` | Email server settings | Created in admin panel |
| `faqs` | FAQ entries | Created in admin panel |
| `chat_sessions` | Chatbot sessions | Created when chat starts |
| `teams_configs` | Microsoft Teams config | Created in admin panel |
| `sso_configs` | SSO configuration | Created in admin panel |
| `logos` | Application logos | Created in admin panel |
| `ticket_settings` | Ticket settings | Created in admin panel |
| `reports` | Generated reports | Created when reports are generated |

## Troubleshooting Steps

1. **Refresh Compass** - Most common fix
2. **Check collection name** - Must match exactly (case-sensitive)
3. **Verify data exists** - Use mongosh command above
4. **Check backend logs** - Look for errors
5. **Restart containers** - `docker compose restart backend mongodb`


