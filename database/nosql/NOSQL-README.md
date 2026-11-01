# NoSQL Layer — MongoDB Analytics

> **Companion to the MySQL relational database.**  
> This layer handles high-velocity event streams, flexible audit trails, and
> pre-aggregated analytics — things that would be expensive or awkward in a
> purely relational schema.

---

## Why MongoDB Alongside MySQL?

| Concern | MySQL (Relational) | MongoDB (Document) |
|---------|-------------------|--------------------|
| Transactional integrity (bets, wallets) | ✅ ACID transactions, foreign keys | ❌ Not the right tool |
| Structured domain data (players, games, dealers) | ✅ Strong schema, JOINs | ❌ Overkill |
| Append-only event streams (game events) | ⚠️ Row-per-event gets expensive | ✅ Array push in one document |
| Flexible per-event payloads | ❌ Rigid column schema | ✅ Mixed/arbitrary fields |
| Pre-aggregated time-series analytics | ⚠️ Requires heavy GROUP BY | ✅ `$group` / `$unwind` pipelines |
| Session / login history | ⚠️ Extra normalised tables | ✅ Embedded arrays |
| Schema evolution (new event types) | ❌ ALTER TABLE, migrations | ✅ Add field, done |

**Verdict:** MySQL owns the source-of-truth for money and identity; MongoDB owns
the audit trail and analytics layer. The two stores reference each other by
MySQL primary keys (`player_id`, `game_id`) without hard foreign-key coupling.

---

## Collections

### `game_logs`

One document per game session. Embeds every in-game event as an array element.

```js
{
  gameId:       1001,           // → MySQL GAME.game_id
  gameType:     "BLACKJACK",
  tableNumber:  3,
  dealerName:   "Alice Johnson",
  playersCount: 4,
  totalBets:    18,
  totalWagered: 2750.00,
  totalPayout:  2480.00,
  houseProfit:  270.00,
  startTime:    ISODate("…"),
  endTime:      ISODate("…"),
  status:       "COMPLETED",    // ACTIVE | COMPLETED | ABANDONED | ARCHIVED
  events: [
    {
      type:      "BET_PLACED",
      playerId:  1,             // → MySQL PLAYER.player_id
      amount:    200,
      timestamp: ISODate("…"),
      details:   { round: 1 }
    },
    …
  ]
}
```

**Why embed events?** A typical game session has 10–100 events. Embedding keeps
the entire life-cycle in one read, eliminating JOINs and making the document
self-contained for audit purposes.

---

### `player_activities`

One document per player. Contains login history and an append-only activity log.

```js
{
  playerId:         1,           // → MySQL PLAYER.player_id (unique index)
  playerName:       "John Doe",
  email:            "john.doe@example.com",
  loginHistory: [
    { timestamp: ISODate("…"), ip: "192.168.1.10", userAgent: "Chrome/119" },
    …
  ],
  sessionCount:     4,
  lastSeen:         ISODate("…"),
  totalSessionTime: 340,         // minutes
  activityLog: [
    { action: "LOGIN", timestamp: ISODate("…"), details: { ip: "…" } },
    { action: "WIN",   timestamp: ISODate("…"), details: { amount: 300 } },
    …
  ]
}
```

**Why a document per player?** Login history and activity are always queried per
player. A single document fetch replaces what would otherwise be a JOIN across
multiple audit tables.

---

### `casino_analytics`

One document per calendar day. Pre-aggregated from game logs, refreshed
periodically via `POST /api/analytics/daily/refresh`.

```js
{
  date: ISODate("2024-01-15T00:00:00Z"),  // midnight UTC, unique index
  hourlyData: [
    { hour: 0,  gamesPlayed: 1, betsPlaced: 4,  revenue: 120.00 },
    { hour: 1,  gamesPlayed: 0, betsPlaced: 0,  revenue: 0 },
    …
    { hour: 20, gamesPlayed: 8, betsPlaced: 34, revenue: 1200.00 },
    …
  ],
  gameTypeStats: [
    { gameType: "BLACKJACK", gamesPlayed: 8, revenue: 1890.00, playerCount: 24 },
    …
  ],
  dailyRevenue:  4470.00,
  dailyPlayers:  42,
  peakHour:      20
}
```

**Why pre-aggregate?** Dashboard queries that span 30 days hit 30 documents
with simple arithmetic — no full table scan of millions of game-event rows.

---

## File Map

```
database/nosql/
├── mongodb-schema.js    ← Mongoose schema definitions (all three collections)
├── mongodb-setup.js     ← INSERT demo — run once to populate sample data
├── mongodb-queries.js   ← RUD + aggregation query showcase
└── NOSQL-README.md      ← This file

backend/src/
├── config/mongodb.js                    ← Mongoose connection + model re-exports
├── models/
│   ├── GameLog.js                       ← Re-export of GameLog model
│   ├── PlayerActivity.js                ← Re-export of PlayerActivity model
│   └── CasinoAnalytics.js              ← Re-export of CasinoAnalytics model
├── controllers/analyticsController.js  ← Business logic for all analytics ops
└── routes/analyticsRoutes.js           ← Express router (JWT-protected)
```

---

## API Endpoints

All endpoints require a `Authorization: Bearer <token>` header.

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/analytics/daily/:date` | Daily stats for `YYYY-MM-DD` |
| `GET`  | `/api/analytics/game/:gameId` | Full game log with all events |
| `GET`  | `/api/analytics/player/:playerId` | Player activity history |
| `POST` | `/api/analytics/game/:gameId/event` | Append event to game log |
| `POST` | `/api/analytics/daily/refresh` | Re-aggregate today (admin only) |

### POST body — Log a game event

```json
{
  "eventType":   "BET_PLACED",
  "amount":      200,
  "details":     { "betType": "RED", "round": 3 },
  "gameType":    "ROULETTE",
  "tableNumber": 7
}
```

---

## Quick Start

```bash
# 1. Install mongoose (from the backend directory)
cd backend
npm install mongoose

# 2. Add MONGODB_URI to your .env
echo "MONGODB_URI=mongodb://localhost:27017/casino_analytics" >> .env

# 3. Insert sample data
node database/nosql/mongodb-setup.js

# 4. Run the query showcase
node database/nosql/mongodb-queries.js

# 5. Start the full server (MongoDB connection is attempted at startup)
npm run dev
```

> [!NOTE]
> MongoDB is **optional**. If `MONGODB_URI` is not set or MongoDB is
> unreachable, the server starts normally and MySQL features continue to work.
> Analytics endpoints return `503 Service Unavailable` until MongoDB is back.

> [!TIP]
> Use [MongoDB Compass](https://www.mongodb.com/products/compass) to visually
> browse the `casino_analytics` database while running the setup/query scripts.

---

## Indexes

| Collection | Index | Purpose |
|-----------|-------|---------|
| `game_logs` | `gameId` (asc) | Fast lookup by MySQL game reference |
| `game_logs` | `{ startTime: -1, status: 1 }` | Date-range + status filtering |
| `game_logs` | `{ gameType: 1, startTime: -1 }` | Per-type time-series queries |
| `player_activities` | `playerId` (unique) | One doc per player, instant lookup |
| `player_activities` | `lastSeen: -1` | Find recently active players |
| `casino_analytics` | `date` (unique, desc) | One doc per day, range queries |

---

## Design Decisions

1. **MySQL IDs as references, not ObjectIds** — `gameId` and `playerId` store
   MySQL integer PKs. This avoids a separate lookup layer and makes it easy to
   cross-reference from a MySQL query result.

2. **Embedded events vs. separate collection** — Events are embedded in the
   GameLog document because they are always accessed together with their parent
   game. A separate `events` collection would require an extra query every time.

3. **Soft-delete via `status: ARCHIVED`** — Game logs are never hard-deleted
   during normal operation. The `archiveOldGameLogs` utility flips the status,
   preserving the full audit trail while keeping active queries fast.

4. **Graceful degradation** — The Express server does not crash if MongoDB is
   unavailable. The `isMongoConnected()` guard in the controller returns `503`
   cleanly, allowing MySQL-backed routes to keep serving traffic.
