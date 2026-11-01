const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// =====================================================
// Token Generation
// =====================================================
const generateToken = (playerId, email, roles) => {
    return jwt.sign(
        { playerId, email, roles },
        process.env.JWT_SECRET || 'default_secret_key',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// =====================================================
// JWT Authentication Middleware
// =====================================================
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. Please provide a valid token.'
            });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key');

        // Fetch player with their roles from the database
        const result = await query(
            `SELECT p.player_id, p.name, p.email, p.status,
                    GROUP_CONCAT(r.role_name ORDER BY r.role_id SEPARATOR ',') AS roles,
                    MAX(CASE WHEN r.role_name = 'ADMIN' THEN 1 ELSE 0 END) AS is_admin,
                    MAX(CASE WHEN r.role_name = 'DEALER' THEN 1 ELSE 0 END) AS is_dealer
             FROM PLAYER p
             LEFT JOIN USER_ROLE ur ON p.player_id = ur.player_id AND ur.is_active = 1
             LEFT JOIN ROLE r ON ur.role_id = r.role_id
             WHERE p.player_id = ?
             GROUP BY p.player_id, p.name, p.email, p.status`,
            [decoded.playerId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'User not found.' });
        }

        const player = result.rows[0];

        if (player.status !== 'ACTIVE') {
            return res.status(403).json({
                success: false,
                message: `Account is ${player.status}. Please contact support.`
            });
        }

        const rolesArray = player.roles ? player.roles.split(',') : ['PLAYER'];

        req.user = {
            playerId: player.player_id,
            name: player.name,
            email: player.email,
            status: player.status,
            roles: rolesArray,
            isAdmin: Boolean(player.is_admin),
            isDealer: Boolean(player.is_dealer),
            // Convenience: highest role
            role: player.is_admin ? 'ADMIN' : player.is_dealer ? 'DEALER' : 'PLAYER'
        };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, message: 'Invalid token.' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expired. Please login again.' });
        }
        console.error('Authentication error:', error);
        res.status(500).json({ success: false, message: 'Authentication failed.' });
    }
};

// =====================================================
// Role-Based Authorization Middleware
// =====================================================
// Usage: authorize('ADMIN') or authorize('DEALER', 'ADMIN')
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }

        const userRoles = req.user.roles || ['PLAYER'];
        const hasRole = allowedRoles.some(role => userRoles.includes(role));

        if (!hasRole) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`
            });
        }

        next();
    };
};

// =====================================================
// Permission-Based Authorization Middleware
// =====================================================
// Usage: hasPermission('game:create')
const hasPermission = (permissionName) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }

        try {
            const result = await query(
                `SELECT COUNT(*) AS has_perm
                 FROM USER_ROLE ur
                 JOIN ROLE_PERMISSION rp ON ur.role_id = rp.role_id
                 JOIN PERMISSION perm ON rp.permission_id = perm.permission_id
                 WHERE ur.player_id = ?
                   AND ur.is_active = 1
                   AND perm.permission_name = ?`,
                [req.user.playerId, permissionName]
            );

            if (!result.rows[0] || result.rows[0].has_perm === 0) {
                return res.status(403).json({
                    success: false,
                    message: `Permission denied: ${permissionName}`
                });
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ success: false, message: 'Authorization check failed.' });
        }
    };
};

module.exports = {
    generateToken,
    authenticate,
    authorize,
    hasPermission
};
