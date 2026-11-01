# Quick Start Guide - MySQL Version

Get your Casino DBMS running on MySQL in 5 minutes!

## Prerequisites

- ✅ MySQL installed and running (MySQL 8.0+ recommended)
- ✅ Node.js 18+ installed

## Step 1: Create Database (1 minute)

### Using MySQL Workbench (Easiest):

1. Open **MySQL Workbench**
2. Connect to your local MySQL server
3. Click the **database icon with +** (Create a new schema)
4. Name: `casino_db`
5. Click **"Apply"** → **"Apply"** → **"Finish"**

### Or using Command Line:

```bash
mysql -u root -p
# Enter your MySQL password

CREATE DATABASE casino_db;
USE casino_db;
exit;
```

## Step 2: Run SQL Scripts (2 minutes)

### In MySQL Workbench (Recommended):

1. Click on `casino_db` in the left panel
2. Click **"File"** → **"Open SQL Script"**
3. Navigate to: `database/mysql/`
4. Open and execute **IN ORDER**:
   
   **a. schema.sql**
   - Click the ⚡ lightning bolt icon
   - Wait for "Action Output" to show success
   
   **b. procedures.sql**
   - Click ⚡
   - Wait for success
   
   **c. seed.sql**
   - Click ⚡
   - You'll see data counts at the bottom

### Or using Command Line:

```bash
# Navigate to project directory
cd database/mysql

# Run scripts (you'll be prompted for password each time)
mysql -u root -p casino_db < schema.sql
mysql -u root -p casino_db < procedures.sql
mysql -u root -p casino_db < seed.sql
```

## Step 3: Verify Database (30 seconds)

In MySQL Workbench query tab:

```sql
USE casino_db;

-- Check tables (should show 7 tables)
SHOW TABLES;

-- Check data
SELECT COUNT(*) FROM PLAYER;   -- Should be 12
SELECT COUNT(*) FROM GAME;     -- Should be 10
SELECT COUNT(*) FROM BET;      -- Should be ~35
```

## Step 4: Setup Backend (2 minutes)

```bash
# Navigate to backend directory
cd backend

# Install dependencies (first time only)
npm install

# Create environment file
copy .env.example .env

# Edit .env in notepad
notepad .env
```

In the `.env` file, update these lines:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=casino_db
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD_HERE
```

**Important**: Replace `YOUR_MYSQL_PASSWORD_HERE` with your actual MySQL root password!

Save and close the file.

## Step 5: Start Backend (30 seconds)

```bash
npm run dev
```

✅ You should see:
```
✓ MySQL database connected successfully
Server running on port 5000
```

## Step 6: Test It! (1 minute)

Open a new terminal and test:

```bash
# Health check
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Casino API is running"
}
```

### Register a test account:

```bash
curl -X POST http://localhost:5000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Test Player\",\"email\":\"test@casino.com\",\"phone\":\"+1-555-TEST\",\"password\":\"TestPass123\",\"dateOfBirth\":\"1990-01-01\"}"
```

✅ **Success!** You should get a response with player data, wallet, and token.

## Quick Test Workflow

After registration, test the complete flow:

```bash
# 1. Login (save the token from response)
curl -X POST http://localhost:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@casino.com\",\"password\":\"TestPass123\"}"

# 2. Set your token (Windows PowerShell)
$TOKEN="your_token_here"

# 3. Check wallet
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/wallet

# 4. Deposit funds
curl -X POST http://localhost:5000/api/wallet/deposit ^
  -H "Authorization: Bearer $TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"amount\":1000,\"description\":\"Test deposit\"}"

# 5. View active games
curl -H "Authorization: Bearer $TOKEN" "http://localhost:5000/api/games?status=ACTIVE"

# 6. Place a bet (use game_id from step 5, usually 9 or 10)
curl -X POST http://localhost:5000/api/bets ^
  -H "Authorization: Bearer $TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"gameId\":9,\"amount\":50,\"betType\":\"WIN\"}"
```

## Common Issues

### "Cannot connect to database"
- ✅ Check MySQL is running
- ✅ Verify password in `.env` file
- ✅ Make sure database `casino_db` exists

### "Unknown database 'casino_db'"
- Run: `CREATE DATABASE casino_db;` in MySQL

### "Module not found: mysql2"
- Run: `npm install` in backend folder

### "Port 5000 already in use"
- Change PORT in `.env` to 5001 or another port

## What's Next?

✅ Your Casino DBMS is running!

- **Test API**: Use the commands above
- **View Data**: Open MySQL Workbench and browse tables
- **Read Docs**: Check `database/mysql/SETUP-MYSQL.md` for details
- **API Reference**: See `docs/API-Documentation.md`

## Project Structure

```
casino-dbms-miniproject/
├── database/
│   └── mysql/              ← MySQL-specific files
│       ├── schema.sql      ← Database structure
│       ├── procedures.sql  ← Stored procedures
│       ├── seed.sql        ← Sample data
│       └── SETUP-MYSQL.md  ← Detailed guide
├── backend/
│   ├── src/               ← API code
│   ├── .env               ← YOUR configuration
│   └── package.json
└── docs/                  ← Documentation
```

## Need Help?

1. Check `database/mysql/SETUP-MYSQL.md` for detailed MySQL setup
2. See `docs/API-Documentation.md` for all API endpoints
3. Review `docs/Testing-Guide.md` for testing procedures

---

🎰 **Congratulations! Your Casino DBMS is running on MySQL!** 🎰

**Total setup time:** ~5 minutes  
**Status:** ✅ Ready to use  
**Next:** Start testing the API endpoints above
