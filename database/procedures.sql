-- Casino Database Management System
-- Stored Procedures and Functions

-- =====================================================
-- PROCEDURE 1: Place a bet (atomic operation)
-- =====================================================

CREATE OR REPLACE FUNCTION place_bet(
    p_player_id INTEGER,
    p_game_id INTEGER,
    p_amount DECIMAL(10, 2),
    p_bet_type VARCHAR(50)
)
RETURNS TABLE(
    bet_id INTEGER,
    new_balance DECIMAL(12, 2),
    message TEXT
) AS $$
DECLARE
    v_bet_id INTEGER;
    v_wallet_balance DECIMAL(12, 2);
    v_game_status game_status;
    v_player_status player_status;
BEGIN
    -- Validate player status
    SELECT status INTO v_player_status FROM PLAYER WHERE player_id = p_player_id;
    IF v_player_status IS NULL THEN
        RAISE EXCEPTION 'Player not found';
    END IF;
    IF v_player_status != 'ACTIVE' THEN
        RAISE EXCEPTION 'Player is not active. Status: %', v_player_status;
    END IF;

    -- Validate game status
    SELECT status INTO v_game_status FROM GAME WHERE game_id = p_game_id;
    IF v_game_status IS NULL THEN
        RAISE EXCEPTION 'Game not found';
    END IF;
    IF v_game_status != 'ACTIVE' THEN
        RAISE EXCEPTION 'Game is not active. Status: %', v_game_status;
    END IF;

    -- Check wallet balance
    SELECT balance INTO v_wallet_balance FROM WALLET WHERE player_id = p_player_id;
    IF v_wallet_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance. Available: %, Required: %', v_wallet_balance, p_amount;
    END IF;

    -- Insert bet (triggers will handle wallet deduction)
    INSERT INTO BET (player_id, game_id, amount, bet_type, outcome)
    VALUES (p_player_id, p_game_id, p_amount, p_bet_type, 'PENDING')
    RETURNING BET.bet_id INTO v_bet_id;

    -- Get updated balance
    SELECT balance INTO v_wallet_balance FROM WALLET WHERE player_id = p_player_id;

    -- Return result
    RETURN QUERY SELECT 
        v_bet_id,
        v_wallet_balance,
        'Bet placed successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PROCEDURE 2: Settle a bet
-- =====================================================

CREATE OR REPLACE FUNCTION settle_bet(
    p_bet_id INTEGER,
    p_outcome bet_outcome,
    p_payout DECIMAL(10, 2) DEFAULT 0.00
)
RETURNS TABLE(
    bet_id INTEGER,
    player_id INTEGER,
    new_balance DECIMAL(12, 2),
    message TEXT
) AS $$
DECLARE
    v_player_id INTEGER;
    v_current_outcome bet_outcome;
    v_new_balance DECIMAL(12, 2);
BEGIN
    -- Get bet details
    SELECT BET.player_id, BET.outcome 
    INTO v_player_id, v_current_outcome
    FROM BET 
    WHERE BET.bet_id = p_bet_id;

    IF v_player_id IS NULL THEN
        RAISE EXCEPTION 'Bet not found';
    END IF;

    IF v_current_outcome != 'PENDING' THEN
        RAISE EXCEPTION 'Bet already settled with outcome: %', v_current_outcome;
    END IF;

    -- Validate payout
    IF p_outcome = 'WON' AND p_payout <= 0 THEN
        RAISE EXCEPTION 'Payout must be greater than 0 for winning bets';
    END IF;

    IF p_outcome IN ('LOST', 'CANCELLED') AND p_payout != 0 THEN
        RAISE EXCEPTION 'Payout must be 0 for lost or cancelled bets';
    END IF;

    -- Update bet (trigger will handle wallet credit if won)
    UPDATE BET 
    SET outcome = p_outcome,
        payout = p_payout
    WHERE BET.bet_id = p_bet_id;

    -- Get updated balance
    SELECT balance INTO v_new_balance FROM WALLET WHERE WALLET.player_id = v_player_id;

    -- Return result
    RETURN QUERY SELECT 
        p_bet_id,
        v_player_id,
        v_new_balance,
        'Bet settled successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PROCEDURE 3: Deposit funds to wallet
-- =====================================================

CREATE OR REPLACE FUNCTION deposit_funds(
    p_player_id INTEGER,
    p_amount DECIMAL(10, 2),
    p_description TEXT DEFAULT 'Deposit'
)
RETURNS TABLE(
    wallet_id INTEGER,
    new_balance DECIMAL(12, 2),
    transaction_id INTEGER
) AS $$
DECLARE
    v_wallet_id INTEGER;
    v_balance_before DECIMAL(12, 2);
    v_balance_after DECIMAL(12, 2);
    v_transaction_id INTEGER;
BEGIN
    -- Validate amount
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Deposit amount must be positive';
    END IF;

    -- Get wallet
    SELECT WALLET.wallet_id, balance 
    INTO v_wallet_id, v_balance_before 
    FROM WALLET 
    WHERE player_id = p_player_id;

    IF v_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Wallet not found for player';
    END IF;

    -- Update balance
    UPDATE WALLET 
    SET balance = balance + p_amount
    WHERE WALLET.wallet_id = v_wallet_id
    RETURNING balance INTO v_balance_after;

    -- Create transaction record
    INSERT INTO TRANSACTION (
        wallet_id,
        transaction_type,
        amount,
        description,
        balance_before,
        balance_after
    ) VALUES (
        v_wallet_id,
        'DEPOSIT',
        p_amount,
        p_description,
        v_balance_before,
        v_balance_after
    ) RETURNING transaction_id INTO v_transaction_id;

    -- Return result
    RETURN QUERY SELECT v_wallet_id, v_balance_after, v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PROCEDURE 4: Withdraw funds from wallet
-- =====================================================

CREATE OR REPLACE FUNCTION withdraw_funds(
    p_player_id INTEGER,
    p_amount DECIMAL(10, 2),
    p_description TEXT DEFAULT 'Withdrawal'
)
RETURNS TABLE(
    wallet_id INTEGER,
    new_balance DECIMAL(12, 2),
    transaction_id INTEGER
) AS $$
DECLARE
    v_wallet_id INTEGER;
    v_balance_before DECIMAL(12, 2);
    v_balance_after DECIMAL(12, 2);
    v_transaction_id INTEGER;
BEGIN
    -- Validate amount
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Withdrawal amount must be positive';
    END IF;

    -- Get wallet
    SELECT WALLET.wallet_id, balance 
    INTO v_wallet_id, v_balance_before 
    FROM WALLET 
    WHERE player_id = p_player_id;

    IF v_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Wallet not found for player';
    END IF;

    -- Check sufficient balance
    IF v_balance_before < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance. Available: %, Requested: %', v_balance_before, p_amount;
    END IF;

    -- Update balance
    UPDATE WALLET 
    SET balance = balance - p_amount
    WHERE WALLET.wallet_id = v_wallet_id
    RETURNING balance INTO v_balance_after;

    -- Create transaction record
    INSERT INTO TRANSACTION (
        wallet_id,
        transaction_type,
        amount,
        description,
        balance_before,
        balance_after
    ) VALUES (
        v_wallet_id,
        'WITHDRAWAL',
        -p_amount,
        p_description,
        v_balance_before,
        v_balance_after
    ) RETURNING transaction_id INTO v_transaction_id;

    -- Return result
    RETURN QUERY SELECT v_wallet_id, v_balance_after, v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PROCEDURE 5: Create a new game
-- =====================================================

CREATE OR REPLACE FUNCTION create_game(
    p_table_id INTEGER,
    p_dealer_id INTEGER,
    p_game_type game_type_enum
)
RETURNS TABLE(
    game_id INTEGER,
    message TEXT
) AS $$
DECLARE
    v_game_id INTEGER;
    v_table_status table_status;
    v_dealer_status dealer_status;
    v_dealer_active_games INTEGER;
BEGIN
    -- Validate table exists and is available
    SELECT status INTO v_table_status FROM CASINO_TABLE WHERE table_id = p_table_id;
    IF v_table_status IS NULL THEN
        RAISE EXCEPTION 'Table not found';
    END IF;
    IF v_table_status != 'AVAILABLE' THEN
        RAISE EXCEPTION 'Table is not available. Status: %', v_table_status;
    END IF;

    -- Validate dealer exists and is active
    SELECT status INTO v_dealer_status FROM DEALER WHERE dealer_id = p_dealer_id;
    IF v_dealer_status IS NULL THEN
        RAISE EXCEPTION 'Dealer not found';
    END IF;
    IF v_dealer_status != 'ACTIVE' THEN
        RAISE EXCEPTION 'Dealer is not active. Status: %', v_dealer_status;
    END IF;

    -- Check dealer doesn't have active games
    SELECT COUNT(*) INTO v_dealer_active_games
    FROM GAME 
    WHERE dealer_id = p_dealer_id AND status = 'ACTIVE';
    
    IF v_dealer_active_games > 0 THEN
        RAISE EXCEPTION 'Dealer already has % active game(s)', v_dealer_active_games;
    END IF;

    -- Create game
    INSERT INTO GAME (table_id, dealer_id, game_type, status, start_time)
    VALUES (p_table_id, p_dealer_id, p_game_type, 'ACTIVE', CURRENT_TIMESTAMP)
    RETURNING GAME.game_id INTO v_game_id;

    -- Return result
    RETURN QUERY SELECT v_game_id, 'Game created successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PROCEDURE 6: End a game
-- =====================================================

CREATE OR REPLACE FUNCTION end_game(
    p_game_id INTEGER,
    p_status game_status DEFAULT 'COMPLETED'
)
RETURNS TABLE(
    game_id INTEGER,
    pending_bets INTEGER,
    message TEXT
) AS $$
DECLARE
    v_pending_bets INTEGER;
    v_current_status game_status;
BEGIN
    -- Validate game exists
    SELECT status INTO v_current_status FROM GAME WHERE GAME.game_id = p_game_id;
    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'Game not found';
    END IF;
    
    IF v_current_status != 'ACTIVE' THEN
        RAISE EXCEPTION 'Game is not active. Current status: %', v_current_status;
    END IF;

    -- Count pending bets
    SELECT COUNT(*) INTO v_pending_bets
    FROM BET
    WHERE game_id = p_game_id AND outcome = 'PENDING';

    -- Warn if there are pending bets
    IF v_pending_bets > 0 AND p_status = 'COMPLETED' THEN
        RAISE WARNING 'Game has % pending bet(s). Consider settling them first.', v_pending_bets;
    END IF;

    -- Update game status
    UPDATE GAME 
    SET status = p_status,
        end_time = CURRENT_TIMESTAMP
    WHERE GAME.game_id = p_game_id;

    -- Return result
    RETURN QUERY SELECT p_game_id, v_pending_bets, 'Game ended successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION 7: Get player statistics
-- =====================================================

CREATE OR REPLACE FUNCTION get_player_statistics(p_player_id INTEGER)
RETURNS TABLE(
    player_id INTEGER,
    player_name VARCHAR(100),
    total_bets BIGINT,
    total_wagered DECIMAL(12, 2),
    total_won DECIMAL(12, 2),
    total_lost DECIMAL(12, 2),
    pending_bets BIGINT,
    win_rate DECIMAL(5, 2),
    current_balance DECIMAL(12, 2),
    biggest_win DECIMAL(10, 2),
    total_games BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.player_id,
        p.name,
        COUNT(b.bet_id) as total_bets,
        COALESCE(SUM(b.amount), 0) as total_wagered,
        COALESCE(SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END), 0) as total_won,
        COALESCE(SUM(CASE WHEN b.outcome = 'LOST' THEN b.amount ELSE 0 END), 0) as total_lost,
        COUNT(CASE WHEN b.outcome = 'PENDING' THEN 1 END) as pending_bets,
        CASE 
            WHEN COUNT(CASE WHEN b.outcome IN ('WON', 'LOST') THEN 1 END) > 0 
            THEN ROUND(
                COUNT(CASE WHEN b.outcome = 'WON' THEN 1 END)::DECIMAL * 100.0 / 
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
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION 8: Get game summary
-- =====================================================

CREATE OR REPLACE FUNCTION get_game_summary(p_game_id INTEGER)
RETURNS TABLE(
    game_id INTEGER,
    game_type game_type_enum,
    table_number VARCHAR(20),
    dealer_name VARCHAR(100),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration INTERVAL,
    status game_status,
    total_bets BIGINT,
    total_wagered DECIMAL(12, 2),
    total_payout DECIMAL(12, 2),
    casino_profit DECIMAL(12, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.game_id,
        g.game_type,
        ct.table_number,
        d.name as dealer_name,
        g.start_time,
        g.end_time,
        CASE 
            WHEN g.end_time IS NOT NULL THEN g.end_time - g.start_time
            ELSE CURRENT_TIMESTAMP - g.start_time
        END as duration,
        g.status,
        COUNT(b.bet_id) as total_bets,
        COALESCE(SUM(b.amount), 0) as total_wagered,
        COALESCE(SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END), 0) as total_payout,
        COALESCE(SUM(b.amount), 0) - COALESCE(SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END), 0) as casino_profit
    FROM GAME g
    JOIN CASINO_TABLE ct ON g.table_id = ct.table_id
    JOIN DEALER d ON g.dealer_id = d.dealer_id
    LEFT JOIN BET b ON g.game_id = b.game_id
    WHERE g.game_id = p_game_id
    GROUP BY g.game_id, g.game_type, ct.table_number, d.name, g.start_time, g.end_time, g.status;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION 9: Get top players by wagered amount
-- =====================================================

CREATE OR REPLACE FUNCTION get_top_players(p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
    rank BIGINT,
    player_id INTEGER,
    player_name VARCHAR(100),
    total_wagered DECIMAL(12, 2),
    total_bets BIGINT,
    win_rate DECIMAL(5, 2),
    current_balance DECIMAL(12, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROW_NUMBER() OVER (ORDER BY SUM(b.amount) DESC) as rank,
        p.player_id,
        p.name as player_name,
        SUM(b.amount) as total_wagered,
        COUNT(b.bet_id) as total_bets,
        CASE 
            WHEN COUNT(CASE WHEN b.outcome IN ('WON', 'LOST') THEN 1 END) > 0 
            THEN ROUND(
                COUNT(CASE WHEN b.outcome = 'WON' THEN 1 END)::DECIMAL * 100.0 / 
                COUNT(CASE WHEN b.outcome IN ('WON', 'LOST') THEN 1 END), 2
            )
            ELSE 0
        END as win_rate,
        w.balance as current_balance
    FROM PLAYER p
    INNER JOIN BET b ON p.player_id = b.player_id
    LEFT JOIN WALLET w ON p.player_id = w.player_id
    WHERE p.status = 'ACTIVE'
    GROUP BY p.player_id, p.name, w.balance
    ORDER BY total_wagered DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION 10: Calculate dealer performance
-- =====================================================

CREATE OR REPLACE FUNCTION get_dealer_performance(p_dealer_id INTEGER)
RETURNS TABLE(
    dealer_id INTEGER,
    dealer_name VARCHAR(100),
    total_games BIGINT,
    active_games BIGINT,
    completed_games BIGINT,
    total_duration INTERVAL,
    avg_game_duration INTERVAL,
    total_bets_handled BIGINT,
    total_revenue_generated DECIMAL(12, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.dealer_id,
        d.name as dealer_name,
        COUNT(g.game_id) as total_games,
        COUNT(CASE WHEN g.status = 'ACTIVE' THEN 1 END) as active_games,
        COUNT(CASE WHEN g.status = 'COMPLETED' THEN 1 END) as completed_games,
        SUM(CASE 
            WHEN g.end_time IS NOT NULL THEN g.end_time - g.start_time
            ELSE INTERVAL '0'
        END) as total_duration,
        AVG(CASE 
            WHEN g.end_time IS NOT NULL THEN g.end_time - g.start_time
            ELSE NULL
        END) as avg_game_duration,
        COUNT(b.bet_id) as total_bets_handled,
        COALESCE(SUM(b.amount) - SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END), 0) as total_revenue_generated
    FROM DEALER d
    LEFT JOIN GAME g ON d.dealer_id = g.dealer_id
    LEFT JOIN BET b ON g.game_id = b.game_id
    WHERE d.dealer_id = p_dealer_id
    GROUP BY d.dealer_id, d.name;
END;
$$ LANGUAGE plpgsql;

-- End of procedures.sql
