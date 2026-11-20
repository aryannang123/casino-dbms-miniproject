-- Casino Database Management System
-- Schema Definition with Complete Constraints

-- Drop existing tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS TRANSACTION CASCADE;
DROP TABLE IF EXISTS BET CASCADE;
DROP TABLE IF EXISTS GAME CASCADE;
DROP TABLE IF EXISTS WALLET CASCADE;
DROP TABLE IF EXISTS PLAYER CASCADE;
DROP TABLE IF EXISTS CASINO_TABLE CASCADE;
DROP TABLE IF EXISTS DEALER CASCADE;

-- Create ENUM types for status fields
CREATE TYPE player_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'BANNED');
CREATE TYPE dealer_status AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE');
CREATE TYPE game_status AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE table_status AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE');
CREATE TYPE bet_type AS ENUM ('WIN', 'LOSS', 'PUSH', 'BLACKJACK');
CREATE TYPE bet_outcome AS ENUM ('PENDING', 'WON', 'LOST', 'CANCELLED');
CREATE TYPE transaction_type AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'BET', 'PAYOUT', 'BONUS_ADJUSTMENT');
CREATE TYPE game_type_enum AS ENUM ('BLACKJACK', 'POKER', 'ROULETTE', 'CRAPS', 'BACCARAT', 'SLOTS');

-- =====================================================
-- DEALER TABLE
-- =====================================================
CREATE TABLE DEALER (
    dealer_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status dealer_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- CASINO_TABLE
-- =====================================================
CREATE TABLE CASINO_TABLE (
    table_id SERIAL PRIMARY KEY,
    table_number VARCHAR(20) UNIQUE NOT NULL,
    game_type game_type_enum NOT NULL,
    minimum_bet DECIMAL(10, 2) NOT NULL CHECK (minimum_bet > 0),
    maximum_bet DECIMAL(10, 2) NOT NULL CHECK (maximum_bet > minimum_bet),
    status table_status NOT NULL DEFAULT 'AVAILABLE',
    capacity INTEGER CHECK (capacity > 0 AND capacity <= 10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- GAME TABLE
-- =====================================================
CREATE TABLE GAME (
    game_id SERIAL PRIMARY KEY,
    table_id INTEGER NOT NULL,
    dealer_id INTEGER NOT NULL,
    game_type game_type_enum NOT NULL,
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    status game_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_game_table FOREIGN KEY (table_id) 
        REFERENCES CASINO_TABLE(table_id) ON DELETE RESTRICT,
    CONSTRAINT fk_game_dealer FOREIGN KEY (dealer_id) 
        REFERENCES DEALER(dealer_id) ON DELETE RESTRICT,
    
    -- Business Rules
    CONSTRAINT check_end_time CHECK (end_time IS NULL OR end_time > start_time),
    CONSTRAINT check_game_status_with_time CHECK (
        (status = 'ACTIVE' AND end_time IS NULL) OR 
        (status IN ('COMPLETED', 'CANCELLED') AND end_time IS NOT NULL)
    )
);

-- =====================================================
-- PLAYER TABLE
-- =====================================================
CREATE TABLE PLAYER (
    player_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status player_status NOT NULL DEFAULT 'ACTIVE',
    password_hash VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Business Rules
    CONSTRAINT check_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT check_age CHECK (date_of_birth IS NULL OR 
        (EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth)) >= 18))
);

-- =====================================================
-- WALLET TABLE
-- =====================================================
CREATE TABLE WALLET (
    wallet_id SERIAL PRIMARY KEY,
    player_id INTEGER UNIQUE NOT NULL,
    balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key
    CONSTRAINT fk_wallet_player FOREIGN KEY (player_id) 
        REFERENCES PLAYER(player_id) ON DELETE CASCADE,
    
    -- Business Rules
    CONSTRAINT check_balance CHECK (balance >= 0)
);

-- =====================================================
-- BET TABLE
-- =====================================================
CREATE TABLE BET (
    bet_id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL,
    game_id INTEGER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    bet_type VARCHAR(50) NOT NULL,
    outcome bet_outcome NOT NULL DEFAULT 'PENDING',
    payout DECIMAL(10, 2) DEFAULT 0.00,
    bet_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_bet_player FOREIGN KEY (player_id) 
        REFERENCES PLAYER(player_id) ON DELETE RESTRICT,
    CONSTRAINT fk_bet_game FOREIGN KEY (game_id) 
        REFERENCES GAME(game_id) ON DELETE RESTRICT,
    
    -- Business Rules
    CONSTRAINT check_bet_amount CHECK (amount > 0),
    CONSTRAINT check_payout CHECK (payout >= 0),
    CONSTRAINT check_outcome_payout CHECK (
        (outcome = 'PENDING' AND payout = 0) OR
        (outcome = 'LOST' AND payout = 0) OR
        (outcome = 'CANCELLED' AND payout = 0) OR
        (outcome = 'WON' AND payout >= amount)
    )
);

-- =====================================================
-- TRANSACTION TABLE
-- =====================================================
CREATE TABLE TRANSACTION (
    transaction_id SERIAL PRIMARY KEY,
    wallet_id INTEGER NOT NULL,
    transaction_type transaction_type NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    reference_id INTEGER,
    balance_before DECIMAL(12, 2) NOT NULL,
    balance_after DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key
    CONSTRAINT fk_transaction_wallet FOREIGN KEY (wallet_id) 
        REFERENCES WALLET(wallet_id) ON DELETE RESTRICT,
    
    -- Business Rules
    CONSTRAINT check_transaction_amount CHECK (amount <> 0),
    CONSTRAINT check_balance_calculation CHECK (
        (transaction_type IN ('DEPOSIT', 'PAYOUT', 'BONUS_ADJUSTMENT') AND balance_after = balance_before + amount) OR
        (transaction_type IN ('WITHDRAWAL', 'BET') AND balance_after = balance_before - ABS(amount))
    )
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Player indexes
CREATE INDEX idx_player_email ON PLAYER(email);
CREATE INDEX idx_player_status ON PLAYER(status);
CREATE INDEX idx_player_registration_date ON PLAYER(registration_date);

-- Dealer indexes
CREATE INDEX idx_dealer_employee_id ON DEALER(employee_id);
CREATE INDEX idx_dealer_status ON DEALER(status);

-- Game indexes
CREATE INDEX idx_game_dealer ON GAME(dealer_id);
CREATE INDEX idx_game_table ON GAME(table_id);
CREATE INDEX idx_game_status ON GAME(status);
CREATE INDEX idx_game_start_time ON GAME(start_time);
CREATE INDEX idx_game_type ON GAME(game_type);

-- Bet indexes
CREATE INDEX idx_bet_player ON BET(player_id);
CREATE INDEX idx_bet_game ON BET(game_id);
CREATE INDEX idx_bet_outcome ON BET(outcome);
CREATE INDEX idx_bet_time ON BET(bet_time);

-- Wallet indexes
CREATE INDEX idx_wallet_player ON WALLET(player_id);

-- Transaction indexes
CREATE INDEX idx_transaction_wallet ON TRANSACTION(wallet_id);
CREATE INDEX idx_transaction_type ON TRANSACTION(transaction_type);
CREATE INDEX idx_transaction_timestamp ON TRANSACTION(timestamp);
CREATE INDEX idx_transaction_reference ON TRANSACTION(reference_id);

-- Table indexes
CREATE INDEX idx_casino_table_status ON CASINO_TABLE(status);
CREATE INDEX idx_casino_table_game_type ON CASINO_TABLE(game_type);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE DEALER IS 'Stores casino dealer/employee information';
COMMENT ON TABLE PLAYER IS 'Stores casino player/customer information';
COMMENT ON TABLE CASINO_TABLE IS 'Physical casino gaming tables';
COMMENT ON TABLE GAME IS 'Individual game sessions conducted at tables';
COMMENT ON TABLE BET IS 'Player bets placed during games';
COMMENT ON TABLE WALLET IS 'Player wallet for managing funds';
COMMENT ON TABLE TRANSACTION IS 'Complete audit trail of all financial transactions';

COMMENT ON CONSTRAINT check_balance ON WALLET IS 'Ensures wallet balance cannot go negative';
COMMENT ON CONSTRAINT check_bet_amount ON BET IS 'Ensures bet amount is always positive';
COMMENT ON CONSTRAINT check_payout ON BET IS 'Ensures payout cannot be negative';
COMMENT ON CONSTRAINT check_age ON PLAYER IS 'Ensures players are at least 18 years old';

-- End of schema.sql
