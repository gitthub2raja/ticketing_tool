# MongoDB Compass - All Collections Guide

This guide ensures all sidebar functions are visible and connected in MongoDB Compass.

## Connection URL

```
mongodb://mongoadmin:mongopassword@localhost:27018/ticketing_tool?authSource=admin
```

## Initialize All Collections

To ensure all collections are visible in MongoDB Compass (even when empty), run:

```bash
docker compose exec backend python /app/init_all_collections.py
```

Or copy the script first:

```bash
docker compose cp backend/init_all_collections.py backend:/app/init_all_collections.py
docker compose exec backend python /app/init_all_collections.py
```

## All Collections Mapping

### Core Collections (with data)
- **users** - User accounts and authentication
- **organizations** - Organization management
- **departments** - Department structure
- **categories** - Ticket categories
- **tickets** - All ticket records

### Admin Feature Collections

#### SLA Policies
- **Collection**: `sla_policies`
- **Backend Endpoint**: `/api/admin/sla`
- **Frontend**: Admin → SLA Policies
- **Status**: ✅ Connected

#### Email Settings
- **Collection**: `email_settings`
- **Backend Endpoint**: `/api/admin/email`
- **Frontend**: Admin → Email Settings
- **Status**: ✅ Connected

#### Email Templates
- **Collection**: `email_templates`
- **Backend Endpoint**: `/api/email-templates`
- **Frontend**: Admin → Email Templates
- **Status**: ✅ Connected

#### Email Automation
- **Collection**: `email_automations`
- **Backend Endpoint**: `/api/email-automation`
- **Frontend**: Admin → Email Automation
- **Status**: ✅ Connected

#### FAQ Management
- **Collection**: `faqs`
- **Backend Endpoint**: `/api/faq`
- **Frontend**: Admin → FAQ Management
- **Status**: ✅ Connected

#### Chat History
- **Collections**: `chat_sessions`, `chat_messages`
- **Backend Endpoint**: `/api/chatbot/sessions`, `/api/chatbot/messages`
- **Frontend**: Admin → Chat History
- **Status**: ✅ Connected

#### Microsoft Teams
- **Collection**: `teams_configs`
- **Backend Endpoint**: `/api/teams/config`
- **Frontend**: Admin → Microsoft Teams
- **Status**: ✅ Connected

#### SSO Configuration
- **Collection**: `sso_configs`
- **Backend Endpoint**: `/api/admin/sso`
- **Frontend**: Admin → SSO Configuration
- **Status**: ✅ Connected

#### Logo Management
- **Collection**: `logos`
- **Backend Endpoint**: `/api/admin/logo`
- **Frontend**: Admin → Logo Management
- **Status**: ✅ Connected

#### API Keys
- **Collection**: `apikeys`
- **Backend Endpoint**: `/api/api-keys`
- **Frontend**: Admin → API Keys
- **Status**: ✅ Connected

#### Ticket Settings
- **Collection**: `ticket_settings`
- **Backend Endpoint**: `/api/admin/ticket-settings`
- **Frontend**: Settings → Ticket Settings
- **Status**: ✅ Connected

#### Reports
- **Collection**: `reports`
- **Backend Endpoint**: `/api/reports/*`
- **Frontend**: Reports page
- **Status**: ✅ Connected

### Supporting Collections
- **roles** - User roles and permissions
- **comments** - Ticket comments
- **attachments** - File attachments metadata
- **notifications** - User notifications
- **audit_logs** - System audit trail

## Verification

### Check All Collections

```bash
docker compose exec mongodb mongosh -u mongoadmin -p mongopassword --authenticationDatabase admin ticketing_tool --eval "db.getCollectionNames().sort()" --quiet
```

### Count Documents in Each Collection

```bash
docker compose exec mongodb mongosh -u mongoadmin -p mongopassword --authenticationDatabase admin ticketing_tool --eval "db.getCollectionNames().sort().forEach(c => print(c + ': ' + db[c].countDocuments()))" --quiet
```

## Troubleshooting

### Collections Not Visible in Compass

1. **Refresh Compass**: Click the refresh button in MongoDB Compass
2. **Reconnect**: Disconnect and reconnect to the database
3. **Run Init Script**: Execute the initialization script again
4. **Check Connection**: Verify the connection string is correct

### Empty Collections

Empty collections may not appear in MongoDB Compass by default. The initialization script creates placeholder documents to ensure visibility. These can be safely deleted once real data is added.

### Backend Not Connected

If backend endpoints are not working:

1. Check backend logs: `docker compose logs backend`
2. Verify MongoDB connection: `docker compose exec backend python -c "from app.db.database import init_db; import asyncio; asyncio.run(init_db()); print('✅ Connected')"`
3. Restart backend: `docker compose restart backend`

## Notes

- Initialization markers (`_init: true`) are safe to delete
- They only ensure collections are visible when empty
- Real data will replace or supplement these markers
- All backend endpoints are properly configured to use these collections


