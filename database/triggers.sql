-- Casino Database Management System
-- Triggers for Automated Business Logic

-- =====================================================
-- TRIGGER 1: Auto-update timestamp on record modification
-- =====================================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
CREATE TRIGGER trigger_update_dealer_timestamp
    BEFORE UPDATE ON DEALER
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_player_timestamp
    BEFORE UPDATE ON PLAYER
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_game_timestamp
    BEFORE UPDATE ON GAME
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_bet_timestamp
    BEFORE UPDATE ON BET
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_casino_table_timestamp
    BEFORE UPDATE ON CASINO_TABLE
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- =====================================================
-- TRIGGER 2: Create wallet automatically when player registers
-- =====================================================

CREATE OR REPLACE FUNCTION create_wallet_for_new_player()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO WALLET (player_id, balance, last_updated)
    VALUES (NEW.player_id, 0.00, CURRENT_TIMESTAMP);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_wallet
    AFTER INSERT ON PLAYER
    FOR EACH ROW
    EXECUTE FUNCTION create_wallet_for_new_player();

-- =====================================================
-- TRIGGER 3: Record transaction when wallet is updated
-- =====================================================

CREATE OR REPLACE FUNCTION record_wallet_transaction()
RETURNS TRIGGER AS $$
DECLARE
    trans_type transaction_type;
    trans_amount DECIMAL(10, 2);
    trans_desc TEXT;
BEGIN
    -- Determine transaction type based on balance change
    IF NEW.balance > OLD.balance THEN
        trans_type = 'DEPOSIT';
        trans_amount = NEW.balance - OLD.balance;
        trans_desc = 'Balance increased';
    ELSIF NEW.balance < OLD.balance THEN
        trans_amount = OLD.balance - NEW.balance;
        trans_desc = 'Balance decreased';
        -- Check if it's a withdrawal or bet (we'll default to withdrawal here)
        trans_type = 'WITHDRAWAL';
    ELSE
        RETURN NEW; -- No change in balance
    END IF;

    -- Insert transaction record
    INSERT INTO TRANSACTION (
        wallet_id,
        transaction_type,
        amount,
        timestamp,
        description,
        balance_before,
        balance_after
    ) VALUES (
        NEW.wallet_id,
        trans_type,
        trans_amount,
        CURRENT_TIMESTAMP,
        trans_desc,
        OLD.balance,
        NEW.balance
    );

    -- Update wallet last_updated
    NEW.last_updated = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_record_wallet_transaction
    BEFORE UPDATE OF balance ON WALLET
    FOR EACH ROW
    WHEN (OLD.balance IS DISTINCT FROM NEW.balance)
    EXECUTE FUNCTION record_wallet_transaction();

-- =====================================================
-- TRIGGER 4: Validate bet amount against table limits
-- =====================================================

CREATE OR REPLACE FUNCTION validate_bet_amount()
RETURNS TRIGGER AS $$
DECLARE
    min_bet DECIMAL(10, 2);
    max_bet DECIMAL(10, 2);
    table_game_type game_type_enum;
BEGIN
    -- Get table limits from the game's table
    SELECT ct.minimum_bet, ct.maximum_bet, ct.game_type
    INTO min_bet, max_bet, table_game_type
    FROM GAME g
    JOIN CASINO_TABLE ct ON g.table_id = ct.table_id
    WHERE g.game_id = NEW.game_id;

    -- Validate bet amount
    IF NEW.amount < min_bet THEN
        RAISE EXCEPTION 'Bet amount % is below table minimum %', NEW.amount, min_bet;
    END IF;

    IF NEW.amount > max_bet THEN
        RAISE EXCEPTION 'Bet amount % exceeds table maximum %', NEW.amount, max_bet;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_bet_amount
    BEFORE INSERT ON BET
    FOR EACH ROW
    EXECUTE FUNCTION validate_bet_amount();

-- =====================================================
-- TRIGGER 5: Validate player has sufficient balance before bet
-- =====================================================

CREATE OR REPLACE FUNCTION validate_player_balance()
RETURNS TRIGGER AS $$
DECLARE
    current_balance DECIMAL(12, 2);
BEGIN
    -- Get player's current wallet balance
    SELECT balance INTO current_balance
    FROM WALLET
    WHERE player_id = NEW.player_id;

    -- Check if player has sufficient funds
    IF current_balance < NEW.amount THEN
        RAISE EXCEPTION 'Insufficient balance. Current balance: %, Bet amount: %', 
            current_balance, NEW.amount;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_player_balance
    BEFORE INSERT ON BET
    FOR EACH ROW
    EXECUTE FUNCTION validate_player_balance();

-- =====================================================
-- TRIGGER 6: Deduct bet amount from wallet on bet placement
-- =====================================================

CREATE OR REPLACE FUNCTION deduct_bet_from_wallet()
RETURNS TRIGGER AS $$
BEGIN
    -- Deduct bet amount from player's wallet
    UPDATE WALLET
    SET balance = balance - NEW.amount
    WHERE player_id = NEW.player_id;

    -- Record transaction
    INSERT INTO TRANSACTION (
        wallet_id,
        transaction_type,
        amount,
        timestamp,
        description,
        reference_id,
        balance_before,
        balance_after
    )
    SELECT
        w.wallet_id,
        'BET',
        -NEW.amount,
        CURRENT_TIMESTAMP,
        'Bet placed on game #' || NEW.game_id,
        NEW.bet_id,
        w.balance + NEW.amount,
        w.balance
    FROM WALLET w
    WHERE w.player_id = NEW.player_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deduct_bet_from_wallet
    AFTER INSERT ON BET
    FOR EACH ROW
    EXECUTE FUNCTION deduct_bet_from_wallet();

-- =====================================================
-- TRIGGER 7: Credit payout to wallet when bet is won
-- =====================================================

CREATE OR REPLACE FUNCTION credit_payout_to_wallet()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if bet outcome changed to WON and payout > 0
    IF NEW.outcome = 'WON' AND OLD.outcome != 'WON' AND NEW.payout > 0 THEN
        
        -- Credit payout to player's wallet
        UPDATE WALLET
        SET balance = balance + NEW.payout
        WHERE player_id = NEW.player_id;

        -- Record transaction
        INSERT INTO TRANSACTION (
            wallet_id,
            transaction_type,
            amount,
            timestamp,
            description,
            reference_id,
            balance_before,
            balance_after
        )
        SELECT
            w.wallet_id,
            'PAYOUT',
            NEW.payout,
            CURRENT_TIMESTAMP,
            'Payout for winning bet #' || NEW.bet_id,
            NEW.bet_id,
            w.balance - NEW.payout,
            w.balance
        FROM WALLET w
        WHERE w.player_id = NEW.player_id;
        
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_credit_payout_to_wallet
    AFTER UPDATE OF outcome, payout ON BET
    FOR EACH ROW
    WHEN (NEW.outcome = 'WON')
    EXECUTE FUNCTION credit_payout_to_wallet();

-- =====================================================
-- TRIGGER 8: Prevent betting on inactive or completed games
-- =====================================================

CREATE OR REPLACE FUNCTION validate_game_status()
RETURNS TRIGGER AS $$
DECLARE
    game_current_status game_status;
BEGIN
    -- Get current game status
    SELECT status INTO game_current_status
    FROM GAME
    WHERE game_id = NEW.game_id;

    -- Only allow betting on active games
    IF game_current_status != 'ACTIVE' THEN
        RAISE EXCEPTION 'Cannot place bet. Game status is: %', game_current_status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_game_status
    BEFORE INSERT ON BET
    FOR EACH ROW
    EXECUTE FUNCTION validate_game_status();

-- =====================================================
-- TRIGGER 9: Validate player status before bet
-- =====================================================

CREATE OR REPLACE FUNCTION validate_player_status()
RETURNS TRIGGER AS $$
DECLARE
    player_current_status player_status;
BEGIN
    -- Get player status
    SELECT status INTO player_current_status
    FROM PLAYER
    WHERE player_id = NEW.player_id;

    -- Only active players can bet
    IF player_current_status != 'ACTIVE' THEN
        RAISE EXCEPTION 'Cannot place bet. Player status is: %', player_current_status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_player_status
    BEFORE INSERT ON BET
    FOR EACH ROW
    EXECUTE FUNCTION validate_player_status();

-- =====================================================
-- TRIGGER 10: Update table status when game starts/ends
-- =====================================================

CREATE OR REPLACE FUNCTION update_table_status()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'ACTIVE' THEN
        -- Mark table as occupied when game starts
        UPDATE CASINO_TABLE
        SET status = 'OCCUPIED'
        WHERE table_id = NEW.table_id;
        
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'ACTIVE' AND NEW.status IN ('COMPLETED', 'CANCELLED') THEN
        -- Mark table as available when game ends
        UPDATE CASINO_TABLE
        SET status = 'AVAILABLE'
        WHERE table_id = NEW.table_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_table_status
    AFTER INSERT OR UPDATE OF status ON GAME
    FOR EACH ROW
    EXECUTE FUNCTION update_table_status();

-- =====================================================
-- TRIGGER 11: Prevent deletion of players with pending bets
-- =====================================================

CREATE OR REPLACE FUNCTION prevent_player_deletion_with_pending_bets()
RETURNS TRIGGER AS $$
DECLARE
    pending_bet_count INTEGER;
BEGIN
    -- Check for pending bets
    SELECT COUNT(*) INTO pending_bet_count
    FROM BET
    WHERE player_id = OLD.player_id
    AND outcome = 'PENDING';

    IF pending_bet_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete player. Player has % pending bet(s)', pending_bet_count;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_player_deletion_with_pending_bets
    BEFORE DELETE ON PLAYER
    FOR EACH ROW
    EXECUTE FUNCTION prevent_player_deletion_with_pending_bets();

-- =====================================================
-- TRIGGER 12: Check dealer availability (no concurrent games)
-- =====================================================

CREATE OR REPLACE FUNCTION check_dealer_availability()
RETURNS TRIGGER AS $$
DECLARE
    active_game_count INTEGER;
BEGIN
    -- Check if dealer already has an active game
    SELECT COUNT(*) INTO active_game_count
    FROM GAME
    WHERE dealer_id = NEW.dealer_id
    AND status = 'ACTIVE'
    AND game_id != COALESCE(NEW.game_id, -1); -- Exclude current game if updating

    IF active_game_count > 0 THEN
        RAISE EXCEPTION 'Dealer is already conducting an active game';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_dealer_availability
    BEFORE INSERT OR UPDATE OF dealer_id, status ON GAME
    FOR EACH ROW
    WHEN (NEW.status = 'ACTIVE')
    EXECUTE FUNCTION check_dealer_availability();

-- End of triggers.sql
