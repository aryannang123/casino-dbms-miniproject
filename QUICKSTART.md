# Quick Start Guide

Get your Casino DBMS running in 5 minutes!

## Prerequisites

- MySQL 8.0+ installed and running
- Node.js 18+ installed
- Git installed

## Quick Setup

### 1. Database Setup (2 minutes)

**On Windows (PowerShell/CMD):**

```powershell
# Create database using MySQL
mysql -u root -p -e "CREATE DATABASE casino_db;"

# Navigate to MySQL database folder
cd database\mysql

# Run all SQL scripts in order
mysql -u root -p casino_db < schema.sql
mysql -u root -p casino_db < procedures.sql
mysql -u root -p casino_db < seed.sql
```

**On Linux/Mac:**

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE casino_db;"

# Navigate to MySQL database folder
cd database/mysql

# Run all SQL scripts in order
mysql -u root -p casino_db < schema.sql
mysql -u root -p casino_db < procedures.sql
mysql -u root -p casino_db < seed.sql
```

### 2. Backend Setup (2 minutes)

**On Windows:**

```powershell
# Navigate back to project root if in database folder
cd ..

# Install dependencies
cd backend
npm install

# Create environment file
copy .env.example .env

# Edit .env and set your MySQL password
# DB_USER=root
# DB_PASSWORD=your_mysql_password_here
# DB_NAME=casino_db

# Start server
npm run dev
```

**On Linux/Mac:**

```bash
# Navigate back to project root if in database folder
cd ..

# Install dependencies
cd backend
npm install

# Create environment file
cp .env.example .env

# Edit .env and set your MySQL password
# DB_USER=root
# DB_PASSWORD=your_mysql_password_here
# DB_NAME=casino_db

# Start server
npm run dev
```

You should see:
```
✓ Database connected successfully
Server running on port 5000
```

### 3. Test API (1 minute)

Open browser or use curl:

```bash
# Health check
curl http://localhost:5000/api/health

# Register a test account
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test Player\",\"email\":\"test@player.com\",\"phone\":\"+1-555-TEST\",\"password\":\"TestPass123\",\"dateOfBirth\":\"1990-01-01\"}"

# Login (save the token from response)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@player.com\",\"password\":\"TestPass123\"}"
```

## Quick Test Workflow

After registration, test the complete flow:

```bash
# Replace YOUR_TOKEN with the token from login
export TOKEN="your_token_here"

# 1. Check wallet balance
curl http://localhost:5000/api/wallet \
  -H "Authorization: Bearer $TOKEN"

# 2. Deposit funds
curl -X POST http://localhost:5000/api/wallet/deposit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"amount\":1000,\"description\":\"Test deposit\"}"

# 3. View active games
curl http://localhost:5000/api/games?status=ACTIVE \
  -H "Authorization: Bearer $TOKEN"

# 4. Place a bet (use a game_id from step 3)
curl -X POST http://localhost:5000/api/bets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"gameId\":9,\"amount\":50,\"betType\":\"WIN\"}"

# 5. Check updated balance
curl http://localhost:5000/api/wallet \
  -H "Authorization: Bearer $TOKEN"

# 6. View bet history
curl http://localhost:5000/api/bets/history \
  -H "Authorization: Bearer $TOKEN"

# 7. Get player statistics
curl http://localhost:5000/api/bets/stats \
  -H "Authorization: Bearer $TOKEN"
```

## Sample Data

The seed.sql file creates:
- 12 Players (alice.cooper@email.com, bob.martinez@email.com, etc.)
- 8 Dealers
- 10 Casino Tables
- 10 Games (8 completed, 2 active)
- 50+ Bets with various outcomes

You can test with existing data or create new accounts.

## Common Issues

### Database connection failed
- Check MySQL is running: `mysql -u root -p -e "SELECT 1;"`
- Verify credentials in `.env` file (DB_USER, DB_PASSWORD, DB_NAME)
- Test connection: `mysql -u root -p -e "USE casino_db;"`

### Port 5000 already in use
- Change PORT in `.env` file
- Or kill the process: `netstat -ano | findstr :5000`

### Module not found
- Run `npm install` in backend directory
- Delete `node_modules` and reinstall if needed

## Next Steps

1. Read full [Setup Guide](docs/Setup-Guide.md)
2. Explore [API Documentation](docs/API-Documentation.md)
3. Review [Project Summary](PROJECT-SUMMARY.md)
4. Test complex queries in `database/queries.sql`
5. Explore stored procedures in `database/procedures.sql`

## Testing Checklist

- [ ] Database created and all scripts run successfully
- [ ] Backend server starts without errors
- [ ] Health check endpoint responds
- [ ] Can register new player
- [ ] Can login and receive token
- [ ] Can check wallet balance
- [ ] Can deposit funds
- [ ] Can view active games
- [ ] Can place a bet
- [ ] Wallet balance updates correctly
- [ ] Can view bet history
- [ ] Can get player statistics

## Development Tools

### Recommended Tools
- **Postman**: API testing (import from docs)
- **MySQL Workbench**: Database management GUI
- **DBeaver**: Alternative database client
- **VS Code**: Code editing with extensions

### Useful MySQL Commands
```sql
-- Connect to database
USE casino_db;

-- List tables
SHOW TABLES;

-- Describe table
DESCRIBE PLAYER;

-- View procedures
SHOW PROCEDURE STATUS WHERE Db = 'casino_db';

-- View triggers
SHOW TRIGGERS;

-- Check active connections
SHOW PROCESSLIST;
```

## Production Checklist

Before deploying to production:

- [ ] Change JWT_SECRET to strong random string
- [ ] Set NODE_ENV=production
- [ ] Configure CORS for your domain
- [ ] Enable SSL for database connection
- [ ] Set up database backups
- [ ] Configure logging and monitoring
- [ ] Set up process manager (PM2)
- [ ] Configure reverse proxy (nginx)
- [ ] Set up firewall rules
- [ ] Enable rate limiting

---

🎰 **You're ready to go! Happy coding!**

For detailed information, see the complete documentation in the `docs/` folder.
