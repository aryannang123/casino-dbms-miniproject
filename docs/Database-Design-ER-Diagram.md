# Casino DBMS - Database Design & ER Diagram

This document satisfies:
- **Criteria 1: ER diagram (2 Marks)**
- **Criteria 2: Relational schema with keys, relationships, and constraints (3 Marks)**

---

## 1. Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    PLAYER ||--|| WALLET : "owns (1:1)"
    PLAYER ||--o{ BET : "places (1:N)"
    PLAYER ||--o{ USER_ROLE : "has (1:N)"
    ROLE ||--o{ USER_ROLE : "assigned to (1:N)"
    ROLE ||--o{ ROLE_PERMISSION : "contains (1:N)"
    PERMISSION ||--o{ ROLE_PERMISSION : "granted via (1:N)"
    
    WALLET ||--o{ TRANSACTION : "records (1:N)"
    
    CASINO_TABLE ||--o{ GAME : "hosts (1:N)"
    DEALER ||--o{ GAME : "operates (1:N)"
    
    GAME ||--o{ BET : "contains (1:N)"
    
    PLAYER {
        int player_id PK
        string name
        string email UK
        string phone UK
        date registration_date
        enum status "ACTIVE, INACTIVE, SUSPENDED, BANNED"
        string password_hash
        date date_of_birth
        text address
        timestamp created_at
        timestamp updated_at
    }
    
    WALLET {
        int wallet_id PK
        int player_id FK, UK
        decimal balance "CHECK >= 0"
        timestamp last_updated
        timestamp created_at
    }
    
    DEALER {
        int dealer_id PK
        string name
        string employee_id UK
        enum shift "MORNING, AFTERNOON, NIGHT"
        date hire_date
        enum status "ACTIVE, INACTIVE, ON_LEAVE"
        timestamp created_at
        timestamp updated_at
    }
    
    CASINO_TABLE {
        int table_id PK
        string table_number UK
        enum game_type "BLACKJACK, POKER, ROULETTE, CRAPS, BACCARAT, SLOTS"
        decimal minimum_bet "CHECK > 0"
        decimal maximum_bet "CHECK > minimum_bet"
        enum status "AVAILABLE, OCCUPIED, MAINTENANCE"
        int capacity "CHECK > 0 AND <= 10"
        timestamp created_at
        timestamp updated_at
    }
    
    GAME {
        int game_id PK
        int table_id FK
        int dealer_id FK
        enum game_type
        timestamp start_time
        timestamp end_time "CHECK end_time > start_time"
        enum status "ACTIVE, COMPLETED, CANCELLED"
        timestamp created_at
        timestamp updated_at
    }
    
    BET {
        int bet_id PK
        int player_id FK
        int game_id FK
        decimal amount "CHECK > 0"
        string bet_type
        enum outcome "PENDING, WON, LOST, CANCELLED"
        decimal payout "CHECK >= 0"
        timestamp bet_time
        timestamp created_at
        timestamp updated_at
    }
    
    TRANSACTION {
        int transaction_id PK
        int wallet_id FK
        enum transaction_type "DEPOSIT, WITHDRAWAL, BET, PAYOUT, BONUS_ADJUSTMENT"
        decimal amount "CHECK <> 0"
        timestamp timestamp
        text description
        int reference_id
        decimal balance_before
        decimal balance_after
        timestamp created_at
    }
    
    ROLE {
        int role_id PK
        enum role_name "PLAYER, DEALER, ADMIN" UK
        text description
        timestamp created_at
    }
    
    USER_ROLE {
        int user_role_id PK
        int player_id FK
        int role_id FK
        timestamp assigned_at
        int assigned_by
        tinyint is_active
    }
    
    PERMISSION {
        int permission_id PK
        string permission_name UK
        string resource
        enum action "READ, CREATE, UPDATE, DELETE, EXECUTE"
        text description
        timestamp created_at
    }
    
    ROLE_PERMISSION {
        int role_permission_id PK
        int role_id FK
        int permission_id FK
    }
```

---

## 2. Relational Schema & Constraints Specification

### Table: `PLAYER`
- **Primary Key**: `player_id` (Auto Increment INT)
- **Candidate / Alternate Keys**: `email` (UNIQUE), `phone` (UNIQUE)
- **Integrity Constraints**:
  - `status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'BANNED')`
  - `date_of_birth`: Legal gambling age validation (age >= 18)
  - `email`: Valid RFC format regex check

### Table: `WALLET`
- **Primary Key**: `wallet_id` (Auto Increment INT)
- **Foreign Key**: `player_id` references `PLAYER(player_id)` ON DELETE CASCADE (1:1 Relationship enforced by `player_id UNIQUE`)
- **Integrity Constraints**:
  - `CHECK (balance >= 0)`: Strict non-negative balance constraint to prevent overdrafts.

### Table: `DEALER`
- **Primary Key**: `dealer_id` (Auto Increment INT)
- **Candidate Key**: `employee_id` (UNIQUE)
- **Integrity Constraints**:
  - `shift IN ('MORNING', 'AFTERNOON', 'NIGHT')`
  - `status IN ('ACTIVE', 'INACTIVE', 'ON_LEAVE')`

### Table: `CASINO_TABLE`
- **Primary Key**: `table_id` (Auto Increment INT)
- **Candidate Key**: `table_number` (UNIQUE)
- **Integrity Constraints**:
  - `CHECK (minimum_bet > 0)`
  - `CHECK (maximum_bet > minimum_bet)`
  - `CHECK (capacity > 0 AND capacity <= 10)`

### Table: `GAME`
- **Primary Key**: `game_id` (Auto Increment INT)
- **Foreign Keys**:
  - `table_id` references `CASINO_TABLE(table_id)` ON DELETE RESTRICT
  - `dealer_id` references `DEALER(dealer_id)` ON DELETE RESTRICT
- **Integrity Constraints**:
  - `CHECK (end_time IS NULL OR end_time > start_time)`

### Table: `BET`
- **Primary Key**: `bet_id` (Auto Increment INT)
- **Foreign Keys**:
  - `player_id` references `PLAYER(player_id)` ON DELETE RESTRICT
  - `game_id` references `GAME(game_id)` ON DELETE RESTRICT
- **Integrity Constraints**:
  - `CHECK (amount > 0)`
  - `CHECK (payout >= 0)`
  - Table minimum/maximum bet boundary enforced via SQL trigger `trigger_validate_bet_amount`
  - Balance solvency enforced via trigger `trigger_validate_player_balance`

### Table: `TRANSACTION`
- **Primary Key**: `transaction_id` (Auto Increment INT)
- **Foreign Key**: `wallet_id` references `WALLET(wallet_id)` ON DELETE RESTRICT
- **Integrity Constraints**:
  - `CHECK (amount <> 0)`
  - Double-entry accounting integrity maintained via triggers and stored procedures.

### Role-Based Access Control (RBAC) Subsystem
- **`ROLE`**: Defines system roles (`PLAYER`, `DEALER`, `ADMIN`).
- **`USER_ROLE`**: Implements M:N relationship between `PLAYER` and `ROLE`.
- **`PERMISSION`**: Granular resource permissions (`bet:create`, `bet:settle`, `player:update`, etc.).
- **`ROLE_PERMISSION`**: M:N mapping of roles to permissions.

---

## 3. NoSQL Document & Vector Store (Hybrid Architecture)

| Collection | Store Type | Schema Characteristics | Purpose |
|------------|------------|------------------------|---------|
| `game_logs` | NoSQL Document | Embedded arrays (`events[]`), flexible details | High-velocity audit stream of in-game actions without RDBMS lock contention |
| `player_activities` | NoSQL Document | Embedded sessions (`loginHistory[]`, `activityLog[]`) | User behavioural analytics & fraud detection |
| `casino_analytics` | NoSQL Time-Series | Pre-aggregated 24-hour buckets, game type stats | Sub-millisecond dashboard metrics |
| `game_vectors` | Vector Store | 5-D dense vectors (`[risk, houseEdge, pace, skill, social]`) | Cosine similarity k-NN game recommendations |
| `player_preference_vectors` | Vector Store | 5-D player persona vector embeddings | Dynamic machine learning recommendation profile |

