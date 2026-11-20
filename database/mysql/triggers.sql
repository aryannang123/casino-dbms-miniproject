-- Casino Database Management System
-- MySQL Triggers
-- =====================================================

DELIMITER $$

-- =====================================================
-- TRIGGER 1: Auto-create wallet when player registers
-- =====================================================
DROP TRIGGER IF EXISTS trigger_create_wallet$$

CREATE TRIGGER trigger_create_wallet
    AFTER INSERT ON PLAYER
    FOR EACH ROW
BEGIN
    INSERT INTO WALLET (player_id, balance, last_updated)
    VALUES (NEW.player_id, 0.00, CURRENT_TIMESTAMP);
END$$

-- =====================================================
-- TRIGGER 2: Assign default PLAYER role on registration
-- =====================================================
DROP TRIGGER IF EXISTS trigger_assign_default_role$$

CREATE TRIGGER trigger_assign_default_role
    AFTER INSERT ON PLAYER
    FOR EACH ROW
BEGIN
    DECLARE v_role_id INT;
    SELECT role_id INTO v_role_id FROM ROLE WHERE role_name = 'PLAYER' LIMIT 1;
    IF v_role_id IS NOT NULL THEN
        INSERT IGNORE INTO USER_ROLE (player_id, role_id, is_active)
        VALUES (NEW.player_id, v_role_id, 1);
    END IF;
END$$

-- =====================================================
-- TRIGGER 3: Record transaction when wallet balance increases (DEPOSIT/PAYOUT)
-- =====================================================
DROP TRIGGER IF EXISTS trigger_record_wallet_increase$$

CREATE TRIGGER trigger_record_wallet_increase
    AFTER UPDATE ON WALLET
    FOR EACH ROW
BEGIN
    IF NEW.balance > OLD.balance THEN
        INSERT INTO TRANSACTION (wallet_id, transaction_type, amount, description, balance_before, balance_after)
        VALUES (
            NEW.wallet_id,
            'DEPOSIT',
            NEW.balance - OLD.balance,
            'Balance credited',
            OLD.balance,
            NEW.balance
        );
    END IF;
END$$

-- =====================================================
-- TRIGGER 4: Record transaction when wallet balance decreases (BET/WITHDRAWAL)
-- =====================================================
DROP TRIGGER IF EXISTS trigger_record_wallet_decrease$$

CREATE TRIGGER trigger_record_wallet_decrease
    AFTER UPDATE ON WALLET
    FOR EACH ROW
BEGIN
    IF NEW.balance < OLD.balance THEN
        INSERT INTO TRANSACTION (wallet_id, transaction_type, amount, description, balance_before, balance_after)
        VALUES (
            NEW.wallet_id,
            'WITHDRAWAL',
            -(OLD.balance - NEW.balance),
            'Balance debited',
            OLD.balance,
            NEW.balance
        );
    END IF;
END$$

-- =====================================================
-- TRIGGER 5: Validate bet amount against table limits (BEFORE INSERT on BET)
-- =====================================================
DROP TRIGGER IF EXISTS trigger_validate_bet_amount$$

CREATE TRIGGER trigger_validate_bet_amount
    BEFORE INSERT ON BET
    FOR EACH ROW
BEGIN
    DECLARE v_min_bet DECIMAL(10, 2);
    DECLARE v_max_bet DECIMAL(10, 2);

    SELECT ct.minimum_bet, ct.maximum_bet
    INTO v_min_bet, v_max_bet
    FROM GAME g
    JOIN CASINO_TABLE ct ON g.table_id = ct.table_id
    WHERE g.game_id = NEW.game_id;

    IF NEW.amount < v_min_bet THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Bet amount is below the table minimum bet';
    END IF;

    IF NEW.amount > v_max_bet THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Bet amount exceeds the table maximum bet';
    END IF;
END$$

-- =====================================================
-- TRIGGER 6: Validate player has sufficient balance BEFORE bet insert
-- =====================================================
DROP TRIGGER IF EXISTS trigger_validate_player_balance$$

CREATE TRIGGER trigger_validate_player_balance
    BEFORE INSERT ON BET
    FOR EACH ROW
BEGIN
    DECLARE v_balance DECIMAL(12, 2);

    SELECT balance INTO v_balance
    FROM WALLET
    WHERE player_id = NEW.player_id;

    IF v_balance IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Wallet not found for player';
    END IF;

    IF v_balance < NEW.amount THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Insufficient wallet balance to place bet';
    END IF;
END$$

-- =====================================================
-- TRIGGER 7: Deduct bet amount from wallet AFTER bet insert
-- Note: In MySQL, the stored procedure `place_bet` atomically manages wallet
-- balance deduction inside its transaction with rollback support.
-- To prevent double-deduction (procedure + trigger both deducting), this trigger
-- is dropped so the stored procedure is the single source of truth.
-- =====================================================
DROP TRIGGER IF EXISTS trigger_deduct_bet_from_wallet$$

-- =====================================================
-- TRIGGER 8: Credit payout to wallet when bet is WON
-- Note: In MySQL, the stored procedure `settle_bet` atomically manages wallet
-- payout crediting inside its transaction with rollback support.
-- To prevent double-crediting (procedure + trigger both crediting), this trigger
-- is dropped so the stored procedure is the single source of truth.
-- =====================================================
DROP TRIGGER IF EXISTS trigger_credit_payout_to_wallet$$

-- =====================================================
-- TRIGGER 9: Update table status when game starts or ends
-- =====================================================
DROP TRIGGER IF EXISTS trigger_game_insert_table_status$$

CREATE TRIGGER trigger_game_insert_table_status
    AFTER INSERT ON GAME
    FOR EACH ROW
BEGIN
    IF NEW.status = 'ACTIVE' THEN
        UPDATE CASINO_TABLE
        SET status = 'OCCUPIED'
        WHERE table_id = NEW.table_id;
    END IF;
END$$

DROP TRIGGER IF EXISTS trigger_game_update_table_status$$

CREATE TRIGGER trigger_game_update_table_status
    AFTER UPDATE ON GAME
    FOR EACH ROW
BEGIN
    IF OLD.status = 'ACTIVE' AND NEW.status IN ('COMPLETED', 'CANCELLED') THEN
        UPDATE CASINO_TABLE
        SET status = 'AVAILABLE'
        WHERE table_id = NEW.table_id;
    END IF;
END$$

-- =====================================================
-- TRIGGER 10: Prevent betting on non-ACTIVE games
-- =====================================================
DROP TRIGGER IF EXISTS trigger_validate_game_status$$

CREATE TRIGGER trigger_validate_game_status
    BEFORE INSERT ON BET
    FOR EACH ROW
BEGIN
    DECLARE v_game_status VARCHAR(20);

    SELECT status INTO v_game_status
    FROM GAME
    WHERE game_id = NEW.game_id;

    IF v_game_status != 'ACTIVE' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot place bet on a game that is not ACTIVE';
    END IF;
END$$

-- =====================================================
-- TRIGGER 11: Prevent betting by non-ACTIVE players
-- =====================================================
DROP TRIGGER IF EXISTS trigger_validate_player_status$$

CREATE TRIGGER trigger_validate_player_status
    BEFORE INSERT ON BET
    FOR EACH ROW
BEGIN
    DECLARE v_player_status VARCHAR(20);

    SELECT status INTO v_player_status
    FROM PLAYER
    WHERE player_id = NEW.player_id;

    IF v_player_status != 'ACTIVE' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Only ACTIVE players can place bets';
    END IF;
END$$

-- =====================================================
-- TRIGGER 12: Prevent deletion of player with pending bets
-- =====================================================
DROP TRIGGER IF EXISTS trigger_prevent_player_deletion_pending_bets$$

CREATE TRIGGER trigger_prevent_player_deletion_pending_bets
    BEFORE DELETE ON PLAYER
    FOR EACH ROW
BEGIN
    DECLARE v_pending_count INT DEFAULT 0;

    SELECT COUNT(*) INTO v_pending_count
    FROM BET
    WHERE player_id = OLD.player_id AND outcome = 'PENDING';

    IF v_pending_count > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot delete player with pending bets';
    END IF;
END$$

-- =====================================================
-- TRIGGER 13: Check dealer availability (no concurrent active games)
-- =====================================================
DROP TRIGGER IF EXISTS trigger_check_dealer_availability$$

CREATE TRIGGER trigger_check_dealer_availability
    BEFORE INSERT ON GAME
    FOR EACH ROW
BEGIN
    DECLARE v_active_count INT DEFAULT 0;

    IF NEW.status = 'ACTIVE' THEN
        SELECT COUNT(*) INTO v_active_count
        FROM GAME
        WHERE dealer_id = NEW.dealer_id AND status = 'ACTIVE';

        IF v_active_count > 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Dealer already has an active game in progress';
        END IF;
    END IF;
END$$

-- =====================================================
-- TRIGGER 14: Auto-sync player into DEALER table on DEALER role assignment
-- =====================================================
DROP TRIGGER IF EXISTS trigger_sync_dealer_on_role_assign$$

CREATE TRIGGER trigger_sync_dealer_on_role_assign
    AFTER INSERT ON USER_ROLE
    FOR EACH ROW
BEGIN
    DECLARE v_role_name VARCHAR(20);
    DECLARE v_player_name VARCHAR(100);
    DECLARE v_emp_code VARCHAR(20);
    
    SELECT role_name INTO v_role_name FROM ROLE WHERE role_id = NEW.role_id;
    
    IF v_role_name = 'DEALER' AND NEW.is_active = 1 THEN
        SELECT name INTO v_player_name FROM PLAYER WHERE player_id = NEW.player_id;
        
        -- Only insert if not already present in DEALER table
        IF NOT EXISTS (SELECT 1 FROM DEALER WHERE name = v_player_name) THEN
            SET v_emp_code = CONCAT('EMP', LPAD(NEW.player_id + 10, 3, '0'));
            INSERT INTO DEALER (name, employee_id, hire_date, status)
            VALUES (v_player_name, v_emp_code, CURDATE(), 'ACTIVE');
        END IF;
    END IF;
END$$

-- =====================================================
-- TRIGGER 15: Disallow Admin from holding PLAYER role (BEFORE INSERT on USER_ROLE)
-- =====================================================
DROP TRIGGER IF EXISTS trigger_prevent_admin_player_role$$

CREATE TRIGGER trigger_prevent_admin_player_role
    BEFORE INSERT ON USER_ROLE
    FOR EACH ROW
BEGIN
    DECLARE v_new_role_name VARCHAR(20);
    DECLARE v_has_admin INT DEFAULT 0;
    
    SELECT role_name INTO v_new_role_name FROM ROLE WHERE role_id = NEW.role_id;
    
    IF v_new_role_name = 'PLAYER' AND NEW.is_active = 1 THEN
        SELECT COUNT(*) INTO v_has_admin
        FROM USER_ROLE ur
        JOIN ROLE r ON ur.role_id = r.role_id
        WHERE ur.player_id = NEW.player_id AND r.role_name = 'ADMIN' AND ur.is_active = 1;
        
        IF v_has_admin > 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Disallowed: An Administrator cannot be assigned the PLAYER role.';
        END IF;
    END IF;
END$$

-- =====================================================
-- TRIGGER 16: Disallow Admin from holding PLAYER role (BEFORE UPDATE on USER_ROLE)
-- =====================================================
DROP TRIGGER IF EXISTS trigger_prevent_admin_player_role_update$$

CREATE TRIGGER trigger_prevent_admin_player_role_update
    BEFORE UPDATE ON USER_ROLE
    FOR EACH ROW
BEGIN
    DECLARE v_new_role_name VARCHAR(20);
    DECLARE v_has_admin INT DEFAULT 0;
    
    IF NEW.is_active = 1 THEN
        SELECT role_name INTO v_new_role_name FROM ROLE WHERE role_id = NEW.role_id;
        IF v_new_role_name = 'PLAYER' THEN
            SELECT COUNT(*) INTO v_has_admin
            FROM USER_ROLE ur
            JOIN ROLE r ON ur.role_id = r.role_id
            WHERE ur.player_id = NEW.player_id AND r.role_name = 'ADMIN' AND ur.is_active = 1;
            
            IF v_has_admin > 0 THEN
                SIGNAL SQLSTATE '45000'
                    SET MESSAGE_TEXT = 'Disallowed: An Administrator cannot be assigned the PLAYER role.';
            END IF;
        END IF;
    END IF;
END$$

DELIMITER ;

-- End of MySQL triggers.sql

