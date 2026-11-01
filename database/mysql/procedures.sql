-- Casino Database Management System
-- MySQL Stored Procedures

DELIMITER $$

-- =====================================================
-- PROCEDURE 1: Place a bet (atomic operation)
-- =====================================================

DROP PROCEDURE IF EXISTS place_bet$$

CREATE PROCEDURE place_bet(
    IN p_player_id INT,
    IN p_game_id INT,
    IN p_amount DECIMAL(10, 2),
    IN p_bet_type VARCHAR(50)
)
BEGIN
    DECLARE v_bet_id INT;
    DECLARE v_wallet_balance DECIMAL(12, 2);
    DECLARE v_game_status VARCHAR(20);
    DECLARE v_player_status VARCHAR(20);
    DECLARE exit handler for sqlexception
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Validate player status
    SELECT status INTO v_player_status FROM PLAYER WHERE player_id = p_player_id;
    IF v_player_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Player not found';
    END IF;
    IF v_player_status != 'ACTIVE' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Player is not active';
    END IF;

    -- Validate game status
    SELECT status INTO v_game_status FROM GAME WHERE game_id = p_game_id;
    IF v_game_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Game not found';
    END IF;
    IF v_game_status != 'ACTIVE' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Game is not active';
    END IF;

    -- Check wallet balance
    SELECT balance INTO v_wallet_balance FROM WALLET WHERE player_id = p_player_id FOR UPDATE;
    IF v_wallet_balance < p_amount THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient balance';
    END IF;

    -- Insert bet
    INSERT INTO BET (player_id, game_id, amount, bet_type, outcome)
    VALUES (p_player_id, p_game_id, p_amount, p_bet_type, 'PENDING');
    
    SET v_bet_id = LAST_INSERT_ID();

    -- Deduct from wallet
    UPDATE WALLET 
    SET balance = balance - p_amount
    WHERE player_id = p_player_id;

    -- Get updated balance
    SELECT balance INTO v_wallet_balance FROM WALLET WHERE player_id = p_player_id;

    COMMIT;
    
    -- Return result
    SELECT v_bet_id as bet_id, v_wallet_balance as new_balance, 'Bet placed successfully' as message;
END$$

-- =====================================================
-- PROCEDURE 2: Settle a bet
-- =====================================================

DROP PROCEDURE IF EXISTS settle_bet$$

CREATE PROCEDURE settle_bet(
    IN p_bet_id INT,
    IN p_outcome VARCHAR(20),
    IN p_payout DECIMAL(10, 2)
)
BEGIN
    DECLARE v_player_id INT;
    DECLARE v_current_outcome VARCHAR(20);
    DECLARE v_new_balance DECIMAL(12, 2);
    DECLARE exit handler for sqlexception
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Get bet details
    SELECT player_id, outcome INTO v_player_id, v_current_outcome
    FROM BET WHERE bet_id = p_bet_id FOR UPDATE;

    IF v_player_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Bet not found';
    END IF;

    IF v_current_outcome != 'PENDING' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Bet already settled';
    END IF;

    -- Update bet
    UPDATE BET 
    SET outcome = p_outcome, payout = p_payout
    WHERE bet_id = p_bet_id;

    -- Credit payout if won
    IF p_outcome = 'WON' AND p_payout > 0 THEN
        UPDATE WALLET 
        SET balance = balance + p_payout
        WHERE player_id = v_player_id;
    END IF;

    -- Get updated balance
    SELECT balance INTO v_new_balance FROM WALLET WHERE player_id = v_player_id;

    COMMIT;
    
    SELECT p_bet_id as bet_id, v_player_id as player_id, v_new_balance as new_balance, 
           'Bet settled successfully' as message;
END$$

-- =====================================================
-- PROCEDURE 3: Deposit funds to wallet
-- =====================================================

DROP PROCEDURE IF EXISTS deposit_funds$$

CREATE PROCEDURE deposit_funds(
    IN p_player_id INT,
    IN p_amount DECIMAL(10, 2),
    IN p_description TEXT
)
BEGIN
    DECLARE v_wallet_id INT;
    DECLARE v_balance_before DECIMAL(12, 2);
    DECLARE v_balance_after DECIMAL(12, 2);
    DECLARE v_transaction_id INT;
    DECLARE exit handler for sqlexception
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    IF p_amount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Deposit amount must be positive';
    END IF;

    -- Get wallet
    SELECT wallet_id, balance INTO v_wallet_id, v_balance_before 
    FROM WALLET WHERE player_id = p_player_id FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Wallet not found for player';
    END IF;

    -- Update balance
    UPDATE WALLET 
    SET balance = balance + p_amount
    WHERE wallet_id = v_wallet_id;
    
    SELECT balance INTO v_balance_after FROM WALLET WHERE wallet_id = v_wallet_id;

    -- Create transaction record
    INSERT INTO TRANSACTION (wallet_id, transaction_type, amount, description, balance_before, balance_after)
    VALUES (v_wallet_id, 'DEPOSIT', p_amount, p_description, v_balance_before, v_balance_after);
    
    SET v_transaction_id = LAST_INSERT_ID();

    COMMIT;
    
    SELECT v_wallet_id as wallet_id, v_balance_after as new_balance, v_transaction_id as transaction_id;
END$$

-- =====================================================
-- PROCEDURE 4: Withdraw funds from wallet
-- =====================================================

DROP PROCEDURE IF EXISTS withdraw_funds$$

CREATE PROCEDURE withdraw_funds(
    IN p_player_id INT,
    IN p_amount DECIMAL(10, 2),
    IN p_description TEXT
)
BEGIN
    DECLARE v_wallet_id INT;
    DECLARE v_balance_before DECIMAL(12, 2);
    DECLARE v_balance_after DECIMAL(12, 2);
    DECLARE v_transaction_id INT;
    DECLARE exit handler for sqlexception
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    IF p_amount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Withdrawal amount must be positive';
    END IF;

    -- Get wallet
    SELECT wallet_id, balance INTO v_wallet_id, v_balance_before 
    FROM WALLET WHERE player_id = p_player_id FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Wallet not found for player';
    END IF;

    IF v_balance_before < p_amount THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient balance';
    END IF;

    -- Update balance
    UPDATE WALLET 
    SET balance = balance - p_amount
    WHERE wallet_id = v_wallet_id;
    
    SELECT balance INTO v_balance_after FROM WALLET WHERE wallet_id = v_wallet_id;

    -- Create transaction record
    INSERT INTO TRANSACTION (wallet_id, transaction_type, amount, description, balance_before, balance_after)
    VALUES (v_wallet_id, 'WITHDRAWAL', -p_amount, p_description, v_balance_before, v_balance_after);
    
    SET v_transaction_id = LAST_INSERT_ID();

    COMMIT;
    
    SELECT v_wallet_id as wallet_id, v_balance_after as new_balance, v_transaction_id as transaction_id;
END$$

-- =====================================================
-- PROCEDURE 5: Get player statistics
-- =====================================================

DROP PROCEDURE IF EXISTS get_player_statistics$$

CREATE PROCEDURE get_player_statistics(IN p_player_id INT)
BEGIN
    SELECT 
        p.player_id,
        p.name as player_name,
        COUNT(b.bet_id) as total_bets,
        COALESCE(SUM(b.amount), 0) as total_wagered,
        COALESCE(SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END), 0) as total_won,
        COALESCE(SUM(CASE WHEN b.outcome = 'LOST' THEN b.amount ELSE 0 END), 0) as total_lost,
        COUNT(CASE WHEN b.outcome = 'PENDING' THEN 1 END) as pending_bets,
        CASE 
            WHEN COUNT(CASE WHEN b.outcome IN ('WON', 'LOST') THEN 1 END) > 0 
            THEN ROUND(
                COUNT(CASE WHEN b.outcome = 'WON' THEN 1 END) * 100.0 / 
                COUNT(CASE WHEN b.outcome IN ('WON', 'LOST') THEN 1 END), 2
            )
            ELSE 0
        END as win_rate,
        w.balance as current_balance,
        COALESCE(MAX(CASE WHEN b.outcome = 'WON' THEN b.payout END), 0) as biggest_win,
        COUNT(DISTINCT b.game_id) as total_games
    FROM PLAYER p
    LEFT JOIN BET b ON p.player_id = b.player_id
    LEFT JOIN WALLET w ON p.player_id = w.player_id
    WHERE p.player_id = p_player_id
    GROUP BY p.player_id, p.name, w.balance;
END$$

DELIMITER ;

-- End of MySQL procedures.sql
