from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.section import WD_SECTION

OUT = 'docs/Casino_DBMS_End_to_End_Study_Guide.docx'
doc = Document()
sec = doc.sections[0]
sec.top_margin = Inches(.7); sec.bottom_margin = Inches(.7)
sec.left_margin = Inches(.8); sec.right_margin = Inches(.8)
styles = doc.styles
styles['Normal'].font.name = 'Aptos'; styles['Normal'].font.size = Pt(10)
styles['Normal'].paragraph_format.space_after = Pt(5)
for name, size, color in [('Title', 26, '17365D'), ('Heading 1', 19, '17365D'), ('Heading 2', 14, '1F4E79'), ('Heading 3', 11, '2F5597')]:
    s=styles[name]; s.font.name='Aptos Display'; s.font.size=Pt(size); s.font.bold=True; s.font.color.rgb=RGBColor.from_string(color)
    s.paragraph_format.space_before=Pt(12); s.paragraph_format.space_after=Pt(5)

def shade(cell, fill):
    tcPr=cell._tc.get_or_add_tcPr(); shd=OxmlElement('w:shd'); shd.set(qn('w:fill'), fill); tcPr.append(shd)
def p(text='', style=None, boldlead=None):
    para=doc.add_paragraph(style=style)
    if boldlead and text.startswith(boldlead):
        para.add_run(boldlead).bold=True; para.add_run(text[len(boldlead):])
    else: para.add_run(text)
    return para
def h(text, level=1): doc.add_heading(text, level)
def bullets(items):
    for x in items: doc.add_paragraph(x, style='List Bullet')
def numbered(items):
    for x in items: doc.add_paragraph(x, style='List Number')
def table(headers, rows, widths=None):
    t=doc.add_table(rows=1, cols=len(headers)); t.style='Light Shading Accent 1'; t.alignment=WD_TABLE_ALIGNMENT.CENTER
    for i,x in enumerate(headers):
        c=t.rows[0].cells[i]; c.text=x; shade(c,'17365D')
        for r in c.paragraphs[0].runs: r.font.bold=True; r.font.color.rgb=RGBColor(255,255,255)
    for row in rows:
        cells=t.add_row().cells
        for i,x in enumerate(row): cells[i].text=x; cells[i].vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
    doc.add_paragraph()
    return t

# Cover and opening
title=doc.add_paragraph(style='Title'); title.alignment=WD_ALIGN_PARAGRAPH.CENTER; title.add_run('Casino DBMS End to End Study Guide')
sub=doc.add_paragraph(); sub.alignment=WD_ALIGN_PARAGRAPH.CENTER
r=sub.add_run('How the application works, which database concepts it demonstrates, and how to explain it in a viva'); r.italic=True; r.font.size=Pt(12); r.font.color.rgb=RGBColor.from_string('52677F')
doc.add_paragraph()
p('This guide follows the project from a browser request through Express, MySQL or MongoDB, and back to the interface. It focuses on the evaluation topics other than the ER diagram and relational schema, as requested. The source of truth for implementation descriptions is the checked-in code under backend/, frontend/, and database/mysql/ and database/nosql/.')
p('Learn both the intended design and the current behavior. A strong viva answer describes the relevant concept, points to the code that applies it, and states its limits honestly. Several implementation defects are called out explicitly because they affect the actual flow.')
h('How to use this guide',2)
numbered(['First read the system map and the request lifecycle.','Then study the rubric topic chapters, using the file paths as evidence.','Practice the viva questions aloud without reading the answer.','Run the demonstration using docs/Project-Demo-Guide.md.','Finish with the implementation caveats: they are likely examiner follow-up questions.'])
h('Project at a glance',1)
table(['Layer','Technology','Responsibility'],[
('Web client','Next.js 14, React, Axios, Tailwind CSS','Pages for login, dashboard, games, wallet, dealer, admin, and analytics; stores/attaches bearer token.'),
('HTTP API','Node.js, Express','Routes requests, validates/authorizes them, calls controllers, returns JSON.'),
('Transactional database','MySQL 8, InnoDB','Players, wallets, bets, games, dealers, tables, transactions, and RBAC.'),
('Document/analytics store','MongoDB with Mongoose','Game event logs, player activity, casino aggregates, preference and game vectors.'),
('Recommendation math','JavaScript cosine similarity','Ranks game vectors by angular similarity to a player preference vector.')])
p('One sentence: This is a casino operations teaching application whose main learning goal is to demonstrate relational integrity and transactional money operations, plus API integration, authorization, complex SQL, document storage, and a small vector-recommendation example.')

h('1. End to end architecture and request flow',1)
h('1.1 The normal HTTP path',2)
numbered(['A user interacts with a Next.js page. The page calls a helper in frontend/lib/api.js.','Axios sends JSON to the Express API at /api and attaches Authorization: Bearer <JWT> when a token exists.','Express middleware parses JSON, applies Helmet/CORS/compression/logging, then routes under /api.','A route selects middleware such as authenticate, authorize, or hasPermission, then calls a controller.','The controller calls query() or callProcedure() in backend/src/config/database.js. Those helpers use the mysql2 promise pool and parameterized statements.','MySQL constraints, triggers, and procedures enforce data rules and perform writes. Some read-only or analytics controller paths also call Mongoose models.','The controller maps database rows/errors into an HTTP status and JSON payload. The page updates its displayed state.'])
p('Evidence: backend/src/server.js mounts routes; backend/src/routes/index.js connects endpoint groups; backend/src/config/database.js configures mysql2; frontend/lib/api.js is the browser API client.')
h('1.2 Why split the data stores?',2)
p('MySQL is the system of record for entities with important relationships and money effects. DECIMAL, foreign keys, transactions, row locking, and constraints fit wallet and bet state. MongoDB stores flexible nested events and analytics-shaped documents where a game can emit different event payloads. MySQL integer IDs are copied into MongoDB documents as references; there is no cross-database foreign key or distributed transaction.')
p('Viva distinction: polyglot persistence means using multiple data stores for different access patterns. It does not mean MongoDB replaces MySQL for account balances. A write that changes both stores would need retry/outbox/idempotency design for reliability; the current application does not implement a general cross-store transaction.')

h('1.3 How to read the repository',2)
p('Start at backend/src/server.js and frontend/app/layout.js. Those are the application roots. Then follow the route map from frontend/lib/api.js into backend/src/routes, next into middleware/controllers, and finally into database/mysql or the Mongo models. A page file renders UI; its imported API helper determines the request; the route establishes the URL, HTTP method, and guard; the controller does the work.')
table(['Project area','Main files','How to use them when tracing behavior'],[
('Application startup','backend/src/server.js; frontend/app/layout.js','Find middleware, route mounting, global context, and top-level shell.'),
('Browser API client','frontend/lib/api.js','Find base URL, token header, response handling, and endpoint helper functions.'),
('HTTP dispatch','backend/src/routes/*.js','Find endpoint method/path and authentication/role/validation middleware order.'),
('Business behavior','backend/src/controllers/*.js','Find SQL, procedure calls, branching, and response JSON.'),
('SQL access','backend/src/config/database.js','Find pool configuration, placeholders, query execution, and CALL wrapper.'),
('Relational behavior','database/mysql/*.sql','Find tables, procedures, triggers, seed rows, and reports.'),
('Document behavior','backend/src/config/mongodb.js; backend/src/models/*.js; database/nosql/*.js','Find Mongo connection, model imports, schemas, seed operations, and vector demo.')])

h('2. Feature walkthrough by user journey',1)
p('This chapter is the project-specific tour: it identifies the screen, browser code, route, middleware, controller, and database work for each important user action. Follow the numbered chain in a viva rather than describing files as an isolated list.')
h('2.1 Registration and login',2)
table(['Step','File and behavior'],[
('1. UI','frontend/app/register/page.js collects name, email, phone, date of birth, and password; checks required fields, confirm-password equality, six-character minimum, and age 18+ in the browser. frontend/app/login/page.js collects email/password.'),
('2. Auth state','frontend/components/AuthProvider.js calls authAPI.register/login, saves token and user in localStorage, and exposes context to pages.'),
('3. HTTP helper','frontend/lib/api.js defines POST /auth/register and POST /auth/login. Its Axios request interceptor reads localStorage token for later requests.'),
('4. Route','backend/src/routes/authRoutes.js exposes public POST /register and /login; profile/logout require authenticate.'),
('5. Controller','backend/src/controllers/authController.js checks duplicates, bcrypt-hashes the password, inserts PLAYER, reads it back with roles, signs a JWT, and returns player + wallet + token.'),
('6. SQL effects','PLAYER insert invokes trigger_create_wallet and trigger_assign_default_role, producing a zero-balance WALLET and default PLAYER role when those triggers exist.'),
('7. Later protected request','backend/src/middleware/auth.js verifies JWT, reloads status/roles from MySQL, then writes req.user for controllers.')])
p('Important contract detail: AuthProvider expects the nested response data and extracts data.token and data.player; login then routes ADMIN to /admin, DEALER to /dealer, otherwise to /dashboard. Signup’s age rule exists in the browser; the schema itself does not enforce minimum age. Browser validation is easy to bypass, so server/database validation is where a production rule must be enforced.')
h('2.2 Wallet deposit, withdrawal, balance, and history',2)
table(['Step','File and behavior'],[
('UI','frontend/app/wallet/page.js loads wallet and transaction list, submits deposit/withdrawal forms, and refreshes the displayed data.'),
('API helper','frontend/lib/api.js wallet helpers call GET /wallet, POST /wallet/deposit, POST /wallet/withdraw, GET /wallet/transactions.'),
('Guard','backend/src/routes/walletRoutes.js applies authenticate and authorize(PLAYER) to every wallet route; deposit/withdraw also use walletTransactionValidation.'),
('Controller read path','backend/src/controllers/walletController.js reads WALLET by req.user.playerId, then reads TRANSACTION by wallet_id with pagination and optional type.'),
('Controller write path','deposit and withdraw call callProcedure() for deposit_funds/withdraw_funds and map the returned wallet/balance/transaction IDs to JSON.'),
('Database path','database/mysql/procedures.sql locks WALLET FOR UPDATE, validates amount/balance, changes balance, inserts a ledger row, and commits; triggers also observe wallet updates.')])
p('The page shows a software wallet only: the project does not connect to a payment provider or real cash. Amount values are database DECIMAL, while the browser displays formatted numbers. History comes from TRANSACTION; because both stored procedures and wallet triggers insert transaction rows, duplicates can appear.')
h('2.3 Game catalog and game details',2)
table(['Step','File and behavior'],[
('List UI','frontend/app/games/page.js calls gamesAPI.list and renders returned games.'),
('Detail UI','frontend/app/games/[id]/page.js loads game details and wallet, collects bet amount/type, invokes betsAPI.place, then refreshes wallet.'),
('API helper','frontend/lib/api.js maps gamesAPI.list/get/create to /games endpoints.'),
('Routes','backend/src/routes/gameRoutes.js protects list/detail/bets with authenticate; create/end require DEALER or ADMIN.'),
('Read controller','backend/src/controllers/gameController.js queries GAME joined to CASINO_TABLE and DEALER; getGameBets joins BET to PLAYER.'),
('Write controller','createGame/endGame call SQL using PostgreSQL-style function syntax and expect create_game/end_game result sets.')])
p('Current limitation: database/mysql/procedures.sql does not define create_game or end_game. The checked-in game controller uses $1 placeholders and SELECT * FROM function syntax, while the database helper is MySQL and expects ? placeholders. These actions therefore do not match the MySQL implementation as checked in. Reads use ? and are closer to working. Also, getGame returns only core game/table/dealer fields; older API docs promise extra totals that this query does not calculate.')
h('2.4 Bet placement, history, and settlement',2)
table(['Step','File and behavior'],[
('Player UI','frontend/app/games/[id]/page.js calls betsAPI.place with gameId, amount, betType. Dashboard and game detail show resulting data.'),
('Route guard','backend/src/routes/betRoutes.js authenticates placement/history/stats/detail; placement validates input; settlement requires DEALER or ADMIN.'),
('Place controller','backend/src/controllers/betController.js takes playerId from authenticated req.user, calls place_bet, and maps bet_id/new_balance into response.'),
('Procedure','database/mysql/procedures.sql checks active player/game, locks wallet, verifies funds, inserts pending BET, debits wallet, commits.'),
('Trigger side effects','database/mysql/triggers.sql validates table min/max, balance, statuses, and active game; AFTER INSERT also debits the wallet.'),
('History/detail','Controller queries filter by req.user.playerId and join GAME/CASINO_TABLE; stats uses get_player_statistics.'),
('Settlement','Dealer endpoint calls settle_bet; procedure updates bet and credits wallet for a win; BET update trigger also reacts to a pending-to-won transition.')])
p('The intended transaction narrative is strong for an exam answer, but actual execution is incorrect due to duplicated wallet effects. The procedure path can debit twice on placement and credit twice on a win. Cancellation semantics also need careful review because settlement only credits for WON, not CANCELLED. Use this feature to explain why triggers and procedures must have a clearly assigned ownership boundary.')
h('2.5 Dealer session interface',2)
p('frontend/app/dealer/page.js loads game and table lists, displays active games and their bets, posts a game creation request, ends a session, and submits bet settlement. It talks directly to /games, /tables, and /bets through the shared Axios client. backend/src/routes/gameRoutes.js permits create/end for DEALER or ADMIN; betRoutes permits settlement for those roles. However, game create/end hit the controller mismatch described above. Table list is a read path; table list filtering can also fail when filter params are supplied because tableController uses PostgreSQL $n placeholders with mysql2.')
h('2.6 Admin control panel and role assignment',2)
p('frontend/app/admin/page.js loads /auth/players, submits status changes to PATCH /auth/players/:id/status, and assigns a role through POST /auth/assign-role. authRoutes.js protects all three routes with authenticate and authorize(ADMIN). authController.js queries PLAYER, WALLET, USER_ROLE, and ROLE; role assignment calls the assign_role stored procedure in rbac.sql. That procedure checks the assigner has ADMIN, resolves the role ID, then inserts/re-activates USER_ROLE. RBAC seed maps ADMIN to every permission.')
p('This panel changes player status and role assignment. The database does not dynamically evaluate the PERMISSION table for all routes: most route guards check role names via authorize. hasPermission() exists in auth middleware but is not used by these route declarations. The distinction matters: permission records demonstrate RBAC data, while enforcement is largely role-based at the HTTP layer.')
h('2.7 Tables and table management',2)
p('frontend/app/dealer/page.js and frontend/app/games/page.js read table/game data; frontend/app/admin/page.js appears to be the user/role admin screen. tableRoutes.js offers list, available, detail, create, and status update routes. Reads go to tableController.js and MySQL tables CASINO_TABLE, GAME, DEALER. Create/status are marked MANAGER-only, but ROLE.role_name permits only PLAYER, DEALER, ADMIN; there is no MANAGER role in the schema or seed. In addition, tableController.js contains PostgreSQL placeholders ($1 etc.), RETURNING syntax, and error code 23505. Those are incompatible with the MySQL helper. Table creation/status updates therefore are not functional as written, and even ADMIN does not satisfy the MANAGER guard.')
h('2.8 Dashboard and client data',2)
p('frontend/app/dashboard/page.js issues three parallel requests with Promise.all: wallet balance, bet history, and game list. It builds stat cards and recent bets in the browser. A key detail: its “win rate” is calculated from the currently loaded bets array (the API defaults to a page of 20), so the label “All time” is not necessarily true. The dashboard is a client-side composition of existing APIs, not a separate backend dashboard endpoint.')
h('2.9 Mongo analytics and recommendation page',2)
p('frontend/app/analytics/page.js loads /analytics/vectors and the signed-in player recommendation, then lets the user change five sliders and POST a query vector to /analytics/vectors/recommend. backend/src/routes/analyticsRoutes.js authenticates these endpoints. analyticsController.js reads all GameVectorEmbedding documents, calculates cosineSimilarity in JavaScript, sorts descending, and returns topK. The Mongo setup file seeds the game vectors and a preference vector. Vector upsert/delete and daily analytics refresh require ADMIN.')
p('Game event logging is a separate explicit POST /analytics/game/:gameId/event route. The SQL bet placement/settlement controllers do not automatically call this endpoint or publish Mongo events. Therefore Mongo telemetry is not a synchronized mirror of every MySQL action. Daily refresh aggregates Mongo GameLog documents and stores a CasinoAnalytics document; peakHour is hard-coded to 20 in the controller.')
h('2.10 Logout and browser token behavior',2)
p('AuthProvider.logout removes token/user from localStorage and clears React state; it does not call the backend logout route. The backend logout response itself says remove the token client-side. Axios removes localStorage state and redirects to /login on a 401 response. Since there is no token revocation list, a copied JWT remains valid until expiry unless its player becomes inactive or the JWT secret changes.')

h('3. Endpoint and role map',1)
table(['Endpoint group','Routes and access','Primary controller/model'],[
('Health','GET /api/health; public','backend/src/routes/index.js'),
('Auth','POST register/login public; profile/logout any signed-in; player listing/status/assign role ADMIN','authRoutes.js -> authController.js -> PLAYER, USER_ROLE, WALLET'),
('Games','GET list/detail/bets any signed-in; POST create and PUT end DEALER/ADMIN','gameRoutes.js -> gameController.js -> GAME, table, dealer, bet'),
('Bets','POST place, GET history/stats/detail any signed-in; PUT settle DEALER/ADMIN','betRoutes.js -> betController.js -> BET/WALLET and procedures'),
('Wallet','All routes authenticate + PLAYER role','walletRoutes.js -> walletController.js -> WALLET/TRANSACTION'),
('Tables','GET routes any signed-in; POST/PUT marked MANAGER','tableRoutes.js -> tableController.js -> CASINO_TABLE/GAME'),
('Analytics','Most reads/event logging any signed-in; refresh/upsert/delete ADMIN','analyticsRoutes.js -> analyticsController.js -> Mongo models')])
p('Role labels in UI and route code are not fully aligned with the MySQL role set. The supported role enum is PLAYER/DEALER/ADMIN, but table routes require MANAGER. Also, /analytics/player/:playerId and /analytics/vectors/player/:playerId allow any authenticated user to supply a player ID; they do not restrict access to their own ID in the route shown.')

h('4. DDL and integrity constraints',1)
p('The active DDL is database/mysql/schema.sql, with RBAC additions in database/mysql/rbac.sql. CREATE TABLE is DDL. InnoDB is selected so relational writes can participate in ACID transactions and honor foreign keys.')
h('4.1 Constraint types and why they matter',2)
table(['Mechanism','Project example','What it protects'],[
('PRIMARY KEY','player_id, bet_id, wallet_id','Unique row identity; referenced by joins and foreign keys.'),
('FOREIGN KEY','BET.player_id -> PLAYER; GAME.table_id -> CASINO_TABLE','Prevents orphan records and controls delete behavior.'),
('UNIQUE','PLAYER.email, PLAYER.phone, WALLET.player_id','Prevents duplicate account identifiers and enforces one wallet per player.'),
('NOT NULL','BET.amount, PLAYER.password_hash','Requires a value for fields essential to valid records.'),
('CHECK','WALLET.balance >= 0; BET.amount > 0','Rejects invalid numeric values at the database boundary.'),
('ENUM','status, game_type, outcome','Restricts a column to a known set of values.'),
('DEFAULT','BET.outcome defaults to PENDING; timestamps','Provides a standard value when an insert omits the field.')])
p('DECIMAL is used for financial amounts to avoid binary floating-point representation errors. A JavaScript Number still uses floating-point semantics, so robust payment code would validate and normalize decimal strings or integer cents at API boundaries as well.')
h('4.2 Referential actions',2)
p('WALLET.player_id cascades on player deletion in the DDL, while BET references PLAYER and GAME with RESTRICT, and TRANSACTION references WALLET with RESTRICT. These choices mean history records can block deleting a player or wallet. A trigger also rejects deletion while pending bets exist. Explain that referential actions make deletion semantics explicit; they do not replace an audit-retention policy.')
h('4.3 Indexes',2)
p('The schema adds indexes on common search, join, and sort fields, such as email, status, game status/start time, bet player/game/outcome/time, and transaction wallet/type/time. An index is an auxiliary search structure that can reduce row scanning for matching predicates. Indexes consume storage and slow writes because they must also be maintained. PLAYER.email and some other UNIQUE columns already get indexes from MySQL, so explicit duplicate indexes may be redundant.')

h('5. DML and seed data',1)
p('DML includes INSERT, UPDATE, DELETE, and SELECT. database/mysql/seed.sql inserts example dealers, tables, players, wallets, games, and bets. It also uses expressions such as RAND() to assign wallet balances. It is a demonstration dataset, not a safe production migration.')
p('Important execution-order detail: the player insert trigger creates a wallet; the seed later inserts wallets for all players explicitly. Since wallet.player_id is unique, the seed can fail on duplicate wallet rows when triggers have already created them. The current trigger set also reacts to seeded bet inserts, changing balances and transaction rows. A clean seed strategy should avoid doing the same work in both seed SQL and triggers.')
h('5.1 DML concepts to explain',2)
bullets(['INSERT creates a row; UPDATE changes selected existing rows; DELETE removes rows subject to constraints and triggers.','SELECT retrieves data; a JOIN combines related rows through keys; GROUP BY forms aggregate groups.','Seed data lets the evaluator inspect realistic relationships and run reports without manual entry.','A repeatable seed script should be idempotent or explicitly reset the database; this seed is not fully safe to re-run.'])

h('6. Query techniques: joins, nested queries, correlated queries, and CTEs',1)
p('The main advanced SQL examples are in database/mysql/queries.sql. Treat each query as a demonstration of how to derive a report from normalized source tables.')
table(['Technique','How it works','Project example'],[
('JOIN','Combines rows using a relationship predicate.','Game performance joins GAME, CASINO_TABLE, DEALER, and BET.'),
('LEFT JOIN','Keeps rows from the left side even without a match.','Daily/game reports retain games with zero bets.'),
('Aggregate','COUNT, SUM, AVG, MAX summarize groups.','Wagered amount, payout, player count, house profit.'),
('CTE','WITH names an intermediate query for the statement.','daily_stats then summary produce a daily performance report.'),
('Recursive CTE','Repeatedly expands a parent-child relation from a base case.','Referral chain builds a path and depth.'),
('Nested subquery','A SELECT is embedded inside another query.','High rollers compare per-player totals with an average.'),
('Correlated subquery','Inner query refers to a row from the outer query.','Pending bet count per player; average wallet comparison.'),
('Conditional aggregation','CASE WHEN inside aggregate computes multiple categories.','Sum payouts only for WON bets; count pending bets.')])
h('6.1 Explain a CTE clearly',2)
p('A CTE is a named temporary result that exists for one SQL statement. It improves organization and lets later query blocks refer to an earlier result. It is not automatically a stored table or guaranteed performance optimization. In the daily report, daily_stats aggregates by date and game type; summary adds all game types per day; the final SELECT joins those results to calculate contribution percentage.')
h('6.2 Recursive CTE example',2)
p('The referral query has a base case (players with no referrer) and a recursive case (find players whose referred_by matches a player already in the chain). Each step adds one level and extends referral_path. The level < 10 condition limits runaway recursion, but it does not prove the graph has no cycles. The query depends on an optional PLAYER.referred_by column that is commented out in the schema, so it will not run as-is until the column and self-referencing foreign key are added.')
h('6.3 Join multiplication hazard',2)
p('When one game joins to many bets, summing a game-level value after the join can repeat that value once per bet. Use correct grouping, distinct counts, or pre-aggregate at the relevant grain. State the grain of each report: one row per game, per date/game type, per player, or per transaction type.')

h('7. Stored procedures, transactions, and concurrency',1)
p('The stored procedures are in database/mysql/procedures.sql. Procedures encapsulate multi-step database operations and return result sets that the API maps into JSON. They use START TRANSACTION, COMMIT, exception handlers that ROLLBACK and RESIGNAL, and SELECT ... FOR UPDATE for wallet/bet rows.')
h('7.1 place_bet flow',2)
numbered(['Start a transaction.','Read and validate that the player exists and is ACTIVE.','Read and validate that the game exists and is ACTIVE.','Lock the player wallet row using SELECT ... FOR UPDATE.','Reject if the balance is below the amount.','Insert a PENDING bet.','Subtract the amount from the wallet.','Read the new balance and commit. Return bet id, balance, and message.'])
p('The row lock serializes concurrent updates to the same wallet, reducing the chance that two requests both spend the same balance. The CHECK on balance is a second invariant barrier. The procedure needs explicit positive amount validation and table-limit validation itself if it is ever called outside paths that invoke triggers; the trigger currently checks table limits.')
h('7.2 settle_bet flow',2)
p('The procedure locks the bet, verifies it is PENDING, writes its outcome and payout, and credits the wallet for a WON outcome with positive payout. It then returns the new balance. It does not fully validate the allowed outcome/payout combination, and its update can invoke the payout trigger too, which is a current double-credit defect.')
h('7.3 ACID in this code',2)
table(['Property','Meaning','Connection to this project'],[
('Atomicity','All steps happen or none do.','Bet procedure rolls back if an SQL exception is raised.'),
('Consistency','Rules remain true before and after a transaction.','Constraints and business validations intend to keep balances and bet state valid.'),
('Isolation','Concurrent operations should not interfere incorrectly.','FOR UPDATE locks the wallet/bet row during critical updates.'),
('Durability','Committed changes survive failures.','InnoDB persists committed rows according to its configuration.')])
p('Isolation is not a magic guarantee against every race. The exact isolation level, locking predicates, indexes, and transaction boundaries matter. Deadlocks can still happen and applications should be prepared to retry safe idempotent operations.')

h('8. Triggers and procedural business rules',1)
p('database/mysql/triggers.sql defines row-level triggers that run automatically before or after INSERT, UPDATE, or DELETE. Their advantage is enforcement for writes from different clients; their cost is hidden side effects and harder debugging. Describe both the event and timing (BEFORE/AFTER) when answering.')
table(['Trigger behavior','Concept shown','Implementation note'],[
('Create wallet after player insert','Derived row / lifecycle automation','Creates zero balance; seed also inserts wallets explicitly.'),
('Assign PLAYER role after insert','Default authorization state','Depends on ROLE already being seeded.'),
('Validate bet limits and balance before insert','Business validation at DB layer','BET insert also deducts the wallet afterward.'),
('Validate active game and player','Cross-table business rules','Rejects bet when related row is not ACTIVE.'),
('Credit payout after WON update','State transition side effect','Settlement procedure also credits the wallet.'),
('Update table status on game state change','Maintain derived operational status','Game start marks occupied; end marks available.'),
('Prevent delete with pending bets','Lifecycle/integrity rule','Works in addition to FK restrictions.'),
('Check dealer has no active game','Concurrency/business rule','Count-before-insert may need stronger locking under concurrency.')])
h('8.1 Trigger vs procedure',2)
p('A trigger fires because a table event occurred and is not called by name by the application. A procedure is called explicitly and represents a named operation such as place_bet. A good design chooses one owner for each side effect: either procedure or trigger. Duplicating balance changes in both creates incorrect totals.')

h('9. NoSQL and vector feature',1)
h('9.1 MongoDB document model',2)
p('database/nosql/mongodb-schema.js uses Mongoose schemas/models for GameLog, PlayerActivity, CasinoAnalytics, GameVectorEmbedding, and PlayerPreferenceVector. A game log embeds an events array; each event can include a Mixed details object. This supports different event shapes for cards, spins, rolls, and other game actions without adding SQL columns for every game-specific detail.')
p('Mongoose schema validation is application-level schema enforcement, not the same as a MySQL foreign key. Numeric playerId/gameId values are references to MySQL IDs only by convention. The MongoDB database cannot automatically enforce referential integrity with those MySQL rows.')
h('9.2 CRUD/RUD walkthrough',2)
p('database/nosql/mongodb-queries.js demonstrates reads of game logs and revenue aggregation, update by appending an event and updating player activity, vector creation/search/update, and deletion of old logs or an embedding. CRUD means Create, Read, Update, Delete; the evaluation calls out RUD, while the demo also contains create actions. The setup script inserts sample Mongo documents.')
h('9.3 Five-dimensional recommendation',2)
p('Each game is represented by five numeric features: volatility, house edge, pace, skill requirement, and social interaction. A player preference vector is stored in the same five-dimensional space. Cosine similarity is dot(A,B) divided by the product of vector lengths. A score nearer 1 means vectors point in similar directions; it is an angular similarity measure, not a probability or a learned semantic embedding.')
p('The demo compares a preference vector against all game vectors and sorts descending. It updates player preference using an exponential moving average: new = (1 - alpha) * old + alpha * observed_game. This is an educational hand-designed feature model, not a trained AI model. The code returns 0 for mismatched dimensions or zero vectors.')
h('9.4 What vector database means here',2)
p('The project stores vectors in MongoDB documents and calculates cosine similarity in JavaScript. It does not show an external specialized vector database or a native indexed ANN search. The phrase vector feature is accurate; claims about a production-grade vector search engine would be too strong.')

h('10. Technology choice and polyglot persistence',1)
p('The architecture uses MySQL for structured, strongly related and money-sensitive records, and MongoDB for flexible nested telemetry and aggregates. This is the project’s technology justification in a nutshell. Express provides a familiar REST API, and Next.js provides the browser UI. MySQL DECIMAL is chosen because casino money requires exact decimal storage; indexes target common access paths; pooling avoids opening a brand-new connection for every query.')
p('A balanced answer should avoid saying MongoDB is always eventually consistent or MySQL is categorically faster. Consistency and performance depend on configuration and workload. The defensible argument is about data shape and guarantees: relational constraints/transactions fit balances; flexible documents fit varying event payloads.')

h('11. Next.js interface and browser state',1)
p('The UI lives under frontend/app, using App Router pages. The visible surface includes landing, login/register, dashboard, games, game detail, wallet, dealer, admin, and analytics. Shared components include Navbar and AuthProvider. frontend/lib/api.js configures Axios and its JWT interceptor, so individual pages can call API endpoints without reimplementing token headers.')
p('Client-side role-based navigation improves usability, but it is not a security boundary: a user can construct an HTTP request manually. The backend must enforce access. The pages and route files should be inspected for exact features before claiming every view works; a page being present does not establish that every action has complete server behavior.')

h('12. Express backend and API/database integration',1)
h('12.1 Layer responsibilities',2)
table(['Layer','Project responsibility'],[
('server.js','App setup, middleware, route mounting, health/root behavior, startup connections.'),
('routes/','HTTP methods/paths and middleware/controller composition.'),
('middleware/','JWT authentication, role/permission checks, request validation.'),
('controllers/','Business flow, SQL/procedure calls, status codes and response shape.'),
('config/database.js','mysql2 pool, parameterized query helper, procedure call helper.'),
('models/ and config/mongodb.js','Mongoose models and MongoDB connection.')])
h('12.2 Prepared statements',2)
p('The MySQL query helper uses pool.execute(text, params), and controllers generally use ? placeholders. Values are sent separately from SQL syntax, which prevents user values from being interpreted as SQL code. It also makes parameter types explicit and improves safe reuse. Dynamic SQL fragments still require allowlists; never concatenate untrusted field names or sort expressions.')
h('12.3 API result shape',2)
p('Controllers commonly return {success, message, data}. They translate known failures to 4xx responses and unexpected failures to 5xx. However, error mapping is not uniform: for example, deposit currently turns procedure validation failures into a generic 500, whereas insufficient withdrawal balance is mapped to 400. This is a quality point to identify, not a feature to claim as fully consistent.')

h('13. Authentication and RBAC',1)
h('13.1 Authentication',2)
p('Registration checks duplicate email/phone, hashes the password with bcrypt using cost 10, inserts PLAYER, and relies on triggers to create a wallet and assign PLAYER. Login checks the player status, compares the submitted password to password_hash with bcrypt, gathers active roles, then signs a JWT. The token payload contains playerId, email, and roles and expires after JWT_EXPIRES_IN (default 7d).')
p('Authentication answers “who is making this request?” The authenticate middleware verifies the bearer token, then re-queries MySQL for the current player status and roles. This means role changes are reflected on subsequent requests even if the token has old role claims. It also adds a database read per protected request.')
h('13.2 Authorization and RBAC data model',2)
p('Authorization answers “is this identity allowed to do this action?” ROLE and PERMISSION are connected through ROLE_PERMISSION; players and roles are connected through USER_ROLE. Both relationships are many-to-many. The backend exposes role-based authorize(...) and permission-based hasPermission(...). The schema stores permission definitions and assignments; application middleware performs the request check.')
p('There is no independent database user/privilege model for each web role. “Database RBAC” here means role and permission records are stored in MySQL and application requests check them. It does not mean MySQL GRANT accounts are created per PLAYER/DEALER/ADMIN.')
h('13.3 Risks and seed caveats',2)
p('The RBAC seed inserts an admin password hash placeholder, and the normal seed hashes are not dependable login hashes. The README’s demo credentials should not be promised without verification. The JWT fallback secret in code is also a development fallback; a real deployment must set a strong secret. Logout is client-side token removal because there is no token revocation list.')

h('14. Documentation and Git contribution',1)
p('Documentation artifacts include README.md, QUICKSTART.md, and docs/ guides. Git history can show incremental work and contribution, but only if commits accurately represent authorship and meaningful changes. Be prepared to show repository status/history and explain what you personally implemented, modified, and learned. Do not claim work based only on file presence.')
p('Some older docs in this repository mention PostgreSQL, use psql commands, or describe routes/features that do not match the checked-in MySQL code. Treat database/mysql and active backend code as authoritative. A documentation correction is a legitimate contribution.')

h('15. Originality and individual contribution',1)
p('The clearest distinguishing idea is the player/game preference-vector demonstration with cosine similarity. Other project-specific behavior includes wallet ledger snapshots, stored procedures, trigger-enforced rules, and the split between transactional records and flexible game events. To discuss contribution, use a concrete “I changed X in file Y, because Z; it is verified by W” narrative.')
p('Do not describe the recommendation as a trained AI model: the dimensions and sample vectors are manually defined and cosine similarity is computed directly. Do not call the ledger double-entry accounting: TRANSACTION records balance snapshots and amount/type, but there is no pair of debit/credit accounts per operation.')

h('16. Current implementation caveats examiners may probe',1)
p('These are observations from the checked-in source, not claims that the intended design is impossible. If asked about one, state the intended invariant, point to the overlapping code, explain the actual consequence, and propose a single owner/fix.')
table(['Observed source behavior','Why it matters','Good design correction'],[
('place_bet procedure inserts BET and debits WALLET; AFTER INSERT BET trigger also debits WALLET.','The balance can be debited twice. The trigger transaction logger logs the debit as WITHDRAWAL, not BET.','Choose procedure or trigger for debit; keep validation atomic and write one correctly typed ledger entry.'),
('settle_bet credits wallet; AFTER UPDATE BET trigger also credits on WON transition.','Winning payout can be credited twice; trigger also explicitly inserts PAYOUT transaction.','Let one layer credit once, with outcome/payout validation and idempotent settlement.'),
('deposit_funds/withdraw_funds update wallet and insert TRANSACTION; wallet balance triggers also insert a generic transaction.','Two transaction records per deposit/withdrawal; one may have generic or mismatched type/sign.','Centralize ledger insertion in procedure or triggers and standardize signed amount semantics.'),
('player insert trigger creates wallet; seed explicitly inserts wallets from PLAYER.','Unique wallet.player_id can cause seed failure after trigger has already created the wallet.','Remove explicit wallet seed insert or disable/change trigger for the seed plan.'),
('Admin RBAC seed uses placeholder bcrypt text; demo seed hashes are dummy-looking.','Login examples in README/QUICKSTART may not authenticate.','Generate valid bcrypt hashes or create demo accounts through registration and assign roles.'),
('Recursive referral SQL references commented-out referred_by column.','The query fails until optional schema change is applied.','Add the self-FK migration or mark the query as a conceptual exercise.'),
('README claims 13 triggers but source defines 13 behaviors with separate game insert/update triggers, meaning trigger count differs.','Rubric evidence/count claims can be inaccurate.','Describe actual CREATE TRIGGER objects by counting definitions.'),
('Some controller comments/docs say PostgreSQL; actual helper uses mysql2.','Can mislead install/setup and viva explanations.','Use MySQL terminology; correct stale docs.'),
('Register duplicate checks happen before insert and are not one transaction.','Two concurrent registrations can race; unique indexes ultimately reject one, but error mapping may be 500.','Catch duplicate-key errors and map to 409; rely on unique constraints as final authority.'),
('BET insert trigger checks wallet balance, but does not lock wallet in that trigger path.','Direct concurrent inserts may race; procedures are intended to lock but have duplicated effects.','Use one transaction path with explicit row locking; restrict direct writes where possible.'),
('Game controller calls create_game/end_game using PostgreSQL function syntax, but those procedures are absent from MySQL procedures.sql.','Dealer start/end game actions do not match the active MySQL backend and are expected to fail.','Implement MySQL procedures or parameterized INSERT/UPDATE logic, and align API result handling.'),
('Table controller uses $1 placeholders, RETURNING, and PostgreSQL error code 23505.','MySQL mysql2 requires ? placeholders and does not support this RETURNING syntax here.','Rewrite for MySQL and return SELECT/insertId/affectedRows appropriately.'),
('Table mutation routes require MANAGER, but ROLE enum supports only PLAYER, DEALER, ADMIN.','No seeded user can satisfy the guard, including the ADMIN role.','Use ADMIN or add/seed MANAGER consistently in the database and UI.'),
('registerValidation/loginValidation exist but authRoutes does not attach them.','The server does not enforce the listed express-validator rules on these endpoints; browser checks can be bypassed.','Attach the validators and retain database unique constraints as the final duplicate guard.'),
('Analytics routes allow an authenticated caller to request arbitrary player IDs.','Player activity/preferences may be exposed across accounts.','Restrict playerId to req.user.playerId or require an administrative role.'),
('Mongo game events are written through a separate endpoint; bet procedures do not publish them.','MySQL betting is not automatically reflected in Mongo telemetry.','Publish events transactionally through an outbox and process them idempotently.'),
('Daily analytics refresh hard-codes peakHour=20.','Displayed peak hour is not derived from hourly event counts.','Group event timestamps by hour and choose the maximum.')])

h('17. Viva question bank with answer frameworks',1)
qa=[
('What is the project?', 'A full-stack casino operations demonstration. Next.js calls Express; MySQL stores relational operations and balances; MongoDB stores flexible activity/analytics documents; vector math ranks games by manually defined preferences.'),
('Why use MySQL for wallet and bets?', 'Those records have strict relationships and require consistent multi-step writes. DECIMAL, foreign keys, CHECK constraints, InnoDB transactions, and row locks suit that requirement.'),
('What is a transaction?', 'A group of database operations treated as one unit. In place_bet, either the pending bet and debit both commit, or the handler rolls the transaction back on SQL error.'),
('How do you prevent overspending?', 'The intended path locks the wallet row with FOR UPDATE, checks available balance, and debits inside one transaction; a nonnegative-balance CHECK provides another guard. The current duplicate trigger debit is a defect that must be disclosed.'),
('Procedure vs trigger?', 'A procedure is explicitly invoked as a named operation. A trigger fires automatically on a table event. Procedures expose an operation boundary; triggers enforce event-based rules but can hide side effects.'),
('What is a correlated subquery?', 'A subquery that refers to a value from its outer query row, such as counting pending bets for the current player.'),
('What is a CTE?', 'A statement-scoped named query result. It improves readability and can build multi-stage reports; recursive CTEs repeatedly expand a hierarchy.'),
('What does LEFT JOIN do?', 'It retains every row from the left table and fills unmatched right-side columns with NULL, useful for showing games with no bets.'),
('Why MongoDB?', 'Flexible nested event details vary by game type; documents can store those event shapes without a wide sparse relational table. It is used for telemetry and analytics, not the wallet source of truth.'),
('Is this a true vector database?', 'It stores five-number vectors in MongoDB and calculates cosine similarity in application code. It demonstrates vector search concepts but not a specialized indexed ANN engine.'),
('Explain cosine similarity.', 'Dot product divided by both vector magnitudes; it compares direction. Higher values indicate more similarly oriented preference/game features, not a probability.'),
('What does RBAC stand for and how is it modeled?', 'Role-Based Access Control. USER_ROLE maps users to roles; ROLE_PERMISSION maps roles to permissions; middleware checks roles or permissions after authentication.'),
('Does a JWT prove permissions forever?', 'No. This middleware verifies the token then reloads the active user and roles from MySQL, so current status/roles govern each protected request.'),
('How is SQL injection mitigated?', 'Queries use mysql2 execute with placeholders and parameter arrays. Dynamic SQL identifiers must still be selected from trusted allowlists.'),
('What is the difference between authentication and authorization?', 'Authentication identifies the caller; authorization decides whether that caller can perform a given action.'),
('Is the ledger double-entry?', 'No. It records transaction type, amount, and before/after balance. Double-entry would record balanced debits and credits across accounts.'),
('What is the biggest implementation issue?', 'Procedures and triggers overlap on wallet effects: bets and payouts can be applied twice, and deposits/withdrawals can create duplicate transaction rows. One layer should own each effect.'),
('Why use DECIMAL rather than FLOAT?', 'DECIMAL stores fixed-point decimal values so currency arithmetic does not inherit binary floating-point approximation.'),
('What is an index tradeoff?', 'It can speed selected lookups and joins, but costs storage and adds work to inserts, updates, and deletes.'),
('How would you improve reliability across MySQL and MongoDB?', 'Keep the money transaction committed in MySQL, publish an event through an outbox row in that same transaction, then asynchronously deliver it to MongoDB with retries and idempotent event IDs.')]
for q,a in qa:
    para=doc.add_paragraph(); para.paragraph_format.space_before=Pt(5); rr=para.add_run('Q. '+q); rr.bold=True; rr.font.color.rgb=RGBColor.from_string('1F4E79')
    p('A. '+a)

h('18. Short demo talk track',1)
numbered(['“I will trace one player action from the frontend to the database and back.”','Register a player and point out bcrypt, JWT, and trigger-created wallet/default role.','Deposit funds and query WALLET plus TRANSACTION; discuss atomicity, DECIMAL, and audit snapshots. If duplicate entries appear, explain the overlapping trigger/procedure behavior.','Place a bet on an active game and inspect BET and WALLET; explain intended checks and row locking, then disclose the duplicate debit in current source.','Show a report query and identify its grain, joins, grouping, and CTE stages.','Show a Mongo game log and vector recommendation, explaining flexible nested data and the cosine score.','Close by summarizing the architecture and one improvement: make a single transactional service own each wallet side effect and use an outbox for Mongo events.'])

h('19. File map for follow-up questions',1)
table(['If asked about…','Open…'],[
('MySQL tables and constraints','database/mysql/schema.sql'),
('Roles, permissions, assignments','database/mysql/rbac.sql'),
('Bet/deposit/withdraw/settlement logic','database/mysql/procedures.sql'),
('Automatic database side effects','database/mysql/triggers.sql'),
('Advanced SQL techniques','database/mysql/queries.sql'),
('Sample records','database/mysql/seed.sql'),
('Mongo models and vector math','database/nosql/mongodb-schema.js'),
('Mongo read/update/delete/vector demos','database/nosql/mongodb-queries.js'),
('API startup and middleware','backend/src/server.js'),
('MySQL pool and query helpers','backend/src/config/database.js'),
('JWT and role/permission middleware','backend/src/middleware/auth.js'),
('Route composition','backend/src/routes/'),
('Concrete API behavior','backend/src/controllers/'),
('Frontend API token attachment','frontend/lib/api.js'),
('Screens','frontend/app/ and frontend/components/')])

h('20. Final revision checklist',1)
bullets(['I can draw the browser → API → middleware → controller → database → response path.','I can define each ACID property and relate it to a specific stored procedure.','I can explain why DECIMAL, foreign keys, CHECK, UNIQUE, indexes, and transactions are used.','I can distinguish a procedure, trigger, CTE, recursive CTE, nested query, correlated query, and join.','I can explain how the five vector dimensions and cosine similarity produce a ranking.','I can distinguish authentication from authorization and explain USER_ROLE / ROLE_PERMISSION.','I can state limitations accurately: no true distributed transaction, no specialized ANN vector service, no true double-entry ledger, and overlapping wallet side effects.','I can run the demo using docs/Project-Demo-Guide.md and show evidence in SQL and the UI.'])

# Footer page number
for section in doc.sections:
    footer=section.footer.paragraphs[0]; footer.alignment=WD_ALIGN_PARAGRAPH.CENTER
    footer.add_run('Casino DBMS Study Guide  |  ')
    fld=OxmlElement('w:fldSimple'); fld.set(qn('w:instr'),'PAGE'); footer._p.append(fld)

doc.core_properties.title='Casino DBMS End to End Study Guide'
doc.core_properties.subject='Implementation guide and DBMS viva preparation'
doc.core_properties.author='Casino DBMS Project Study Materials'
doc.save(OUT)
print(OUT)
