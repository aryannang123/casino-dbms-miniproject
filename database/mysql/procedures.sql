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
    DECLARE v_amount DECIMAL(10, 2);
    DECLARE v_bet_type VARCHAR(50);
    DECLARE v_new_balance DECIMAL(12, 2);
    DECLARE exit handler for sqlexception
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Get bet details
    SELECT player_id, outcome, amount, bet_type 
    INTO v_player_id, v_current_outcome, v_amount, v_bet_type
    FROM BET WHERE bet_id = p_bet_id FOR UPDATE;

    IF v_player_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Bet not found';
    END IF;

    IF v_current_outcome != 'PENDING' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Bet already settled';
    END IF;

    -- Automatically calculate payout if not supplied or <= 0
    IF p_outcome = 'WON' AND (p_payout IS NULL OR p_payout <= 0) THEN
        IF UPPER(v_bet_type) = 'BLACKJACK' THEN
            SET p_payout = v_amount * 2.5;
        ELSE
            SET p_payout = v_amount * 2.0;
        END IF;
    ELSEIF p_outcome = 'CANCELLED' AND (p_payout IS NULL OR p_payout <= 0) THEN
        SET p_payout = v_amount;
    ELSEIF p_outcome = 'LOST' THEN
        SET p_payout = 0.00;
    END IF;

    -- Update bet
    UPDATE BET 
    SET outcome = p_outcome, payout = p_payout
    WHERE bet_id = p_bet_id;

    -- Credit payout if won or cancelled (refund)
    IF p_payout > 0 THEN
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

    -- Update balance (Triggers trigger_record_wallet_increase automatically log to TRANSACTION table)
    UPDATE WALLET 
    SET balance = balance + p_amount
    WHERE wallet_id = v_wallet_id;
    
    SELECT balance INTO v_balance_after FROM WALLET WHERE wallet_id = v_wallet_id;

    COMMIT;
    
    SELECT v_wallet_id as wallet_id, v_balance_after as new_balance;
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

    -- Update balance (Triggers trigger_record_wallet_decrease automatically log to TRANSACTION table)
    UPDATE WALLET 
    SET balance = balance - p_amount
    WHERE wallet_id = v_wallet_id;
    
    SELECT balance INTO v_balance_after FROM WALLET WHERE wallet_id = v_wallet_id;

    COMMIT;
    
    SELECT v_wallet_id as wallet_id, v_balance_after as new_balance;
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

-- =====================================================
-- PROCEDURE 6: Create a new game session (Dealer only)
-- =====================================================

DROP PROCEDURE IF EXISTS create_game$$

CREATE PROCEDURE create_game(
    IN p_table_id INT,
    IN p_dealer_id INT,
    IN p_game_type VARCHAR(20)
)
BEGIN
    DECLARE v_game_id INT;
    DECLARE v_table_status VARCHAR(20);
    DECLARE v_dealer_status VARCHAR(20);
    DECLARE exit handler for sqlexception
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Validate table status
    SELECT status INTO v_table_status 
    FROM CASINO_TABLE 
    WHERE table_id = p_table_id FOR UPDATE;

    IF v_table_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Table not found';
    END IF;

    IF v_table_status != 'AVAILABLE' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Table is not available';
    END IF;

    -- Validate dealer status
    SELECT status INTO v_dealer_status 
    FROM DEALER 
    WHERE dealer_id = p_dealer_id;

    IF v_dealer_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Dealer not found';
    END IF;

    IF v_dealer_status != 'ACTIVE' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Dealer is not active';
    END IF;

    -- Insert new game session
    INSERT INTO GAME (table_id, dealer_id, game_type, status, start_time)
    VALUES (p_table_id, p_dealer_id, p_game_type, 'ACTIVE', CURRENT_TIMESTAMP);

    SET v_game_id = LAST_INSERT_ID();

    -- Update table status to OCCUPIED
    UPDATE CASINO_TABLE 
    SET status = 'OCCUPIED'
    WHERE table_id = p_table_id;

    COMMIT;

    -- Return result
    SELECT v_game_id AS game_id, 'Game created successfully' AS message;
END$$

-- =====================================================
-- PROCEDURE 7: End a game session (Dealer only)
-- =====================================================

DROP PROCEDURE IF EXISTS end_game$$

CREATE PROCEDURE end_game(
    IN p_game_id INT,
    IN p_status VARCHAR(20)
)
BEGIN
    DECLARE v_table_id INT;
    DECLARE v_current_status VARCHAR(20);
    DECLARE v_pending_bets INT DEFAULT 0;
    DECLARE exit handler for sqlexception
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Validate game exists
    SELECT status, table_id INTO v_current_status, v_table_id 
    FROM GAME 
    WHERE game_id = p_game_id FOR UPDATE;

    IF v_current_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Game not found';
    END IF;

    IF v_current_status != 'ACTIVE' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Game is not active';
    END IF;

    -- Count pending bets
    SELECT COUNT(*) INTO v_pending_bets 
    FROM BET 
    WHERE game_id = p_game_id AND outcome = 'PENDING';

    -- Default status to COMPLETED if not provided
    IF p_status IS NULL OR p_status = '' THEN
        SET p_status = 'COMPLETED';
    END IF;

    -- Update game status and end time
    UPDATE GAME 
    SET status = p_status,
        end_time = CURRENT_TIMESTAMP
    WHERE game_id = p_game_id;

    -- Release table back to AVAILABLE
    UPDATE CASINO_TABLE 
    SET status = 'AVAILABLE'
    WHERE table_id = v_table_id;

    COMMIT;

    -- Return result
    SELECT p_game_id AS game_id, v_pending_bets AS pending_bets, 'Game ended successfully' AS message;
END$$

DELIMITER ;

-- End of MySQL procedures.sql
