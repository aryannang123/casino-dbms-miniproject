-- Casino Database Management System
-- Role-Based Access Control (RBAC) - MySQL Addition
-- =====================================================
-- Add role-based access control to the existing schema
-- =====================================================

-- =====================================================
-- ROLE TABLE - Stores available roles in the system
-- =====================================================
CREATE TABLE IF NOT EXISTS ROLE (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name ENUM('PLAYER', 'DEALER', 'ADMIN') NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- USER_ROLE TABLE - Maps players to their roles
-- =====================================================
CREATE TABLE IF NOT EXISTS USER_ROLE (
    user_role_id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    role_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INT NULL,   -- Player ID of admin who assigned the role
    is_active TINYINT(1) NOT NULL DEFAULT 1,

    CONSTRAINT fk_user_role_player FOREIGN KEY (player_id)
        REFERENCES PLAYER(player_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_role_role FOREIGN KEY (role_id)
        REFERENCES ROLE(role_id) ON DELETE CASCADE,
    CONSTRAINT uq_player_role UNIQUE (player_id, role_id)
) ENGINE=InnoDB;

-- =====================================================
-- PERMISSION TABLE - Granular permission definitions
-- =====================================================
CREATE TABLE IF NOT EXISTS PERMISSION (
    permission_id INT AUTO_INCREMENT PRIMARY KEY,
    permission_name VARCHAR(100) NOT NULL UNIQUE,
    resource VARCHAR(50) NOT NULL,
    action ENUM('READ', 'CREATE', 'UPDATE', 'DELETE', 'EXECUTE') NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- ROLE_PERMISSION TABLE - Maps roles to permissions
-- =====================================================
CREATE TABLE IF NOT EXISTS ROLE_PERMISSION (
    role_permission_id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    permission_id INT NOT NULL,

    CONSTRAINT fk_rp_role FOREIGN KEY (role_id)
        REFERENCES ROLE(role_id) ON DELETE CASCADE,
    CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id)
        REFERENCES PERMISSION(permission_id) ON DELETE CASCADE,
    CONSTRAINT uq_role_permission UNIQUE (role_id, permission_id)
) ENGINE=InnoDB;

-- =====================================================
-- Indexes for RBAC tables
-- =====================================================
CREATE INDEX idx_user_role_player ON USER_ROLE(player_id);
CREATE INDEX idx_user_role_role ON USER_ROLE(role_id);
CREATE INDEX idx_user_role_active ON USER_ROLE(is_active);

-- =====================================================
-- Seed Data: Default Roles
-- =====================================================
INSERT INTO ROLE (role_name, description) VALUES
('PLAYER', 'Regular casino player - can place bets, manage wallet, view own game history'),
('DEALER', 'Casino dealer - can manage game sessions, settle bets, view tables'),
('ADMIN', 'Casino administrator - full access to all features, player management, analytics');

-- =====================================================
-- Seed Data: Permissions
-- =====================================================
INSERT INTO PERMISSION (permission_name, resource, action, description) VALUES
-- PLAYER permissions
('bet:create',      'BET',          'CREATE', 'Place a new bet'),
('bet:read_own',    'BET',          'READ',   'Read own bets'),
('wallet:read_own', 'WALLET',       'READ',   'View own wallet balance'),
('wallet:deposit',  'WALLET',       'UPDATE', 'Deposit funds into wallet'),
('wallet:withdraw', 'WALLET',       'UPDATE', 'Withdraw funds from wallet'),
('game:read',       'GAME',         'READ',   'View game listings'),
('profile:read',    'PLAYER',       'READ',   'View own profile'),
('profile:update',  'PLAYER',       'UPDATE', 'Update own profile'),
-- DEALER permissions
('bet:settle',      'BET',          'UPDATE', 'Settle a bet outcome'),
('bet:read_all',    'BET',          'READ',   'Read all bets in a game'),
('game:create',     'GAME',         'CREATE', 'Create a new game session'),
('game:update',     'GAME',         'UPDATE', 'Update game status'),
('table:read',      'CASINO_TABLE', 'READ',   'View casino tables'),
-- ADMIN permissions
('player:read_all', 'PLAYER',       'READ',   'View all players'),
('player:update',   'PLAYER',       'UPDATE', 'Update player status (ban/suspend)'),
('player:delete',   'PLAYER',       'DELETE', 'Remove a player'),
('dealer:manage',   'DEALER',       'CREATE', 'Add/manage dealers'),
('table:manage',    'CASINO_TABLE', 'CREATE', 'Add/manage tables'),
('analytics:read',  'ANALYTICS',    'READ',   'View casino analytics dashboard'),
('role:assign',     'USER_ROLE',    'CREATE', 'Assign roles to users');

-- =====================================================
-- Seed Data: Role-Permission Mappings
-- =====================================================

-- PLAYER (role_id=1) permissions
INSERT INTO ROLE_PERMISSION (role_id, permission_id)
SELECT 1, permission_id FROM PERMISSION
WHERE permission_name IN ('bet:create','bet:read_own','wallet:read_own','wallet:deposit','wallet:withdraw','game:read','profile:read','profile:update');

-- DEALER (role_id=2) permissions - includes all PLAYER permissions + dealer-specific
INSERT INTO ROLE_PERMISSION (role_id, permission_id)
SELECT 2, permission_id FROM PERMISSION
WHERE permission_name IN ('bet:create','bet:read_own','bet:settle','bet:read_all','wallet:read_own','wallet:deposit','wallet:withdraw','game:read','game:create','game:update','table:read','profile:read','profile:update');

-- ADMIN (role_id=3) permissions - all permissions
INSERT INTO ROLE_PERMISSION (role_id, permission_id)
SELECT 3, permission_id FROM PERMISSION;

-- =====================================================
-- Seed Data: Assign default PLAYER role to all existing players
-- =====================================================
INSERT INTO USER_ROLE (player_id, role_id)
SELECT p.player_id, 1  -- role_id 1 = PLAYER
FROM PLAYER p;

-- =====================================================
-- Create admin accounts (players with ADMIN role)
-- =====================================================
-- Insert admin user (password: Admin@123 - bcrypt hash)
INSERT INTO PLAYER (name, email, phone, registration_date, status, password_hash, date_of_birth, address)
VALUES ('Casino Admin', 'admin@casino.com', '+1-555-9999', CURDATE(), 'ACTIVE',
        '$2b$10$YourBcryptHashHere.replaceWithRealHash', '1980-01-01', 'Casino HQ, Las Vegas, NV')
ON DUPLICATE KEY UPDATE name = name;

-- Assign ADMIN role to admin user
INSERT INTO USER_ROLE (player_id, role_id)
SELECT p.player_id, 3 FROM PLAYER p WHERE p.email = 'admin@casino.com'
ON DUPLICATE KEY UPDATE is_active = 1;

-- =====================================================
-- Create dealer accounts (existing players with DEALER role)
-- =====================================================
-- Assign DEALER role to first 2 players as demo
INSERT INTO USER_ROLE (player_id, role_id)
SELECT p.player_id, 2 FROM PLAYER p WHERE p.email IN ('alice.cooper@email.com', 'bob.martinez@email.com')
ON DUPLICATE KEY UPDATE is_active = 1;

-- =====================================================
-- VIEW: User with roles (useful for auth)
-- =====================================================
CREATE OR REPLACE VIEW v_player_roles AS
SELECT 
    p.player_id,
    p.name,
    p.email,
    p.status,
    GROUP_CONCAT(r.role_name ORDER BY r.role_id SEPARATOR ',') AS roles,
    MAX(CASE WHEN r.role_name = 'ADMIN' THEN 1 ELSE 0 END) AS is_admin,
    MAX(CASE WHEN r.role_name = 'DEALER' THEN 1 ELSE 0 END) AS is_dealer
FROM PLAYER p
LEFT JOIN USER_ROLE ur ON p.player_id = ur.player_id AND ur.is_active = 1
LEFT JOIN ROLE r ON ur.role_id = r.role_id
GROUP BY p.player_id, p.name, p.email, p.status;

-- =====================================================
-- STORED PROCEDURE: Get user permissions
-- =====================================================
DELIMITER $$

DROP PROCEDURE IF EXISTS get_user_permissions$$

CREATE PROCEDURE get_user_permissions(IN p_player_id INT)
BEGIN
    SELECT DISTINCT
        perm.permission_name,
        perm.resource,
        perm.action,
        perm.description
    FROM USER_ROLE ur
    JOIN ROLE r ON ur.role_id = r.role_id
    JOIN ROLE_PERMISSION rp ON r.role_id = rp.role_id
    JOIN PERMISSION perm ON rp.permission_id = perm.permission_id
    WHERE ur.player_id = p_player_id
    AND ur.is_active = 1
    ORDER BY perm.resource, perm.action;
END$$

DROP PROCEDURE IF EXISTS assign_role$$

CREATE PROCEDURE assign_role(
    IN p_target_player_id INT,
    IN p_role_name VARCHAR(20),
    IN p_admin_player_id INT
)
BEGIN
    DECLARE v_role_id INT;
    DECLARE v_admin_is_admin INT DEFAULT 0;
    
    -- Check if assigner is admin
    SELECT COUNT(*) INTO v_admin_is_admin
    FROM USER_ROLE ur
    JOIN ROLE r ON ur.role_id = r.role_id
    WHERE ur.player_id = p_admin_player_id
    AND r.role_name = 'ADMIN'
    AND ur.is_active = 1;
    
    IF v_admin_is_admin = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only admins can assign roles';
    END IF;
    
    -- Get role ID
    SELECT role_id INTO v_role_id FROM ROLE WHERE role_name = p_role_name;
    
    IF v_role_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid role name';
    END IF;
    
    -- Assign the role
    INSERT INTO USER_ROLE (player_id, role_id, assigned_by)
    VALUES (p_target_player_id, v_role_id, p_admin_player_id)
    ON DUPLICATE KEY UPDATE is_active = 1, assigned_by = p_admin_player_id, assigned_at = CURRENT_TIMESTAMP;
    
    SELECT CONCAT('Role ', p_role_name, ' assigned successfully') AS message;
END$$

DELIMITER ;

-- =====================================================
-- RBAC Query: Check if a player has a specific permission
-- =====================================================
-- Example usage (as a subquery or standalone):
-- SELECT check permission:
SELECT 
    p.player_id,
    p.name,
    perm.permission_name,
    CASE WHEN perm.permission_id IS NOT NULL THEN 'GRANTED' ELSE 'DENIED' END AS access
FROM PLAYER p
CROSS JOIN (SELECT permission_id, permission_name FROM PERMISSION WHERE permission_name = 'game:create') perm_check
LEFT JOIN (
    SELECT DISTINCT ur.player_id, rp.permission_id
    FROM USER_ROLE ur
    JOIN ROLE_PERMISSION rp ON ur.role_id = rp.role_id
    WHERE ur.is_active = 1
) user_perms ON p.player_id = user_perms.player_id AND perm_check.permission_id = user_perms.permission_id
LEFT JOIN PERMISSION perm ON user_perms.permission_id = perm.permission_id
WHERE p.player_id IN (1, 2, 3)
ORDER BY p.player_id;

