# Casino DBMS Testing Guide

## Table of Contents
1. [Database Testing](#database-testing)
2. [API Testing](#api-testing)
3. [Feature Testing](#feature-testing)
4. [Performance Testing](#performance-testing)
5. [Security Testing](#security-testing)

---

## Database Testing

### Test 1: Schema Validation

```sql
-- Connect to database
\c casino_db

-- Verify all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected: DEALER, PLAYER, CASINO_TABLE, GAME, BET, WALLET, TRANSACTION

-- Check constraints
SELECT constraint_name, table_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
ORDER BY table_name, constraint_type;
```

### Test 2: Data Integrity Constraints

```sql
-- Test 1: Age constraint (should fail for under 18)
INSERT INTO PLAYER (name, email, phone, password_hash, date_of_birth, status)
VALUES ('Minor Player', 'minor@test.com', '+1-555-MINOR', 'hash', '2010-01-01', 'ACTIVE');
-- Expected: ERROR - age check constraint violation

-- Test 2: Negative balance (should fail)
UPDATE WALLET SET balance = -100 WHERE player_id = 1;
-- Expected: ERROR - balance check constraint violation

-- Test 3: Duplicate email (should fail)
INSERT INTO PLAYER (name, email, phone, password_hash, status)
VALUES ('Duplicate', 'alice.cooper@email.com', '+1-555-DUP', 'hash', 'ACTIVE');
-- Expected: ERROR - unique constraint violation

-- Test 4: Bet amount validation (should fail if 0 or negative)
INSERT INTO BET (player_id, game_id, amount, bet_type, outcome)
VALUES (1, 1, -50, 'WIN', 'PENDING');
-- Expected: ERROR - check_bet_amount constraint violation
```

### Test 3: Trigger Testing

```sql
-- Test automatic wallet creation trigger
INSERT INTO PLAYER (name, email, phone, password_hash, status)
VALUES ('Trigger Test', 'trigger@test.com', '+1-555-TRIG', 'hash', 'ACTIVE')
RETURNING player_id;

-- Verify wallet was created
SELECT * FROM WALLET WHERE player_id = (SELECT player_id FROM PLAYER WHERE email = 'trigger@test.com');
-- Expected: Wallet exists with balance = 0.00

-- Test table status update trigger
-- Create a game (table should become OCCUPIED)
SELECT table_id, status FROM CASINO_TABLE WHERE table_id = 1;
-- Insert game and check table status again

-- Cleanup
DELETE FROM PLAYER WHERE email = 'trigger@test.com';
```

### Test 4: Stored Procedure Testing

```sql
-- Test place_bet procedure
SELECT * FROM place_bet(
    1,           -- player_id
    9,           -- game_id (active game)
    50.00,       -- amount
    'WIN'        -- bet_type
);
-- Expected: Success with bet_id, new_balance, message

-- Test insufficient balance error
SELECT * FROM place_bet(1, 9, 999999.00, 'WIN');
-- Expected: ERROR - Insufficient balance

-- Test settle_bet procedure
SELECT * FROM settle_bet(
    (SELECT bet_id FROM BET WHERE outcome = 'PENDING' LIMIT 1),
    'WON',
    100.00
);
-- Expected: Bet settled, wallet updated

-- Test deposit_funds procedure
SELECT * FROM deposit_funds(1, 500.00, 'Test deposit');
-- Expected: Success with new balance and transaction ID

-- Test withdraw_funds procedure
SELECT * FROM withdraw_funds(1, 100.00, 'Test withdrawal');
-- Expected: Success with new balance

-- Test player statistics
SELECT * FROM get_player_statistics(1);
-- Expected: Complete player statistics
```

### Test 5: Complex Query Testing

```sql
-- Test 1: Daily performance report (CTE)
\i database/queries.sql
-- Run the daily stats CTE query

-- Test 2: High rollers query (nested subquery)
-- Should return players above 2x average wagered

-- Test 3: Player rankings (window functions)
-- Should return players with ranks and percentiles

-- Test 4: Game profitability
-- Should show revenue by game type
```

---

## API Testing

### Test 1: Health Check

```bash
curl http://localhost:5000/api/health

# Expected:
{
  "success": true,
  "message": "Casino API is running",
  "timestamp": "2024-10-26T...",
  "environment": "development"
}
```

### Test 2: Authentication Flow

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Test User",
    "email": "apitest@example.com",
    "phone": "+1-555-APITEST",
    "password": "ApiTest123",
    "dateOfBirth": "1990-01-01"
  }'

# Expected: Success with player data, wallet, and token

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "apitest@example.com",
    "password": "ApiTest123"
  }'

# Expected: Success with token
# Save token for next tests

# Test invalid credentials
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "apitest@example.com",
    "password": "WrongPassword"
  }'

# Expected: 401 Unauthorized
```

### Test 3: Protected Routes

```bash
TOKEN="your_token_here"

# Get profile
curl http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer $TOKEN"

# Expected: Profile data

# Test without token (should fail)
curl http://localhost:5000/api/auth/profile

# Expected: 401 Unauthorized

# Test with invalid token (should fail)
curl http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer invalid_token"

# Expected: 401 Invalid token
```

### Test 4: Wallet Operations

```bash
# Check balance
curl http://localhost:5000/api/wallet \
  -H "Authorization: Bearer $TOKEN"

# Deposit
curl -X POST http://localhost:5000/api/wallet/deposit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "description": "Test deposit"}'

# Expected: Success with new balance

# Withdraw
curl -X POST http://localhost:5000/api/wallet/withdraw \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "description": "Test withdrawal"}'

# Expected: Success with new balance

# Test overdraft (should fail)
curl -X POST http://localhost:5000/api/wallet/withdraw \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 999999, "description": "Overdraft test"}'

# Expected: 400 Insufficient balance

# Get transactions
curl "http://localhost:5000/api/wallet/transactions?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"

# Expected: Transaction list with pagination
```

### Test 5: Game and Betting Flow

```bash
# List active games
curl "http://localhost:5000/api/games?status=ACTIVE" \
  -H "Authorization: Bearer $TOKEN"

# Expected: List of active games

# Get game details
curl http://localhost:5000/api/games/9 \
  -H "Authorization: Bearer $TOKEN"

# Expected: Detailed game information

# Place a bet
curl -X POST http://localhost:5000/api/bets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"gameId": 9, "amount": 50, "betType": "WIN"}'

# Expected: Success with bet ID and new balance

# Test betting with insufficient funds (should fail)
curl -X POST http://localhost:5000/api/bets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"gameId": 9, "amount": 999999, "betType": "WIN"}'

# Expected: 400 Insufficient balance

# Get bet history
curl "http://localhost:5000/api/bets/history?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"

# Expected: Bet history with pagination

# Get player statistics
curl http://localhost:5000/api/bets/stats \
  -H "Authorization: Bearer $TOKEN"

# Expected: Complete statistics
```

### Test 6: Input Validation

```bash
# Test invalid email format
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "email": "invalid-email", "phone": "+1-555-TEST", "password": "Test123"}'

# Expected: 400 Validation error

# Test weak password
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "email": "test@example.com", "phone": "+1-555-TEST", "password": "weak"}'

# Expected: 400 Password validation error

# Test negative bet amount
curl -X POST http://localhost:5000/api/bets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"gameId": 9, "amount": -50, "betType": "WIN"}'

# Expected: 400 Validation error
```

---

## Feature Testing

### Test Scenario 1: Complete Player Journey

1. **Register** → Create new account
2. **Login** → Get authentication token
3. **Deposit** → Add $1000 to wallet
4. **Browse Games** → View available games
5. **Place Bet** → Bet $50 on active game
6. **Check Balance** → Verify $950 remaining
7. **View History** → See bet in history
8. **View Stats** → Check player statistics

### Test Scenario 2: Dealer Operations

1. **Login as Dealer** → Use dealer account
2. **Create Game** → Start new game at available table
3. **View Game** → Check game details
4. **Settle Bets** → Process bet outcomes
5. **End Game** → Complete game session
6. **View Performance** → Check dealer statistics

### Test Scenario 3: Manager Operations

1. **Login as Manager** → Use manager account
2. **Create Table** → Add new casino table
3. **View All Tables** → List table inventory
4. **Update Status** → Set table to maintenance
5. **View Reports** → Check casino performance

---

## Performance Testing

### Test 1: Query Performance

```sql
-- Enable timing
\timing on

-- Test 1: Simple query
SELECT * FROM PLAYER WHERE email = 'alice.cooper@email.com';
-- Target: < 5ms

-- Test 2: Join query
SELECT p.name, COUNT(b.bet_id), SUM(b.amount)
FROM PLAYER p
LEFT JOIN BET b ON p.player_id = b.player_id
GROUP BY p.player_id, p.name;
-- Target: < 50ms

-- Test 3: Complex aggregation
SELECT * FROM get_player_statistics(1);
-- Target: < 100ms

-- Check index usage
EXPLAIN ANALYZE
SELECT * FROM BET WHERE player_id = 1 ORDER BY bet_time DESC LIMIT 20;
-- Should use idx_bet_player index
```

### Test 2: Load Testing

Use Apache Bench or similar tool:

```bash
# Install Apache Bench (if not installed)
# Windows: Download from Apache website
# Linux: sudo apt-get install apache2-utils

# Test health endpoint
ab -n 1000 -c 10 http://localhost:5000/api/health

# Expected: 
# - Requests per second: > 100
# - Time per request: < 100ms
# - Failed requests: 0
```

### Test 3: Concurrent Betting

```sql
-- Simulate concurrent bets from multiple players
-- Run these in separate psql sessions simultaneously

-- Session 1:
BEGIN;
SELECT * FROM place_bet(1, 9, 50, 'WIN');
COMMIT;

-- Session 2:
BEGIN;
SELECT * FROM place_bet(2, 9, 75, 'WIN');
COMMIT;

-- Session 3:
BEGIN;
SELECT * FROM place_bet(3, 9, 100, 'WIN');
COMMIT;

-- Verify all bets recorded correctly
SELECT * FROM BET WHERE game_id = 9 ORDER BY bet_time DESC LIMIT 10;
```

---

## Security Testing

### Test 1: SQL Injection Prevention

```bash
# Try SQL injection in login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com OR 1=1--", "password": "anything"}'

# Expected: Failed login (parameterized queries prevent injection)
```

### Test 2: Authentication Bypass Attempts

```bash
# Try accessing protected route without token
curl http://localhost:5000/api/wallet

# Expected: 401 Unauthorized

# Try with malformed token
curl http://localhost:5000/api/wallet \
  -H "Authorization: Bearer fake.token.here"

# Expected: 401 Invalid token

# Try with expired token (wait for expiration or modify JWT_EXPIRES_IN)
# Expected: 401 Token expired
```

### Test 3: Authorization Testing

```bash
# Try dealer-only operation as regular player
curl -X POST http://localhost:5000/api/games \
  -H "Authorization: Bearer $PLAYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tableId": 1, "dealerId": 1, "gameType": "BLACKJACK"}'

# Expected: 403 Insufficient permissions
```

### Test 4: Data Access Control

```bash
# Try accessing another player's data
# Login as player 1, try to access player 2's data
curl http://localhost:5000/api/wallet \
  -H "Authorization: Bearer $PLAYER1_TOKEN"

# Should only return player 1's wallet, not player 2's
```

---

## Test Results Checklist

### Database Tests
- [ ] All tables created successfully
- [ ] All constraints working correctly
- [ ] Triggers executing as expected
- [ ] Stored procedures functioning properly
- [ ] Complex queries returning correct results
- [ ] Indexes improving query performance

### API Tests
- [ ] Health check responds
- [ ] Registration working
- [ ] Login/logout functioning
- [ ] Protected routes secured
- [ ] Wallet operations correct
- [ ] Betting flow complete
- [ ] Input validation active
- [ ] Error handling appropriate

### Performance Tests
- [ ] Queries under target time
- [ ] API handling concurrent requests
- [ ] No deadlocks or race conditions
- [ ] Memory usage acceptable
- [ ] Connection pool performing well

### Security Tests
- [ ] SQL injection prevented
- [ ] Authentication enforced
- [ ] Authorization working
- [ ] Data access controlled
- [ ] Sensitive data protected

---

## Automated Testing (Optional)

Create a test script:

```javascript
// backend/tests/api.test.js
const request = require('supertest');
const app = require('../src/server');

describe('Casino API Tests', () => {
    test('Health check should return 200', async () => {
        const response = await request(app).get('/api/health');
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });

    test('Register should create new player', async () => {
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Test Player',
                email: `test${Date.now()}@example.com`,
                phone: `+1-555-${Date.now()}`,
                password: 'TestPass123',
                dateOfBirth: '1990-01-01'
            });
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
    });
});
```

Run tests:
```bash
cd backend
npm test
```

---

**Testing Complete!** ✅

For issues or questions, refer to the [Setup Guide](Setup-Guide.md) or [API Documentation](API-Documentation.md).
