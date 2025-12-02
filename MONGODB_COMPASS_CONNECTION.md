# MongoDB Compass Connection Guide

## 🔌 Connection String for MongoDB Compass

### For MongoDB Compass (Running on Host Machine)

Use this connection string in MongoDB Compass:

```
mongodb://mongoadmin:mongopassword@localhost:27018/ticketing_tool?authSource=admin
```

### Connection Details

| Field | Value |
|-------|-------|
| **Host** | `localhost` |
| **Port** | `27018` |
| **Database** | `ticketing_tool` |
| **Username** | `mongoadmin` |
| **Password** | `mongopassword` |
| **Auth Source** | `admin` |

### Why `localhost:27018`?

- The Docker container exposes MongoDB on port `27018` on your host machine
- Port mapping: `27018:27017` (host:container)
- `mongodb:27017` only works **inside** the Docker network (for backend container)
- `localhost:27018` works from your **host machine** (for MongoDB Compass)

## 📝 Step-by-Step Connection

1. **Open MongoDB Compass**
2. **Click "New Connection"**
3. **Paste the connection string:**
   ```
   mongodb://mongoadmin:mongopassword@localhost:27018/ticketing_tool?authSource=admin
   ```
4. **Click "Connect"**

## 🔍 Alternative: Manual Connection Settings

If you prefer to enter details manually:

1. **Connection Name**: `Ticketing Tool Local`
2. **Hostname**: `localhost`
3. **Port**: `27018`
4. **Authentication**: 
   - **Username**: `mongoadmin`
   - **Password**: `mongopassword`
   - **Authentication Database**: `admin`
5. **Default Database**: `ticketing_tool`

## ✅ Verify Connection

### Test from Terminal
```bash
# Test MongoDB connection
docker exec ticketing_mongodb mongosh --eval "db.runCommand('ping')" --username mongoadmin --password mongopassword --authenticationDatabase admin
```

### Check Container Status
```bash
docker compose ps mongodb
```

## 🚨 Troubleshooting

### Connection Refused
- **Check if MongoDB container is running:**
  ```bash
  docker compose ps mongodb
  ```
- **Check if port 27018 is accessible:**
  ```bash
  netstat -tuln | grep 27018
  ```

### Authentication Failed
- **Verify credentials:**
  - Username: `mongoadmin`
  - Password: `mongopassword`
  - Auth Source: `admin`

### Connection Timeout
- **Check firewall settings**
- **Verify Docker port mapping:**
  ```bash
  docker port ticketing_mongodb
  ```
  Should show: `27017/tcp -> 0.0.0.0:27018`

## 📊 Connection Strings Summary

| Use Case | Connection String |
|----------|------------------|
| **MongoDB Compass** (from host) | `mongodb://mongoadmin:mongopassword@localhost:27018/ticketing_tool?authSource=admin` |
| **Backend Container** (inside Docker) | `mongodb://mongoadmin:mongopassword@mongodb:27017/ticketing_tool?authSource=admin` |
| **Direct mongosh** (from host) | `mongosh "mongodb://mongoadmin:mongopassword@localhost:27018/ticketing_tool?authSource=admin"` |

## 🔐 Security Note

⚠️ **For Production:**
- Change default passwords
- Enable TLS/SSL
- Use strong authentication
- Restrict network access

The current setup is for **development only**.

