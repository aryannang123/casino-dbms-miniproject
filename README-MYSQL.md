# Casino Database Management System - MySQL Version

A comprehensive casino management system using **MySQL 8.0+** with Node.js backend.

## ⚡ Quick Start (5 Minutes)

Follow **[MYSQL-QUICKSTART.md](MYSQL-QUICKSTART.md)** for fastest setup!

## 📋 What's Different in MySQL Version

This project supports both PostgreSQL and MySQL. The MySQL version includes:

### ✅ MySQL-Specific Features
- AUTO_INCREMENT instead of SERIAL
- ENUM types defined inline
- MySQL stored procedure syntax (DELIMITER $$)
- mysql2 driver for Node.js
- MySQL 8.0+ CHECK constraints
- InnoDB engine for ACID compliance

### 📁 File Locations

**MySQL Files:** `database/mysql/`
- `schema.sql` - Complete database structure
- `procedures.sql` - 5 stored procedures
- `seed.sql` - Sample data (12 players, 10 games, 35+ bets)
- `SETUP-MYSQL.md` - Detailed setup guide

**Backend (Works with MySQL):** `backend/`
- Configured to use `mysql2` driver
- All controllers work with MySQL
- Connection pooling configured

## 🚀 Quick Setup Steps

### 1. Create Database
```sql
CREATE DATABASE casino_db;
```

### 2. Run Scripts (MySQL Workbench or CLI)
```bash
mysql -u root -p casino_db < database/mysql/schema.sql
mysql -u root -p casino_db < database/mysql/procedures.sql
mysql -u root -p casino_db < database/mysql/seed.sql
```

### 3. Configure Backend
```bash
cd backend
npm install
copy .env.example .env
# Edit .env: Set DB_PASSWORD to your MySQL password
```

### 4. Start Server
```bash
npm run dev
```

### 5. Test
```bash
curl http://localhost:5000/api/health
```

## 📊 Database Schema (MySQL)

### Tables (7)
1. **DEALER** - Casino employees
2. **CASINO_TABLE** - Gaming tables
3. **GAME** - Game sessions
4. **PLAYER** - Customer accounts
5. **WALLET** - Player balances
6. **BET** - Betting records
7. **TRANSACTION** - Financial audit trail

### Features
- ✅ Full ACID compliance (InnoDB)
- ✅ Foreign keys with CASCADE
- ✅ CHECK constraints (MySQL 8.0+)
- ✅ 20+ indexes for performance
- ✅ 5 stored procedures
- ✅ ENUM types for status fields

## 🔧 Stored Procedures

```sql
-- Place a bet
CALL place_bet(player_id, game_id, amount, bet_type);

-- Settle bet outcome
CALL settle_bet(bet_id, outcome, payout);

-- Deposit funds
CALL deposit_funds(player_id, amount, description);

-- Withdraw funds
CALL withdraw_funds(player_id, amount, description);

-- Get player statistics
CALL get_player_statistics(player_id);
```

## 🌐 API Endpoints

All endpoints work identically with MySQL backend:

### Authentication
- `POST /api/auth/register` - Register new player
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get profile

### Wallet
- `GET /api/wallet` - Get balance
- `POST /api/wallet/deposit` - Deposit funds
- `POST /api/wallet/withdraw` - Withdraw funds
- `GET /api/wallet/transactions` - Transaction history

### Games & Betting
- `GET /api/games` - List games
- `GET /api/games/:id` - Game details
- `POST /api/bets` - Place bet
- `GET /api/bets/history` - Bet history
- `GET /api/bets/stats` - Player statistics

### Tables
- `GET /api/tables` - List all tables
- `GET /api/tables/available` - Available tables

## 📚 Documentation

- **[MYSQL-QUICKSTART.md](MYSQL-QUICKSTART.md)** - 5-minute setup guide
- **[database/mysql/SETUP-MYSQL.md](database/mysql/SETUP-MYSQL.md)** - Detailed MySQL setup
- **[docs/API-Documentation.md](docs/API-Documentation.md)** - Complete API reference
- **[docs/Testing-Guide.md](docs/Testing-Guide.md)** - Testing procedures

## 🔒 Security Features

- JWT authentication
- bcrypt password hashing
- Input validation
- SQL injection prevention (parameterized queries)
- Role-based access control (Player, Dealer, Manager)
- CHECK constraints for business rules

## ✅ Requirements Met

| Feature | Status | Location |
|---------|--------|----------|
| MySQL Schema | ✅ | `database/mysql/schema.sql` |
| Stored Procedures | ✅ | `database/mysql/procedures.sql` |
| Sample Data | ✅ | `database/mysql/seed.sql` |
| REST API | ✅ | `backend/src/` |
| Authentication | ✅ | JWT + RBAC |
| Documentation | ✅ | `docs/` folder |

## 🎯 Testing

### Test Stored Procedures
```sql
USE casino_db;

-- Test deposit
CALL deposit_funds(1, 500.00, 'Test deposit');

-- Test place bet
CALL place_bet(1, 9, 50.00, 'WIN');

-- Test statistics
CALL get_player_statistics(1);
```

### Test API
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","phone":"+1-555-TEST","password":"TestPass123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}'
```

## 🐛 Troubleshooting

### MySQL Version Check
```sql
SELECT VERSION();
-- Must be 8.0+ for CHECK constraints
```

### Connection Issues
- Verify MySQL is running: `mysqladmin ping`
- Check credentials in `.env`
- Ensure `casino_db` database exists

### Module Issues
```bash
# Reinstall dependencies
cd backend
rm -rf node_modules package-lock.json
npm install
```

## 📊 Sample Data

Included in `seed.sql`:
- 12 Players with different statuses
- 8 Dealers across shifts
- 10 Casino tables
- 10 Games (8 completed, 2 active)
- 35+ Bets with various outcomes
- Sample wallet balances

## 🎓 Key Differences: MySQL vs PostgreSQL

| Feature | PostgreSQL | MySQL | Status |
|---------|-----------|-------|--------|
| Auto Increment | SERIAL | AUTO_INCREMENT | ✅ Adapted |
| Procedures | PL/pgSQL | SQL | ✅ Converted |
| Delimiters | Not needed | DELIMITER $$ | ✅ Added |
| Driver | pg | mysql2 | ✅ Updated |
| Port | 5432 | 3306 | ✅ Changed |

## 📝 Next Steps

1. ✅ Complete quick setup from MYSQL-QUICKSTART.md
2. ✅ Test all API endpoints
3. ✅ Review stored procedures
4. ✅ Explore sample data
5. ✅ Check API documentation

## 🏆 Project Complete

**Status:** ✅ Fully implemented with MySQL  
**API Endpoints:** 25+  
**Stored Procedures:** 5  
**Database Tables:** 7  
**Documentation:** Complete

---

## Support

- **Quick Start:** MYSQL-QUICKSTART.md
- **MySQL Setup:** database/mysql/SETUP-MYSQL.md
- **API Docs:** docs/API-Documentation.md
- **Testing:** docs/Testing-Guide.md

---

*Casino DBMS - Now with full MySQL 8.0+ support!* 🎰

**Project by:** Aryan Nangarath  
**Date:** October 26, 2024  
**Database:** MySQL 8.0+  
**Backend:** Node.js + Express + mysql2
