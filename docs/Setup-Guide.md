# Casino DBMS - Complete Setup Guide

## Prerequisites

Before you begin, ensure you have the following installed:

- **PostgreSQL 14+** - [Download](https://www.postgresql.org/download/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm or yarn** - Comes with Node.js
- **Git** - [Download](https://git-scm.com/)

## Step 1: Database Setup

### 1.1 Create Database

Open your terminal/command prompt and connect to PostgreSQL:

```bash
# On Windows (CMD)
psql -U postgres

# On Linux/Mac
sudo -u postgres psql
```

Create the database:

```sql
CREATE DATABASE casino_db;
\c casino_db
```

### 1.2 Run SQL Scripts

Run the SQL scripts in the following order:

```bash
# Navigate to the project directory
cd c:\Users\Aryan Nangarath\OneDrive\Documents\GitHub\casino-dbms-miniproject

# Run schema (creates tables)
psql -U postgres -d casino_db -f database/schema.sql

# Run procedures (creates stored procedures)
psql -U postgres -d casino_db -f database/procedures.sql

# Run triggers (creates triggers)
psql -U postgres -d casino_db -f database/triggers.sql

# Run seed data (populates with sample data)
psql -U postgres -d casino_db -f database/seed.sql
```

**Alternative: Run all at once**

```bash
psql -U postgres -d casino_db -f database/schema.sql -f database/procedures.sql -f database/triggers.sql -f database/seed.sql
```

### 1.3 Verify Database Setup

Connect to the database and verify:

```sql
\c casino_db

-- Check tables
\dt

-- Check sample data
SELECT COUNT(*) FROM PLAYER;
SELECT COUNT(*) FROM DEALER;
SELECT COUNT(*) FROM GAME;
SELECT COUNT(*) FROM BET;

-- Should see counts for each table
```

## Step 2: Backend Setup

### 2.1 Install Dependencies

```bash
cd backend
npm install
```

### 2.2 Configure Environment

Copy the example environment file and edit it:

```bash
copy .env.example .env
```

Edit `.env` file with your settings:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=casino_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password_here

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=7d

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000

# API Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 2.3 Start Backend Server

**Development mode** (with auto-reload):

```bash
npm run dev
```

**Production mode**:

```bash
npm start
```

You should see:

```
==================================================
Casino Database Management System - Backend API
==================================================
Environment: development
✓ Database connected successfully
Server running on port 5000
API available at: http://localhost:5000/api
==================================================
```

### 2.4 Test Backend

Open your browser or use curl:

```bash
# Health check
curl http://localhost:5000/api/health

# Or open in browser
http://localhost:5000/api/health
```

Expected response:

```json
{
  "success": true,
  "message": "Casino API is running",
  "timestamp": "2024-10-26T...",
  "environment": "development"
}
```

## Step 3: Testing the API

### 3.1 Register a Test User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test Player\",\"email\":\"player@test.com\",\"phone\":\"+1-555-TEST\",\"password\":\"TestPass123\",\"dateOfBirth\":\"1990-01-01\"}"
```

### 3.2 Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"player@test.com\",\"password\":\"TestPass123\"}"
```

Copy the `token` from the response.

### 3.3 Make Authenticated Request

Replace `YOUR_TOKEN_HERE` with the actual token:

```bash
# Get wallet balance
curl -X GET http://localhost:5000/api/wallet \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Deposit funds
curl -X POST http://localhost:5000/api/wallet/deposit \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d "{\"amount\":1000.00,\"description\":\"Test deposit\"}"

# View available games
curl -X GET "http://localhost:5000/api/games?status=ACTIVE" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Step 4: Frontend Setup (Optional)

### 4.1 Install Dependencies

```bash
cd frontend
npm install
```

### 4.2 Configure Environment

```bash
copy .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 4.3 Start Frontend

```bash
npm run dev
```

Open browser: `http://localhost:3000`

## Troubleshooting

### Database Connection Issues

**Error: "password authentication failed"**

```bash
# Reset PostgreSQL password
psql -U postgres
ALTER USER postgres WITH PASSWORD 'newpassword';
```

**Error: "database does not exist"**

```bash
# Create database
createdb -U postgres casino_db
```

**Error: "relation does not exist"**

Make sure you ran the schema.sql file first.

### Backend Issues

**Error: "Cannot find module"**

```bash
# Reinstall dependencies
cd backend
rm -rf node_modules package-lock.json
npm install
```

**Error: "Port 5000 already in use"**

```bash
# Change port in .env file
PORT=5001
```

Or kill the process using port 5000:

```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5000 | xargs kill -9
```

### Common Database Errors

**Error: "constraint violation"**

Check the database constraints and ensure your data meets the requirements:
- Player must be 18+ years old
- Wallet balance cannot be negative
- Bet amount must be positive
- Bet amount must be within table limits

**Error: "trigger function returned null"**

Check trigger logs in PostgreSQL:

```sql
\c casino_db
SELECT * FROM pg_stat_activity;
```

## Testing Complex Features

### Test Betting Flow

1. Register and login
2. Deposit funds
3. View available games
4. Place a bet
5. Check wallet balance
6. View bet history

### Test with Sample Data

The seed.sql file creates sample data:
- 12 Players
- 8 Dealers
- 10 Tables
- 10 Games (8 completed, 2 active)
- 50+ Bets

Use this to test without creating new data:

```bash
# Login as existing player
# Email: alice.cooper@email.com
# Password: (set during registration or check database)

# You can view the sample player emails in seed.sql
```

## Next Steps

1. Read [API Documentation](./API-Documentation.md)
2. Explore the [Database Schema](../database/schema.sql)
3. Check out [Complex Queries](../database/queries.sql)
4. Test [Stored Procedures](../database/procedures.sql)

## Support

For issues or questions:
- Check database logs: `tail -f /var/log/postgresql/postgresql-14-main.log`
- Check backend logs in terminal
- Review error messages carefully
- Verify environment variables are set correctly

## Production Deployment

For production deployment:

1. Change `NODE_ENV=production` in .env
2. Use strong JWT_SECRET (at least 32 random characters)
3. Set up SSL/TLS for PostgreSQL
4. Enable database backups
5. Configure proper CORS origins
6. Set up monitoring and logging
7. Use a process manager like PM2:

```bash
npm install -g pm2
pm2 start src/server.js --name casino-api
pm2 startup
pm2 save
```

## Performance Tips

1. **Database Indexing**: Already configured in schema.sql
2. **Connection Pooling**: Configured in database.js (max 20 connections)
3. **Rate Limiting**: Configured in server.js
4. **Compression**: Enabled for all responses
5. **Caching**: Consider adding Redis for session management

---

Congratulations! Your Casino DBMS is now fully set up and running. 🎰
