const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/database');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verify user still exists in database
        const userQuery = `
            SELECT user_id, user_type, email, first_name, last_name 
            FROM (
                SELECT patient_id as user_id, 'patient' as user_type, email, first_name, last_name 
                FROM Patient WHERE patient_id = ?
                UNION ALL
                SELECT doctor_id as user_id, 'doctor' as user_type, email, first_name, last_name 
                FROM Doctor WHERE doctor_id = ?
            ) as users
            WHERE user_id = ?
        `;
        
        const result = await executeQuery(userQuery, [decoded.userId, decoded.userId, decoded.userId]);
        
        if (!result.success || result.data.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token - user not found'
            });
        }

        req.user = {
            userId: decoded.userId,
            userType: decoded.userType,
            email: decoded.email,
            ...result.data[0]
        };
        
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(403).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

// Check if user is a patient
const requirePatient = (req, res, next) => {
    if (req.user.userType !== 'patient') {
        return res.status(403).json({
            success: false,
            message: 'Patient access required'
        });
    }
    next();
};

// Check if user is a doctor
const requireDoctor = (req, res, next) => {
    if (req.user.userType !== 'doctor') {
        return res.status(403).json({
            success: false,
            message: 'Doctor access required'
        });
    }
    next();
};

// Check if user is admin (for future admin features)
const requireAdmin = (req, res, next) => {
    if (req.user.userType !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    next();
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const userQuery = `
            SELECT user_id, user_type, email, first_name, last_name 
            FROM (
                SELECT patient_id as user_id, 'patient' as user_type, email, first_name, last_name 
                FROM Patient WHERE patient_id = ?
                UNION ALL
                SELECT doctor_id as user_id, 'doctor' as user_type, email, first_name, last_name 
                FROM Doctor WHERE doctor_id = ?
            ) as users
            WHERE user_id = ?
        `;
        
        const result = await executeQuery(userQuery, [decoded.userId, decoded.userId, decoded.userId]);
        
        if (result.success && result.data.length > 0) {
            req.user = {
                userId: decoded.userId,
                userType: decoded.userType,
                email: decoded.email,
                ...result.data[0]
            };
        } else {
            req.user = null;
        }
    } catch (error) {
        req.user = null;
    }
    
    next();
};

module.exports = {
    authenticateToken,
    requirePatient,
    requireDoctor,
    requireAdmin,
    optionalAuth
};
