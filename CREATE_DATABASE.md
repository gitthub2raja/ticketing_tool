# Creating the Ticketing Tool Database

## Issue
The `ticketing_tool` database doesn't appear in MongoDB Compass because MongoDB only creates databases when you first write data to them.

## Solution

### Option 1: Create via MongoDB Shell (Quick)
```bash
docker exec ticketing_mongodb mongosh --eval "use ticketing_tool; db.users.insertOne({name: 'init', created_at: new Date()}); db.getCollectionNames()" --username mongoadmin --password mongopassword --authenticationDatabase admin
```

### Option 2: Create via Backend API (Recommended)
The database will be automatically created when you:
1. Register a user via the API
2. Create a ticket
3. Create any other resource

### Option 3: Create via MongoDB Compass
1. Connect to `localhost:27018`
2. Click on the database dropdown
3. Select "Create Database"
4. Name: `ticketing_tool`
5. Collection Name: `users` (or any collection)
6. Click "Create Database"

## Verify Database Creation

### Check via MongoDB Shell
```bash
docker exec ticketing_mongodb mongosh --eval "db.adminCommand('listDatabases')" --username mongoadmin --password mongopassword --authenticationDatabase admin
```

### Check via Backend
```bash
curl http://localhost:5000/api/health
```

## After Creation

Once the database is created, you should see:
- `ticketing_tool` database in MongoDB Compass
- Collections will be created as you use the API
- Collections like: `users`, `tickets`, `organizations`, etc.

## Quick Test - Create Admin User

To create the database and an admin user:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin123!",
    "name": "Admin User",
    "role": "admin"
  }'
```

This will:
1. Create the `ticketing_tool` database
2. Create the `users` collection
3. Create your first admin user

