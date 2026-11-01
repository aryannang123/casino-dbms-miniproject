# Casino DBMS API Documentation

Base URL: `http://localhost:5000/api`

## Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### Register New Player
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1-555-0100",
  "password": "SecurePass123",
  "dateOfBirth": "1990-01-15",
  "address": "123 Main St, Las Vegas, NV"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful!",
  "data": {
    "player": {
      "playerId": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1-555-0100",
      "registrationDate": "2024-10-26",
      "status": "ACTIVE"
    },
    "wallet": {
      "wallet_id": 1,
      "balance": "0.00"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

#### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

---

### Wallet Management

#### Get Wallet Balance
```http
GET /api/wallet
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "wallet_id": 1,
    "player_id": 1,
    "balance": "1250.50",
    "last_updated": "2024-10-26T10:30:00.000Z"
  }
}
```

#### Deposit Funds
```http
POST /api/wallet/deposit
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 500.00,
  "description": "Initial deposit"
}
```

#### Withdraw Funds
```http
POST /api/wallet/withdraw
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 200.00,
  "description": "Cash withdrawal"
}
```

#### Get Transaction History
```http
GET /api/wallet/transactions?page=1&limit=20&type=DEPOSIT
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `type` (optional): Filter by type (DEPOSIT, WITHDRAWAL, BET, PAYOUT)

---

### Games

#### List All Games
```http
GET /api/games?status=ACTIVE&gameType=BLACKJACK&page=1&limit=20
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): ACTIVE, COMPLETED, CANCELLED
- `gameType` (optional): BLACKJACK, POKER, ROULETTE, CRAPS, BACCARAT, SLOTS
- `page` (optional): Page number
- `limit` (optional): Items per page

#### Get Game Details
```http
GET /api/games/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "game_id": 1,
    "game_type": "BLACKJACK",
    "table_number": "BJ-01",
    "dealer_name": "John Smith",
    "start_time": "2024-10-26T10:00:00.000Z",
    "end_time": null,
    "duration": "01:30:00",
    "status": "ACTIVE",
    "total_bets": 15,
    "total_wagered": "2500.00",
    "total_payout": "2100.00",
    "casino_profit": "400.00"
  }
}
```

#### Create Game (Dealer Only)
```http
POST /api/games
Authorization: Bearer <token>
Content-Type: application/json

{
  "tableId": 1,
  "dealerId": 1,
  "gameType": "BLACKJACK"
}
```

#### End Game (Dealer Only)
```http
PUT /api/games/:id/end
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "COMPLETED"
}
```

#### Get Game Bets
```http
GET /api/games/:id/bets?page=1&limit=50
Authorization: Bearer <token>
```

---

### Betting

#### Place Bet
```http
POST /api/bets
Authorization: Bearer <token>
Content-Type: application/json

{
  "gameId": 1,
  "amount": 50.00,
  "betType": "WIN"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bet placed successfully",
  "data": {
    "betId": 123,
    "newBalance": "950.00",
    "amount": 50.00,
    "gameId": 1,
    "betType": "WIN"
  }
}
```

#### Get Bet Details
```http
GET /api/bets/:id
Authorization: Bearer <token>
```

#### Get Bet History
```http
GET /api/bets/history?page=1&limit=20&status=WON
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `status` (optional): PENDING, WON, LOST, CANCELLED

#### Get Player Statistics
```http
GET /api/bets/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "player_id": 1,
    "player_name": "John Doe",
    "total_bets": 45,
    "total_wagered": "5250.00",
    "total_won": "4800.00",
    "total_lost": "2100.00",
    "pending_bets": 2,
    "win_rate": "45.23",
    "current_balance": "1250.50",
    "biggest_win": "500.00",
    "total_games": 12
  }
}
```

#### Settle Bet (Dealer Only)
```http
PUT /api/bets/:id/settle
Authorization: Bearer <token>
Content-Type: application/json

{
  "outcome": "WON",
  "payout": 100.00
}
```

**Bet Outcomes:**
- `WON`: Player wins, payout > 0
- `LOST`: Player loses, payout = 0
- `CANCELLED`: Bet cancelled, payout = 0 (or refund)

---

### Tables

#### List All Tables
```http
GET /api/tables?status=AVAILABLE&gameType=BLACKJACK
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): AVAILABLE, OCCUPIED, MAINTENANCE
- `gameType` (optional): BLACKJACK, POKER, ROULETTE, CRAPS, BACCARAT, SLOTS

#### Get Available Tables
```http
GET /api/tables/available?gameType=POKER
Authorization: Bearer <token>
```

#### Get Table Details
```http
GET /api/tables/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "table": {
      "table_id": 1,
      "table_number": "BJ-01",
      "game_type": "BLACKJACK",
      "minimum_bet": "10.00",
      "maximum_bet": "500.00",
      "status": "OCCUPIED",
      "capacity": 7
    },
    "currentGame": {
      "game_id": 5,
      "game_type": "BLACKJACK",
      "start_time": "2024-10-26T10:00:00.000Z",
      "status": "ACTIVE",
      "dealer_id": 1,
      "dealer_name": "John Smith"
    }
  }
}
```

#### Create Table (Manager Only)
```http
POST /api/tables
Authorization: Bearer <token>
Content-Type: application/json

{
  "tableNumber": "BJ-04",
  "gameType": "BLACKJACK",
  "minimumBet": 25.00,
  "maximumBet": 1000.00,
  "capacity": 7
}
```

#### Update Table Status (Manager Only)
```http
PUT /api/tables/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "MAINTENANCE"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (development only)"
}
```

### Common HTTP Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid input or business rule violation
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists (e.g., duplicate email)
- `500 Internal Server Error`: Server error

---

## Role-Based Access Control

### Player Role
- Can view games and tables
- Can place bets
- Can manage their own wallet
- Can view their own betting history and statistics

### Dealer Role
- All Player permissions
- Can create and end games
- Can settle bets

### Manager Role
- All Dealer permissions
- Can create and manage tables
- Can view all players and statistics

---

## Rate Limiting

API requests are rate-limited to prevent abuse:
- Default: 100 requests per 15 minutes per IP
- Authentication endpoints: Stricter limits apply

---

## Database Procedures Used

The API leverages PostgreSQL stored procedures for complex operations:

- `place_bet()`: Atomic bet placement with balance validation
- `settle_bet()`: Process bet outcome and update wallet
- `deposit_funds()`: Safe deposit with transaction logging
- `withdraw_funds()`: Safe withdrawal with validation
- `create_game()`: Game creation with business rule validation
- `end_game()`: Game completion with state management
- `get_player_statistics()`: Complex statistical aggregation
- `get_game_summary()`: Comprehensive game analytics

---

## Testing

Example using cURL:

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","phone":"+1-555-9999","password":"TestPass123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}'

# Get wallet (replace TOKEN with actual token)
curl -X GET http://localhost:5000/api/wallet \
  -H "Authorization: Bearer TOKEN"
```

For more examples, see the Postman collection in the repository.
