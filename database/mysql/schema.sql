-- Casino Database Management System
-- MySQL Schema Definition with Complete Constraints

-- Drop existing tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS TRANSACTION;
DROP TABLE IF EXISTS BET;
DROP TABLE IF EXISTS GAME;
DROP TABLE IF EXISTS WALLET;
DROP TABLE IF EXISTS PLAYER;
DROP TABLE IF EXISTS CASINO_TABLE;
DROP TABLE IF EXISTS DEALER;

-- =====================================================
-- DEALER TABLE
-- =====================================================
CREATE TABLE DEALER (
    dealer_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    shift ENUM('MORNING', 'AFTERNOON', 'NIGHT'),
    hire_date DATE NOT NULL DEFAULT (CURDATE()),
    status ENUM('ACTIVE', 'INACTIVE', 'ON_LEAVE') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- CASINO_TABLE
-- =====================================================
CREATE TABLE CASINO_TABLE (
    table_id INT AUTO_INCREMENT PRIMARY KEY,
    table_number VARCHAR(20) UNIQUE NOT NULL,
    game_type ENUM('BLACKJACK', 'POKER', 'ROULETTE', 'CRAPS', 'BACCARAT', 'SLOTS') NOT NULL,
    minimum_bet DECIMAL(10, 2) NOT NULL,
    maximum_bet DECIMAL(10, 2) NOT NULL,
    status ENUM('AVAILABLE', 'OCCUPIED', 'MAINTENANCE') NOT NULL DEFAULT 'AVAILABLE',
    capacity INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CHECK (minimum_bet > 0),
    CHECK (maximum_bet > minimum_bet),
    CHECK (capacity > 0 AND capacity <= 10)
) ENGINE=InnoDB;

-- =====================================================
-- GAME TABLE
-- =====================================================
CREATE TABLE GAME (
    game_id INT AUTO_INCREMENT PRIMARY KEY,
    table_id INT NOT NULL,
    dealer_id INT NOT NULL,
    game_type ENUM('BLACKJACK', 'POKER', 'ROULETTE', 'CRAPS', 'BACCARAT', 'SLOTS') NOT NULL,
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    status ENUM('ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_game_table FOREIGN KEY (table_id) 
        REFERENCES CASINO_TABLE(table_id) ON DELETE RESTRICT,
    CONSTRAINT fk_game_dealer FOREIGN KEY (dealer_id) 
        REFERENCES DEALER(dealer_id) ON DELETE RESTRICT,
    
    -- Business Rules
    CHECK (end_time IS NULL OR end_time > start_time)
) ENGINE=InnoDB;

-- =====================================================
-- PLAYER TABLE
-- =====================================================
CREATE TABLE PLAYER (
    player_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    registration_date DATE NOT NULL DEFAULT (CURDATE()),
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'BANNED') NOT NULL DEFAULT 'ACTIVE',
    password_hash VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- WALLET TABLE
-- =====================================================
CREATE TABLE WALLET (
    wallet_id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT UNIQUE NOT NULL,
    balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key
    CONSTRAINT fk_wallet_player FOREIGN KEY (player_id) 
        REFERENCES PLAYER(player_id) ON DELETE CASCADE,
    
    -- Business Rules
    CHECK (balance >= 0)
) ENGINE=InnoDB;

-- =====================================================
-- BET TABLE
-- =====================================================
CREATE TABLE BET (
    bet_id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    game_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    bet_type VARCHAR(50) NOT NULL,
    outcome ENUM('PENDING', 'WON', 'LOST', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    payout DECIMAL(10, 2) DEFAULT 0.00,
    bet_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_bet_player FOREIGN KEY (player_id) 
        REFERENCES PLAYER(player_id) ON DELETE RESTRICT,
    CONSTRAINT fk_bet_game FOREIGN KEY (game_id) 
        REFERENCES GAME(game_id) ON DELETE RESTRICT,
    
    -- Business Rules
    CHECK (amount > 0),
    CHECK (payout >= 0)
) ENGINE=InnoDB;

-- =====================================================
-- TRANSACTION TABLE
-- =====================================================
CREATE TABLE TRANSACTION (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    wallet_id INT NOT NULL,
    transaction_type ENUM('DEPOSIT', 'WITHDRAWAL', 'BET', 'PAYOUT', 'BONUS_ADJUSTMENT') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    reference_id INT,
    balance_before DECIMAL(12, 2) NOT NULL,
    balance_after DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key
    CONSTRAINT fk_transaction_wallet FOREIGN KEY (wallet_id) 
        REFERENCES WALLET(wallet_id) ON DELETE RESTRICT,
    
    -- Business Rules
    CHECK (amount <> 0)
) ENGINE=InnoDB;

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
CREATE INDEX idx_dealer_shift ON DEALER(shift);

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

-- End of MySQL schema.sql
