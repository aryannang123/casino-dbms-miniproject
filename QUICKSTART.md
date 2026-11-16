# Casino DBMS - Quick Start Guide

Get your Casino Database Management System running in 5 minutes.

---

## Prerequisites
- **Node.js** (v18+)
- **MySQL Server** (v8.0+, port 3306)
- **MongoDB** (optional, port 27017 for NoSQL analytics)

---

## 1. Database Setup (MySQL)

Open your MySQL client or PowerShell and run:

```sql
CREATE DATABASE casino_db;
USE casino_db;
```

Load the database scripts in order (replace `C:/path/to/casino-dbms-miniproject` with your project root path):

```sql
SOURCE C:/path/to/casino-dbms-miniproject/database/mysql/schema.sql;
SOURCE C:/path/to/casino-dbms-miniproject/database/mysql/procedures.sql;
SOURCE C:/path/to/casino-dbms-miniproject/database/mysql/rbac.sql;
SOURCE C:/path/to/casino-dbms-miniproject/database/mysql/triggers.sql;
SOURCE C:/path/to/casino-dbms-miniproject/database/mysql/seed.sql;
```

Set demo account passwords:
```sql
UPDATE PLAYER SET password_hash = '$2b$10$oN57AQJl.J3DZEVyXACiiOGHyFhx14Nqz.srjFEYrjxIXEaXElsay';
```
*(All seeded demo accounts now use password: `Password123!`)*

---

## 2. Backend Setup

Open a terminal in the project root:

```bash
cd backend
npm install
copy .env.example .env
```

Ensure `backend/.env` has your MySQL password:
```env
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=casino_db
```

Start the backend:
```bash
npm run dev
```
*(Runs on `http://localhost:5000`)*

---

## 3. Frontend Setup

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```
*(Runs on `http://localhost:3000`)*

---

## 4. Log In

Go to **`http://localhost:3000/login`** and use:
- **Email:** `alice.cooper@email.com` (Role: Dealer / Player)
- **Password:** `Password123!`
