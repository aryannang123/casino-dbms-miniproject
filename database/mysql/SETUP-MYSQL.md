# MySQL Setup Guide for Casino DBMS

## Quick Setup for MySQL

### Step 1: Create Database (1 minute)

**Option A: Using MySQL Workbench (GUI)**
1. Open MySQL Workbench
2. Connect to your local MySQL server
3. Click "Create a new schema" icon (database icon with +)
4. Name: `casino_db`
5. Click "Apply"

**Option B: Using Command Line**
```bash
mysql -u root -p
# Enter your MySQL root password

CREATE DATABASE casino_db;
USE casino_db;
```

### Step 2: Run SQL Scripts (3 minutes)

**In MySQL Workbench:**
1. Connect to `casino_db` database
2. Click "File" → "Open SQL Script"
3. Navigate to: `database/mysql/`
4. Run scripts IN THIS ORDER:
   
   a. **schema.sql**
      - Open file
      - Click ⚡ (Execute) button
      - Wait for success
   
   b. **procedures.sql**
      - Open file
      - Click ⚡ Execute
      - Wait for success
   
   c. **seed.sql**
      - Open file
      - Click ⚡ Execute
      - You'll see verification output

**Or via Command Line:**
```bash
# From project root directory
cd database/mysql

mysql -u root -p casino_db < schema.sql
mysql -u root -p casino_db < procedures.sql
mysql -u root -p casino_db < seed.sql
```

### Step 3: Verify Database (30 seconds)

In MySQL Workbench Query tab or command line:

```sql
USE casino_db;

-- Check tables exist
SHOW TABLES;

-- Expected: 7 tables (DEALER, PLAYER, CASINO_TABLE, GAME, BET, WALLET, TRANSACTION)

-- Check sample data
SELECT COUNT(*) FROM PLAYER;
SELECT COUNT(*) FROM GAME;
SELECT COUNT(*) FROM BET;
```

### Step 4: Configure Backend for MySQL

Navigate to `backend/.env` and update:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=casino_db
DB_USER=root
DB_PASSWORD=your_mysql_root_password
DB_TYPE=mysql
```

### Step 5: Update Backend Database Connection

The backend needs to be configured for MySQL. Install MySQL driver:

```bash
cd backend
npm install mysql2
```

Then update `backend/src/config/database.js`:

```javascript
const mysql = require('mysql2/promise');
require('dotenv').config();

// Create MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME || 'casino_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0
});

// Test connection
pool.getConnection()
    .then(connection => {
        console.log('✓ MySQL database connected successfully');
        connection.release();
    })
    .catch(err => {
        console.error('MySQL connection error:', err);
        process.exit(-1);
    });

// Helper function to execute queries
const query = async (text, params = []) => {
    const start = Date.now();
    try {
        const [rows] = await pool.execute(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { duration, rows: rows.length || rows.affectedRows });
        return { rows };
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

module.exports = {
    query,
    pool
};
```

### Step 6: Start Backend

```bash
cd backend
npm run dev
```

You should see:
```
✓ MySQL database connected successfully
Server running on port 5000
```

### Step 7: Test API

```bash
curl http://localhost:5000/api/health
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

## Key Differences: MySQL vs PostgreSQL

### What Changed:

1. **Auto Increment**: `SERIAL` → `AUTO_INCREMENT`
2. **ENUM Types**: Inline `ENUM('value1', 'value2')`
3. **Functions**: `CURRENT_DATE` → `CURDATE()`
4. **Boolean**: No native boolean (use TINYINT or ENUM)
5. **Stored Procedures**: Different delimiter syntax (`DELIMITER $$`)
6. **Triggers**: MySQL requires `DELIMITER` for triggers
7. **JSON**: Use `JSON` type (available in MySQL 5.7+)
8. **Date Functions**: Different syntax for date operations

### What Works the Same:

- ✅ Foreign Keys with CASCADE
- ✅ CHECK Constraints (MySQL 8.0+)
- ✅ UNIQUE Constraints
- ✅ Indexes
- ✅ Transactions
- ✅ Stored Procedures
- ✅ Basic SQL queries

## Troubleshooting

### Error: "CHECK constraint failed"
- **Solution**: Make sure you're using MySQL 8.0+ (CHECK constraints were added in 8.0.16)
- Check version: `SELECT VERSION();`

### Error: "Access denied"
- **Solution**: Verify MySQL root password
- Reset password if needed:
  ```bash
  ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
  FLUSH PRIVILEGES;
  ```

### Error: "Unknown database 'casino_db'"
- **Solution**: Make sure you created the database first
  ```sql
  CREATE DATABASE casino_db;
  ```

### Error: "Cannot find module 'mysql2'"
- **Solution**: Install MySQL driver
  ```bash
  cd backend
  npm install mysql2
  ```

## Testing Procedures with MySQL

```sql
-- Test deposit
CALL deposit_funds(1, 500.00, 'Test deposit');

-- Test place bet
CALL place_bet(1, 9, 50.00, 'WIN');

-- Test get statistics
CALL get_player_statistics(1);
```

## Next Steps

1. ✅ Database created and populated
2. ✅ Backend connected to MySQL
3. ✅ API tested and working
4. Continue with regular testing from main documentation

---

**Your Casino DBMS is now running on MySQL!** 🎰
