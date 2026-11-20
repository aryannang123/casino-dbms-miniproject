-- Casino Database Management System
-- Sample Data for Testing

-- =====================================================
-- DEALERS
-- =====================================================

INSERT INTO DEALER (name, employee_id, hire_date, status) VALUES
('John Smith', 'EMP001', '2023-01-15', 'ACTIVE'),
('Maria Garcia', 'EMP002', '2023-02-20', 'ACTIVE'),
('David Chen', 'EMP003', '2023-03-10', 'ACTIVE'),
('Sarah Johnson', 'EMP004', '2023-04-05', 'ACTIVE'),
('Michael Brown', 'EMP005', '2023-05-12', 'ACTIVE'),
('Lisa Anderson', 'EMP006', '2023-06-18', 'ACTIVE'),
('James Wilson', 'EMP007', '2023-07-22', 'ON_LEAVE'),
('Emily Davis', 'EMP008', '2023-08-30', 'ACTIVE');

-- =====================================================
-- CASINO TABLES
-- =====================================================

INSERT INTO CASINO_TABLE (table_number, game_type, minimum_bet, maximum_bet, status, capacity) VALUES
('BJ-01', 'BLACKJACK', 10.00, 500.00, 'AVAILABLE', 7),
('BJ-02', 'BLACKJACK', 25.00, 1000.00, 'AVAILABLE', 7),
('BJ-03', 'BLACKJACK', 50.00, 2500.00, 'AVAILABLE', 7),
('PK-01', 'POKER', 20.00, 1000.00, 'AVAILABLE', 9),
('PK-02', 'POKER', 50.00, 5000.00, 'AVAILABLE', 9),
('RT-01', 'ROULETTE', 5.00, 500.00, 'AVAILABLE', 8),
('RT-02', 'ROULETTE', 10.00, 1000.00, 'AVAILABLE', 8),
('CR-01', 'CRAPS', 10.00, 500.00, 'AVAILABLE', 10),
('BC-01', 'BACCARAT', 25.00, 2000.00, 'AVAILABLE', 8),
('SL-01', 'SLOTS', 1.00, 100.00, 'AVAILABLE', 1);

-- =====================================================
-- PLAYERS
-- =====================================================

INSERT INTO PLAYER (name, email, phone, registration_date, status, password_hash, date_of_birth, address) VALUES
('Alice Cooper', 'alice.cooper@email.com', '+1-555-0101', '2024-01-05', 'ACTIVE', '$2a$10$abcdefghijklmnopqrstuvwxyz123456', '1985-03-15', '123 Main St, Las Vegas, NV'),
('Bob Martinez', 'bob.martinez@email.com', '+1-555-0102', '2024-02-10', 'ACTIVE', '$2a$10$bcdefghijklmnopqrstuvwxyz234567', '1990-07-22', '456 Oak Ave, Las Vegas, NV'),
('Carol White', 'carol.white@email.com', '+1-555-0103', '2024-03-15', 'ACTIVE', '$2a$10$cdefghijklmnopqrstuvwxyz345678', '1988-11-30', '789 Pine St, Las Vegas, NV'),
('Daniel Lee', 'daniel.lee@email.com', '+1-555-0104', '2024-04-20', 'ACTIVE', '$2a$10$defghijklmnopqrstuvwxyz456789', '1992-05-18', '321 Elm St, Las Vegas, NV'),
('Emma Taylor', 'emma.taylor@email.com', '+1-555-0105', '2024-05-25', 'ACTIVE', '$2a$10$efghijklmnopqrstuvwxyz567890', '1987-09-08', '654 Maple Ave, Las Vegas, NV'),
('Frank Harris', 'frank.harris@email.com', '+1-555-0106', '2024-06-30', 'ACTIVE', '$2a$10$fghijklmnopqrstuvwxyz678901', '1995-12-25', '987 Cedar Ln, Las Vegas, NV'),
('Grace Kim', 'grace.kim@email.com', '+1-555-0107', '2024-07-15', 'ACTIVE', '$2a$10$ghijklmnopqrstuvwxyz789012', '1991-04-14', '147 Birch Rd, Las Vegas, NV'),
('Henry Wilson', 'henry.wilson@email.com', '+1-555-0108', '2024-08-20', 'ACTIVE', '$2a$10$hijklmnopqrstuvwxyz890123', '1989-08-20', '258 Spruce Dr, Las Vegas, NV'),
('Irene Chen', 'irene.chen@email.com', '+1-555-0109', '2024-09-10', 'ACTIVE', '$2a$10$ijklmnopqrstuvwxyz901234', '1993-02-28', '369 Willow Way, Las Vegas, NV'),
('Jack Brown', 'jack.brown@email.com', '+1-555-0110', '2024-10-01', 'ACTIVE', '$2a$10$jklmnopqrstuvwxyz012345', '1986-06-10', '753 Aspen Ct, Las Vegas, NV'),
('Kate Davis', 'kate.davis@email.com', '+1-555-0111', '2024-10-15', 'SUSPENDED', '$2a$10$klmnopqrstuvwxyz123456', '1994-01-05', '159 Poplar Blvd, Las Vegas, NV'),
('Larry Johnson', 'larry.johnson@email.com', '+1-555-0112', '2024-10-20', 'INACTIVE', '$2a$10$lmnopqrstuvwxyz234567', '1984-10-12', '951 Hickory St, Las Vegas, NV');

-- Note: Wallets will be created automatically via trigger

-- =====================================================
-- Deposit initial funds into wallets
-- =====================================================

-- Wait a moment for trigger to create wallets, then update balances
DO $$
DECLARE
    player_rec RECORD;
BEGIN
    FOR player_rec IN SELECT player_id FROM PLAYER WHERE status = 'ACTIVE' LOOP
        -- Deposit random amounts between 100 and 5000
        UPDATE WALLET 
        SET balance = 100 + (random() * 4900)::DECIMAL(12,2)
        WHERE player_id = player_rec.player_id;
    END LOOP;
END $$;

-- =====================================================
-- GAMES (some completed, some active)
-- =====================================================

-- Completed Games
INSERT INTO GAME (table_id, dealer_id, game_type, start_time, end_time, status) VALUES
(1, 1, 'BLACKJACK', '2024-10-20 10:00:00', '2024-10-20 11:30:00', 'COMPLETED'),
(2, 2, 'BLACKJACK', '2024-10-20 14:00:00', '2024-10-20 15:45:00', 'COMPLETED'),
(4, 3, 'POKER', '2024-10-21 20:00:00', '2024-10-21 23:30:00', 'COMPLETED'),
(6, 4, 'ROULETTE', '2024-10-22 11:00:00', '2024-10-22 12:15:00', 'COMPLETED'),
(1, 5, 'BLACKJACK', '2024-10-23 09:00:00', '2024-10-23 10:30:00', 'COMPLETED'),
(5, 6, 'POKER', '2024-10-23 21:00:00', '2024-10-23 23:45:00', 'COMPLETED'),
(7, 1, 'ROULETTE', '2024-10-24 15:00:00', '2024-10-24 16:20:00', 'COMPLETED'),
(3, 2, 'BLACKJACK', '2024-10-25 10:00:00', '2024-10-25 11:45:00', 'COMPLETED');

-- Active Games
INSERT INTO GAME (table_id, dealer_id, game_type, start_time, status) VALUES
(8, 3, 'CRAPS', '2024-10-26 10:00:00', 'ACTIVE'),
(9, 5, 'BACCARAT', '2024-10-26 14:00:00', 'ACTIVE');

-- =====================================================
-- BETS for completed games
-- =====================================================

-- Game 1 (Blackjack - Completed)
INSERT INTO BET (player_id, game_id, amount, bet_type, outcome, payout, bet_time) VALUES
(1, 1, 50.00, 'WIN', 'WON', 100.00, '2024-10-20 10:15:00'),
(2, 1, 25.00, 'LOSS', 'LOST', 0.00, '2024-10-20 10:20:00'),
(3, 1, 100.00, 'BLACKJACK', 'WON', 250.00, '2024-10-20 10:30:00'),
(4, 1, 75.00, 'WIN', 'WON', 150.00, '2024-10-20 10:45:00'),
(5, 1, 50.00, 'LOSS', 'LOST', 0.00, '2024-10-20 11:00:00');

-- Game 2 (Blackjack - Completed)
INSERT INTO BET (player_id, game_id, amount, bet_type, outcome, payout, bet_time) VALUES
(2, 2, 100.00, 'WIN', 'WON', 200.00, '2024-10-20 14:10:00'),
(6, 2, 50.00, 'LOSS', 'LOST', 0.00, '2024-10-20 14:25:00'),
(7, 2, 200.00, 'WIN', 'WON', 400.00, '2024-10-20 14:40:00'),
(8, 2, 150.00, 'PUSH', 'CANCELLED', 150.00, '2024-10-20 15:00:00');

-- Game 3 (Poker - Completed)
INSERT INTO BET (player_id, game_id, amount, bet_type, outcome, payout, bet_time) VALUES
(3, 3, 500.00, 'WIN', 'WON', 1000.00, '2024-10-21 20:30:00'),
(4, 3, 300.00, 'LOSS', 'LOST', 0.00, '2024-10-21 21:00:00'),
(5, 3, 250.00, 'LOSS', 'LOST', 0.00, '2024-10-21 21:30:00'),
(9, 3, 400.00, 'WIN', 'WON', 800.00, '2024-10-21 22:00:00'),
(10, 3, 350.00, 'LOSS', 'LOST', 0.00, '2024-10-21 22:30:00');

-- Game 4 (Roulette - Completed)
INSERT INTO BET (player_id, game_id, amount, bet_type, outcome, payout, bet_time) VALUES
(1, 4, 20.00, 'WIN', 'WON', 720.00, '2024-10-22 11:10:00'),
(2, 4, 15.00, 'LOSS', 'LOST', 0.00, '2024-10-22 11:20:00'),
(6, 4, 30.00, 'LOSS', 'LOST', 0.00, '2024-10-22 11:35:00'),
(7, 4, 25.00, 'WIN', 'WON', 50.00, '2024-10-22 11:50:00');

-- Game 5 (Blackjack - Completed)
INSERT INTO BET (player_id, game_id, amount, bet_type, outcome, payout, bet_time) VALUES
(8, 5, 100.00, 'WIN', 'WON', 200.00, '2024-10-23 09:15:00'),
(9, 5, 75.00, 'LOSS', 'LOST', 0.00, '2024-10-23 09:30:00'),
(10, 5, 150.00, 'BLACKJACK', 'WON', 375.00, '2024-10-23 09:45:00'),
(1, 5, 50.00, 'WIN', 'WON', 100.00, '2024-10-23 10:00:00');

-- Game 6 (Poker - Completed)
INSERT INTO BET (player_id, game_id, amount, bet_type, outcome, payout, bet_time) VALUES
(2, 6, 1000.00, 'WIN', 'WON', 2500.00, '2024-10-23 21:30:00'),
(3, 6, 600.00, 'LOSS', 'LOST', 0.00, '2024-10-23 22:00:00'),
(4, 6, 800.00, 'LOSS', 'LOST', 0.00, '2024-10-23 22:30:00'),
(5, 6, 450.00, 'WIN', 'WON', 900.00, '2024-10-23 23:00:00');

-- Game 7 (Roulette - Completed)
INSERT INTO BET (player_id, game_id, amount, bet_type, outcome, payout, bet_time) VALUES
(6, 7, 40.00, 'WIN', 'WON', 80.00, '2024-10-24 15:15:00'),
(7, 7, 35.00, 'LOSS', 'LOST', 0.00, '2024-10-24 15:30:00'),
(8, 7, 50.00, 'WIN', 'WON', 1800.00, '2024-10-24 15:45:00'),
(9, 7, 45.00, 'LOSS', 'LOST', 0.00, '2024-10-24 16:00:00');

-- Game 8 (Blackjack - Completed)
INSERT INTO BET (player_id, game_id, amount, bet_type, outcome, payout, bet_time) VALUES
(10, 8, 200.00, 'WIN', 'WON', 400.00, '2024-10-25 10:20:00'),
(1, 8, 150.00, 'LOSS', 'LOST', 0.00, '2024-10-25 10:40:00'),
(2, 8, 250.00, 'WIN', 'WON', 500.00, '2024-10-25 11:00:00'),
(3, 8, 100.00, 'PUSH', 'CANCELLED', 100.00, '2024-10-25 11:20:00');

-- =====================================================
-- Active game bets (pending outcomes)
-- =====================================================

-- Game 9 (Craps - Active)
INSERT INTO BET (player_id, game_id, amount, bet_type, outcome, payout, bet_time) VALUES
(4, 9, 75.00, 'WIN', 'PENDING', 0.00, '2024-10-26 10:15:00'),
(5, 9, 100.00, 'LOSS', 'PENDING', 0.00, '2024-10-26 10:30:00'),
(6, 9, 50.00, 'WIN', 'PENDING', 0.00, '2024-10-26 10:45:00');

-- Game 10 (Baccarat - Active)
INSERT INTO BET (player_id, game_id, amount, bet_type, outcome, payout, bet_time) VALUES
(7, 10, 300.00, 'WIN', 'PENDING', 0.00, '2024-10-26 14:20:00'),
(8, 10, 250.00, 'LOSS', 'PENDING', 0.00, '2024-10-26 14:35:00'),
(9, 10, 400.00, 'WIN', 'PENDING', 0.00, '2024-10-26 14:50:00');

-- =====================================================
-- Additional manual transactions (deposits/withdrawals)
-- =====================================================

-- Some manual deposits
INSERT INTO TRANSACTION (wallet_id, transaction_type, amount, description, balance_before, balance_after)
SELECT 
    w.wallet_id,
    'DEPOSIT',
    500.00,
    'Initial deposit',
    w.balance - 500.00,
    w.balance
FROM WALLET w
WHERE w.player_id IN (1, 2, 3)
ON CONFLICT DO NOTHING;

-- Some withdrawals
INSERT INTO TRANSACTION (wallet_id, transaction_type, amount, description, balance_before, balance_after)
SELECT 
    w.wallet_id,
    'WITHDRAWAL',
    -200.00,
    'Cash withdrawal',
    w.balance + 200.00,
    w.balance
FROM WALLET w
WHERE w.player_id IN (4, 5)
ON CONFLICT DO NOTHING;

-- =====================================================
-- Verification queries
-- =====================================================

-- Check player count
SELECT 'Total Players' as metric, COUNT(*) as count FROM PLAYER;

-- Check dealer count
SELECT 'Total Dealers' as metric, COUNT(*) as count FROM DEALER;

-- Check games
SELECT 'Total Games' as metric, COUNT(*) as count FROM GAME;

-- Check bets
SELECT 'Total Bets' as metric, COUNT(*) as count FROM BET;

-- Check wallet balances
SELECT 
    'Total Wallet Balance' as metric,
    SUM(balance) as total_balance,
    AVG(balance) as avg_balance,
    MIN(balance) as min_balance,
    MAX(balance) as max_balance
FROM WALLET;

-- Check transactions
SELECT 
    transaction_type,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM TRANSACTION
GROUP BY transaction_type
ORDER BY transaction_type;

-- End of seed.sql
