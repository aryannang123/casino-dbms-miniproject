# Project Changes Log

This document records the fixes applied to the Casino DBMS project.

---

### Change 1: Complete Removal of Dealer `shift` Attribute
* **Reason**: The `shift` attribute was requested to be removed everywhere from the system while retaining `status`.
* **Changes Made**:
  * **Database Schema**:
    * `database/mysql/schema.sql`: Removed `shift ENUM(...)` column and `idx_dealer_shift` index.
    * `database/schema.sql`: Removed `shift VARCHAR(20)` column and `idx_dealer_shift` index.
  * **Database Seeds**:
    * `database/mysql/seed.sql` & `database/seed.sql`: Removed `shift` column and values from `DEALER` table inserts.
  * **Database Queries**:
    * `database/mysql/queries.sql` & `database/queries.sql`: Removed `d.shift` from `SELECT` and `GROUP BY` clauses.
  * **Backend**:
    * `backend/src/controllers/gameController.js`: Removed `shift` from `getDealers` SQL query.
  * **Frontend**:
    * `frontend/app/dealer/page.js`: Removed `({d.shift})` from dealer dropdown selector; replaced with `({d.employee_id})`.
  * **Documentation**:
    * `docs/Database-Design-ER-Diagram.md`: Removed `enum shift` and integrity constraints.

---

### Change 2: Automated Winnings Settlement (Removed Manual Money Input)
* **Reason**: When players won games/bets, the dealer was manually prompted with an input box asking "how much money" to payout.
* **Changes Made**:
  * **Frontend (`frontend/app/dealer/page.js`)**:
    * Replaced the manual `Payout Amount ($)` text input with a read-only auto-calculated payout badge (`2x` wager for standard win, `2.5x` for Blackjack, full refund for push/cancel).
    * Added fast 1-click settlement buttons directly on table rows: `✓ Won`, `✗ Lost`, and `Options`.
    * Standardized currency symbol to `₹` across the dealer view.
  * **Backend (`backend/src/controllers/betController.js`)**:
    * Updated `settleBet` to auto-calculate the payout amount from the bet record if no manual payout is sent, ensuring correct payout calculation regardless of client request format.
  * **Stored Procedures (`database/mysql/procedures.sql` & `database/procedures.sql`)**:
    * Updated `settle_bet` to automatically calculate payout if `p_payout` is `<= 0` or `NULL` on `WON` outcome, crediting the player wallet atomically.

---

### Change 3: Implemented Missing MySQL Procedures (`create_game` & `end_game`)
* **Reason**: `backend/src/controllers/gameController.js` executed `CALL create_game` and `CALL end_game`, but these procedures only existed in PostgreSQL files and were missing in MySQL, causing runtime SQL crashes when starting or ending games.
* **Changes Made**:
  * `database/mysql/procedures.sql`: Added `create_game` procedure (validates table availability, dealer status, marks table `OCCUPIED`, and returns `game_id`).
  * `database/mysql/procedures.sql`: Added `end_game` procedure (validates game, counts pending bets, sets status to `COMPLETED`, releases table back to `AVAILABLE`, and returns summary).

---

### Change 4: Fixed Wallet Double-Crediting & Double-Deduction Conflict
* **Reason**: In MySQL, `place_bet` and `settle_bet` stored procedures already performed atomic wallet balance updates. `database/mysql/triggers.sql` had triggers that also updated wallet balances on bet insert/update, causing 2x deductions and 2x payouts when both were active.
* **Changes Made**:
  * `database/mysql/triggers.sql`: Dropped duplicate `trigger_deduct_bet_from_wallet` and `trigger_credit_payout_to_wallet`, establishing the stored procedures as the single source of truth for ACID-compliant wallet balance updates.
