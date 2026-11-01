const bcrypt = require('bcrypt');
const { query } = require('../config/database');
const { generateToken } = require('../middleware/auth');

// =====================================================
// Helper: Get player with roles
// =====================================================
const getPlayerWithRoles = async (playerId) => {
    const result = await query(
        `SELECT p.player_id, p.name, p.email, p.phone, p.registration_date, 
                p.date_of_birth, p.address, p.status,
                GROUP_CONCAT(r.role_name ORDER BY r.role_id SEPARATOR ',') AS roles,
                MAX(CASE WHEN r.role_name = 'ADMIN' THEN 1 ELSE 0 END) AS is_admin,
                MAX(CASE WHEN r.role_name = 'DEALER' THEN 1 ELSE 0 END) AS is_dealer
         FROM PLAYER p
         LEFT JOIN USER_ROLE ur ON p.player_id = ur.player_id AND ur.is_active = 1
         LEFT JOIN ROLE r ON ur.role_id = r.role_id
         WHERE p.player_id = ?
         GROUP BY p.player_id, p.name, p.email, p.phone, p.registration_date, 
                  p.date_of_birth, p.address, p.status`,
        [playerId]
    );
    return result.rows[0];
};

// =====================================================
// Register new player
// =====================================================
const register = async (req, res) => {
    try {
        const { name, email, phone, password, dateOfBirth, address } = req.body;

        // Check if email already exists
        const emailCheck = await query(
            'SELECT player_id FROM PLAYER WHERE email = ?',
            [email]
        );
        if (emailCheck.rows.length > 0) {
            return res.status(409).json({ success: false, message: 'Email already registered.' });
        }

        // Check if phone already exists
        const phoneCheck = await query(
            'SELECT player_id FROM PLAYER WHERE phone = ?',
            [phone]
        );
        if (phoneCheck.rows.length > 0) {
            return res.status(409).json({ success: false, message: 'Phone number already registered.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new player
        await query(
            `INSERT INTO PLAYER (name, email, phone, password_hash, date_of_birth, address, status)
             VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
            [name, email, phone, hashedPassword, dateOfBirth || null, address || null]
        );

        // Get the new player (trigger will have created wallet + assigned PLAYER role)
        const playerResult = await query(
            'SELECT player_id FROM PLAYER WHERE email = ?',
            [email]
        );
        const newPlayerId = playerResult.rows[0].player_id;
        const player = await getPlayerWithRoles(newPlayerId);

        const rolesArray = player.roles ? player.roles.split(',') : ['PLAYER'];
        const token = generateToken(player.player_id, player.email, rolesArray);

        const walletResult = await query(
            'SELECT wallet_id, balance FROM WALLET WHERE player_id = ?',
            [newPlayerId]
        );

        res.status(201).json({
            success: true,
            message: 'Registration successful!',
            data: {
                player: {
                    playerId: player.player_id,
                    name: player.name,
                    email: player.email,
                    phone: player.phone,
                    registrationDate: player.registration_date,
                    status: player.status,
                    roles: rolesArray,
                    role: player.is_admin ? 'ADMIN' : player.is_dealer ? 'DEALER' : 'PLAYER'
                },
                wallet: walletResult.rows[0],
                token
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed. Please try again.',
            error: error.message
        });
    }
};

// =====================================================
// Login
// =====================================================
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find player by email
        const result = await query(
            'SELECT player_id, name, email, password_hash, status FROM PLAYER WHERE email = ?',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        const player = result.rows[0];

        if (player.status !== 'ACTIVE') {
            return res.status(403).json({
                success: false,
                message: `Account is ${player.status}. Please contact support.`
            });
        }

        const isPasswordValid = await bcrypt.compare(password, player.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        // Get full player info with roles
        const fullPlayer = await getPlayerWithRoles(player.player_id);
        const rolesArray = fullPlayer.roles ? fullPlayer.roles.split(',') : ['PLAYER'];
        const token = generateToken(player.player_id, player.email, rolesArray);

        const walletResult = await query(
            'SELECT wallet_id, balance FROM WALLET WHERE player_id = ?',
            [player.player_id]
        );

        res.json({
            success: true,
            message: 'Login successful!',
            data: {
                player: {
                    playerId: player.player_id,
                    name: fullPlayer.name,
                    email: fullPlayer.email,
                    status: fullPlayer.status,
                    roles: rolesArray,
                    role: fullPlayer.is_admin ? 'ADMIN' : fullPlayer.is_dealer ? 'DEALER' : 'PLAYER'
                },
                wallet: walletResult.rows[0],
                token
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed. Please try again.', error: error.message });
    }
};

// =====================================================
// Get current user profile
// =====================================================
const getProfile = async (req, res) => {
    try {
        const player = await getPlayerWithRoles(req.user.playerId);

        if (!player) {
            return res.status(404).json({ success: false, message: 'Profile not found.' });
        }

        const walletResult = await query(
            'SELECT wallet_id, balance, last_updated FROM WALLET WHERE player_id = ?',
            [req.user.playerId]
        );

        const rolesArray = player.roles ? player.roles.split(',') : ['PLAYER'];

        res.json({
            success: true,
            data: {
                playerId: player.player_id,
                name: player.name,
                email: player.email,
                phone: player.phone,
                registrationDate: player.registration_date,
                dateOfBirth: player.date_of_birth,
                address: player.address,
                status: player.status,
                roles: rolesArray,
                role: player.is_admin ? 'ADMIN' : player.is_dealer ? 'DEALER' : 'PLAYER',
                wallet: walletResult.rows[0] || null
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch profile.', error: error.message });
    }
};

// =====================================================
// Logout (client-side token invalidation)
// =====================================================
const logout = async (req, res) => {
    res.json({
        success: true,
        message: 'Logout successful. Please remove the token from client storage.'
    });
};

// =====================================================
// Admin: Get all players with roles
// =====================================================
const getAllPlayers = async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const offset = (page - 1) * limit;

        let queryText = `
            SELECT p.player_id, p.name, p.email, p.phone, p.registration_date, p.status,
                   w.balance,
                   GROUP_CONCAT(r.role_name ORDER BY r.role_id SEPARATOR ',') AS roles
            FROM PLAYER p
            LEFT JOIN WALLET w ON p.player_id = w.player_id
            LEFT JOIN USER_ROLE ur ON p.player_id = ur.player_id AND ur.is_active = 1
            LEFT JOIN ROLE r ON ur.role_id = r.role_id
        `;
        const params = [];

        if (status) {
            queryText += ' WHERE p.status = ?';
            params.push(status);
        }

        queryText += ` GROUP BY p.player_id, p.name, p.email, p.phone, p.registration_date, p.status, w.balance
                       ORDER BY p.player_id DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        const result = await query(queryText, params);

        const countResult = await query(
            status ? 'SELECT COUNT(*) as count FROM PLAYER WHERE status = ?' : 'SELECT COUNT(*) as count FROM PLAYER',
            status ? [status] : []
        );

        res.json({
            success: true,
            data: {
                players: result.rows.map(p => ({
                    ...p,
                    roles: p.roles ? p.roles.split(',') : ['PLAYER']
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: parseInt(countResult.rows[0].count),
                    pages: Math.ceil(countResult.rows[0].count / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get all players error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch players.', error: error.message });
    }
};

// =====================================================
// Admin: Update player status
// =====================================================
const updatePlayerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'BANNED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status value.' });
        }

        await query('UPDATE PLAYER SET status = ? WHERE player_id = ?', [status, id]);

        res.json({ success: true, message: `Player status updated to ${status}.` });
    } catch (error) {
        console.error('Update player status error:', error);
        res.status(500).json({ success: false, message: 'Failed to update player status.', error: error.message });
    }
};

// =====================================================
// Admin: Assign role to player
// =====================================================
const assignRole = async (req, res) => {
    try {
        const { playerId, roleName } = req.body;
        const adminId = req.user.playerId;

        // Call stored procedure
        const { callProcedure } = require('../config/database');
        const result = await callProcedure('assign_role', [playerId, roleName, adminId]);

        res.json({ success: true, message: result.rows[0].message });
    } catch (error) {
        console.error('Assign role error:', error);
        res.status(500).json({ success: false, message: 'Failed to assign role.', error: error.message });
    }
};

module.exports = {
    register,
    login,
    getProfile,
    logout,
    getAllPlayers,
    updatePlayerStatus,
    assignRole
};
