# Casino DBMS Demo Guide

This guide gets the checked-in MySQL, Express, MongoDB, and Next.js implementation running locally and provides a short, repeatable demonstration path. Run commands from the repository root unless a step says to change directories.

## What is required

- Node.js 18 or newer and npm
- MySQL 8.0 or newer
- MongoDB 6 or newer, local or Atlas (optional for core SQL/API demonstration; required for Mongo/vector screens)
- Two terminals for the backend and frontend

The running backend connects to MySQL at startup and attempts MongoDB afterward. A MongoDB failure is logged as optional/deferred. The MySQL source of truth is `database/mysql/`; the generic `database/*.sql` and some existing docs contain older PostgreSQL-era content. Use the MySQL files below.

## 1. Create and load MySQL

Create a clean database in MySQL Workbench or the MySQL shell:

```sql
CREATE DATABASE casino_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

From PowerShell at the repository root, load files in this order (replace `root` if your MySQL user differs):

```powershell
mysql -u root -p casino_db < database/mysql/schema.sql
mysql -u root -p casino_db < database/mysql/rbac.sql
mysql -u root -p casino_db < database/mysql/procedures.sql
mysql -u root -p casino_db < database/mysql/triggers.sql
```

The checked-in seed explicitly inserts wallets, while `trigger_create_wallet` also creates one for each player. To avoid the duplicate wallet conflict, temporarily remove the two player-insert triggers before seeding:

```sql
USE casino_db;
DROP TRIGGER IF EXISTS trigger_create_wallet;
DROP TRIGGER IF EXISTS trigger_assign_default_role;
```

Load the seed, restore the triggers, then assign PLAYER to seeded accounts (the omitted trigger would otherwise have done this):

```powershell
mysql -u root -p casino_db < database/mysql/seed.sql
mysql -u root -p casino_db < database/mysql/triggers.sql
```

```sql
INSERT IGNORE INTO USER_ROLE (player_id, role_id, is_active)
SELECT p.player_id, r.role_id, 1
FROM PLAYER p CROSS JOIN ROLE r
WHERE r.role_name = 'PLAYER';
```

Why this order: the schema creates core tables; RBAC creates ROLE/USER_ROLE/PERMISSION/ROLE_PERMISSION referenced by triggers; procedures and triggers add behavior; seed data then inserts the demo records. The core schema script drops and recreates core casino tables, so do not rerun it against data you want to preserve. In MySQL Workbench, execute the statements in the same order if shell redirection is unavailable. Trigger side effects remain on seeded bets; see the study guide caveats.

Quick checks:

```sql
USE casino_db;
SHOW TABLES;
SELECT COUNT(*) AS players FROM PLAYER;
SELECT COUNT(*) AS games FROM GAME;
SELECT COUNT(*) AS bets FROM BET;
SELECT player_id, balance FROM WALLET ORDER BY player_id;
SELECT role_name FROM ROLE;
```

Expect core entities plus RBAC tables/views. Seed data aims to provide 12 players, 8 dealers, 10 tables, 10 games, and bets; triggers may affect wallet and transaction rows as seeded inserts execute.

## 2. Configure and start the backend

```powershell
cd backend
npm install
New-Item -ItemType File -Path .env -Force
```

The template file is not present in this checkout, so create `.env` directly as above. Edit `backend/.env` to match the local MySQL credentials and Mongo URI:

```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_NAME=casino_db
DB_USER=root
DB_PASSWORD=your_mysql_password
MONGODB_URI=mongodb://localhost:27017/casino_analytics
JWT_SECRET=replace-with-a-long-random-local-secret
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:3000
```

Start it:

```powershell
npm run dev
```

Keep this terminal open. The backend should report a successful MySQL connection and listen on port 5000. Visit `http://localhost:5000/api/health` for the health response.

## 3. Configure and start the frontend

In a second PowerShell window, from the project root:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. The Axios client in `frontend/lib/api.js` targets the local API. If it needs an explicit override, create `frontend/.env.local` with:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## 4. Demo flow

Use the registration screen to create a fresh player account; it avoids relying on stale or placeholder seeded password hashes. Show these parts in order:

1. **Register and sign in.** Explain bcrypt password hashing, the PLAYER insert trigger that creates a zero-balance wallet, the default PLAYER role trigger, and JWT authentication.
2. **Player dashboard and games.** Show API-backed game listings and the current player's data. Explain that the JWT middleware looks up the active player and roles from MySQL for each protected request.
3. **Wallet.** Deposit a small amount and inspect the balance and transaction history. Discuss DECIMAL money values, stored procedure transactions, row locks, and the audit columns `balance_before` / `balance_after`.
4. **Betting.** Choose an active game and a bet within its table min/max. Place a bet, then inspect its history and balance. Explain the intended atomic sequence: validate player/game/wallet, insert pending bet, debit balance, commit.
5. **Dealer.** If an account has an active DEALER role, show the dealer queue and bets for a seeded active game. The game start/end buttons call code that is currently incompatible with the MySQL backend; explain this as a known integration gap. Bet settlement reaches the MySQL procedure, but current procedure/trigger overlap can credit a winning payout twice, so use an isolated disposable database if you demonstrate the write.
6. **Admin/RBAC.** If an account has ADMIN, show player management and role assignment. Explain many-to-many role mappings and permission mappings. The table mutation endpoints are also currently incompatible with MySQL and require a MANAGER role that is absent from the role enum, so present those as incomplete paths rather than promising they work.
7. **Mongo/vector analytics (optional).** Start MongoDB, then visit analytics/vector screens. Explain flexible event documents and five-dimensional cosine similarity. The standalone Mongo scripts use Mongoose from `backend/node_modules`; from the repository root run:

   ```powershell
   $env:NODE_PATH = "$PWD\backend\node_modules"
   node database/nosql/mongodb-setup.js
   node database/nosql/mongodb-queries.js
   ```

Avoid claiming that seeded demo login credentials work without checking them first. The RBAC script contains a placeholder hash for its admin, and the sample player hashes in the seed file are not reliable bcrypt credentials. Register a fresh account and assign an elevated role through the database for a prepared demo.

## 5. Optional direct SQL demonstrations

In MySQL Workbench, after loading the scripts:

```sql
CALL get_player_statistics(1);
CALL get_user_permissions(1);
SELECT * FROM v_player_roles;
```

The complex query file contains CTEs, nested and correlated subqueries, joins, aggregates, and an RBAC permission query. Note: the recursive referral CTE expects a `referred_by` column that is commented out in the core schema; add that optional column before running that one query or explain the dependency.

## 6. Troubleshooting

- **MySQL access denied:** check DB_USER/DB_PASSWORD and that the server listens on DB_PORT.
- **Unknown table ROLE / USER_ROLE:** load `rbac.sql` after `schema.sql` and before `triggers.sql`.
- **Procedure or trigger already exists:** scripts drop many routines before recreating, but initialize a fresh database for a clean demo.
- **MongoDB connection error:** core SQL/API use remains possible; set a reachable `MONGODB_URI` for analytics/vector features.
- **Frontend cannot reach API:** check backend terminal, `NEXT_PUBLIC_API_URL`, and `ALLOWED_ORIGINS`.
- **Seed login fails:** expected possibility; use Register to create a valid bcrypt-backed account.
- **Seed reports duplicate wallet:** follow the temporary trigger workaround in Step 1. Restore the trigger script after seeding so new registrations receive wallets and default roles.
- **Balance or ledger looks surprising:** database triggers and procedures currently overlap in wallet/transaction effects. See the study guide's implementation caveats; do not treat ledger totals as accounting-correct until that is fixed.

## 7. Shutdown

Stop each Node process with `Ctrl+C`. MySQL and MongoDB can remain running as services. Preserve `.env` locally and do not commit real secrets.
