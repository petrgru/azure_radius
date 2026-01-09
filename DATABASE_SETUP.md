# Database Setup Guide

## Overview

The RADIUS server **NO LONGER creates database tables automatically** on startup. This change provides better control over database schema management and prevents unintended table creation.

## Quick Start (Docker)

### Using Helper Script (Easiest)

```bash
./init_database_docker.sh
```

This interactive script will guide you through the initialization process.

### Manual Commands

For Docker users, use these commands to initialize the database:

```bash
# If RADIUS app is in Docker, MySQL external:
docker exec -i <radius_container> sh -c 'mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME' < init_database.sql

# If MySQL is also in Docker:
docker exec -i <mysql_container> mysql -u root -p$MYSQL_ROOT_PASSWORD <db_name> < init_database.sql

# Using docker-compose:
cat init_database.sql | docker-compose exec -T mysql mysql -u root -p$MYSQL_ROOT_PASSWORD <db_name>
```

## Setup Instructions

### Option 1: Using SQL Script (Recommended)

#### From Host Machine

1. Ensure your MySQL server is running and accessible
2. Run the initialization script:

```bash
mysql -h <DB_HOST> -u <DB_USER> -p<DB_PASSWORD> <DB_NAME> < init_database.sql
```

Or if connecting to a remote server:

```bash
mysql -h your-server.mysql.database.azure.com -u admin@server -p database_name < init_database.sql
```

#### From Docker Container

If your application is running in Docker:

1. **Copy SQL script to container:**
```bash
docker cp init_database.sql <container_name>:/app/init_database.sql
```

2. **Execute inside container:**
```bash
docker exec -it <container_name> mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME < /app/init_database.sql
```

Or in one command:

```bash
docker exec -i <container_name> sh -c 'mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME' < init_database.sql
```

3. **Using docker-compose:**
```bash
docker-compose exec radius_server mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME < /app/init_database.sql
```

#### For MySQL Running in Docker

If MySQL itself is in a Docker container:

```bash
# Copy SQL file to MySQL container
docker cp init_database.sql mysql_container:/tmp/init_database.sql

# Execute the script
docker exec -i mysql_container mysql -u root -p$MYSQL_ROOT_PASSWORD $DB_NAME < /tmp/init_database.sql
```

Or directly:

```bash
docker exec -i mysql_container mysql -u root -p$MYSQL_ROOT_PASSWORD $DB_NAME < init_database.sql
```

### Option 2: Using MySQL Workbench or any SQL Client

1. Open `init_database.sql` in your SQL client
2. Connect to your database
3. Execute the script

### Option 3: Manual Function Call (Development Only)

If you need to initialize tables programmatically (not recommended for production):

```javascript
import { manualInitDatabase } from './src/utils/database.js'

// Call this ONCE to create tables
await manualInitDatabase()
```

## Database Schema

### Table: `user_radius_access`

Stores users allowed to authenticate via RADIUS server.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT | Primary key |
| `user_principal_name` | VARCHAR(255) | Azure AD email (e.g., user@domain.com) |
| `displayName` | VARCHAR(255) | User's display name |
| `radius_server_id` | VARCHAR(100) | RADIUS server identifier |
| `createdAt` | TIMESTAMP | Record creation timestamp |

**Indexes:**
- `user_server_unique`: Prevents duplicate user-server combinations
- `idx_user_radius`: Optimizes user lookup queries
- `idx_radius_server`: Optimizes server-based queries

## Verification

After running the initialization script, verify the tables were created:

```sql
SHOW TABLES;
DESCRIBE user_radius_access;
```

## Application Startup

The application now:
1. ✅ Tests database connection on startup
2. ✅ Continues even if database is unavailable (with warnings)
3. ❌ Does NOT create tables automatically
4. ❌ Does NOT modify existing schema

### Startup Output

```
🚀 Starting RADIUS Server...
✅ Database connection successful
RADIUS server listening 0.0.0.0:1812
Allowed domains: globalhitss.com
✅ Multi-domain validation enabled
✅ RADIUS Server started successfully
```

## Adding Users

Once tables are created, add allowed users to the database:

```sql
INSERT INTO user_radius_access 
  (user_principal_name, displayName, radius_server_id) 
VALUES 
  ('user@globalhitss.com', 'John Doe', 'radius-server-1');
```

## Troubleshooting

### "Table doesn't exist" errors

Run the initialization script:
```bash
mysql -h <host> -u <user> -p <database> < init_database.sql
```

### Connection fails on startup

Check your `.env` configuration:
```
DB_HOST=your-mysql-host
DB_PORT=3306
DB_USER=your-username
DB_PASSWORD=your-password
DB_NAME=your-database
```

### Need to reset tables

```sql
DROP TABLE IF EXISTS user_radius_access;
```

Then run the initialization script again.

## Migration from Old Version

If you were using the old auto-initialization:

1. **No action needed** - The old function was never actually called
2. Run `init_database.sql` to create the correct schema
3. Migrate any existing data if applicable

## Best Practices

1. ✅ Run initialization script before first deployment
2. ✅ Use version control for schema changes
3. ✅ Backup database before schema modifications
4. ✅ Use migration tools for schema updates in production
5. ❌ Never call `manualInitDatabase()` in production code
