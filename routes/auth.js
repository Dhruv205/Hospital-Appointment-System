const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const registerValidation = [
    body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
    body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').isMobilePhone().withMessage('Valid phone number required'),
    body('userType').isIn(['patient', 'doctor']).withMessage('User type must be patient or doctor')
];

const loginValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
    body('userType').isIn(['patient', 'doctor']).withMessage('User type must be patient or doctor')
];

// Register new user
router.post('/register', registerValidation, async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { firstName, lastName, email, password, phone, userType, dateOfBirth, gender, address, licenseNumber, experienceYears, consultationFee } = req.body;

        // Check if user already exists
        const checkUserQuery = `
            SELECT email FROM (
                SELECT email FROM Patient WHERE email = ?
                UNION ALL
                SELECT email FROM Doctor WHERE email = ?
            ) as users
        `;
        
        const existingUser = await executeQuery(checkUserQuery, [email, email]);
        if (existingUser.success && existingUser.data.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        let userId;
        let insertQuery;
        let insertParams;

        if (userType === 'patient') {
            // Insert patient
            insertQuery = `
                INSERT INTO Patient (first_name, last_name, email, phone, password_hash, date_of_birth, gender, address)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            insertParams = [firstName, lastName, email, phone, passwordHash, dateOfBirth, gender, address];
        } else {
            // Insert doctor
            insertQuery = `
                INSERT INTO Doctor (first_name, last_name, email, phone, password_hash, license_number, experience_years, consultation_fee)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            insertParams = [firstName, lastName, email, phone, passwordHash, licenseNumber, experienceYears, consultationFee];
        }

        const result = await executeQuery(insertQuery, insertParams);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to create user account',
                error: result.error
            });
        }

        userId = result.data.insertId;

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: userId, 
                userType: userType, 
                email: email 
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                userId: userId,
                userType: userType,
                email: email,
                firstName: firstName,
                lastName: lastName,
                token: token
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during registration'
        });
    }
});

// Login user
router.post('/login', loginValidation, async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { email, password, userType } = req.body;

        // Find user in appropriate table
        let userQuery;
        if (userType === 'patient') {
            userQuery = 'SELECT patient_id as id, first_name, last_name, email, password_hash FROM Patient WHERE email = ?';
        } else {
            userQuery = 'SELECT doctor_id as id, first_name, last_name, email, password_hash FROM Doctor WHERE email = ?';
        }

        const result = await executeQuery(userQuery, [email]);
        
        if (!result.success || result.data.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = result.data[0];

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                userType: userType, 
                email: user.email 
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                userId: user.id,
                userType: userType,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                token: token
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during login'
        });
    }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const { userId, userType } = req.user;

        let profileQuery;
        if (userType === 'patient') {
            profileQuery = `
                SELECT patient_id as id, first_name, last_name, email, phone, 
                       date_of_birth, gender, address, created_at
                FROM Patient WHERE patient_id = ?
            `;
        } else {
            profileQuery = `
                SELECT doctor_id as id, first_name, last_name, email, phone,
                       license_number, experience_years, consultation_fee, created_at
                FROM Doctor WHERE doctor_id = ?
            `;
        }

        const result = await executeQuery(profileQuery, [userId]);
        
        if (!result.success || result.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User profile not found'
            });
        }

        // Include userType so frontend can render correct dashboard/routes
        const profile = { ...result.data[0], userType };

        res.json({
            success: true,
            data: profile
        });

    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching profile'
        });
    }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { userId, userType } = req.user;
        const updateData = req.body;

        // Remove sensitive fields that shouldn't be updated via this endpoint
        delete updateData.password_hash;
        delete updateData.id;
        delete updateData.created_at;

        let updateQuery;
        let updateParams = [];
        let setClause = [];

        if (userType === 'patient') {
            const allowedFields = ['first_name', 'last_name', 'phone', 'date_of_birth', 'gender', 'address'];
            for (const [key, value] of Object.entries(updateData)) {
                if (allowedFields.includes(key) && value !== undefined) {
                    setClause.push(`${key} = ?`);
                    updateParams.push(value);
                }
            }
            updateQuery = `UPDATE Patient SET ${setClause.join(', ')} WHERE patient_id = ?`;
            updateParams.push(userId);
        } else {
            const allowedFields = ['first_name', 'last_name', 'phone', 'license_number', 'experience_years', 'consultation_fee'];
            for (const [key, value] of Object.entries(updateData)) {
                if (allowedFields.includes(key) && value !== undefined) {
                    setClause.push(`${key} = ?`);
                    updateParams.push(value);
                }
            }
            updateQuery = `UPDATE Doctor SET ${setClause.join(', ')} WHERE doctor_id = ?`;
            updateParams.push(userId);
        }

        if (setClause.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        const result = await executeQuery(updateQuery, updateParams);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update profile',
                error: result.error
            });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while updating profile'
        });
    }
});

// Change password
router.put('/change-password', authenticateToken, [
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { userId, userType } = req.user;
        const { currentPassword, newPassword } = req.body;

        // Get current password hash
        let passwordQuery;
        if (userType === 'patient') {
            passwordQuery = 'SELECT password_hash FROM Patient WHERE patient_id = ?';
        } else {
            passwordQuery = 'SELECT password_hash FROM Doctor WHERE doctor_id = ?';
        }

        const result = await executeQuery(passwordQuery, [userId]);
        
        if (!result.success || result.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, result.data[0].password_hash);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const saltRounds = 12;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        let updateQuery;
        if (userType === 'patient') {
            updateQuery = 'UPDATE Patient SET password_hash = ? WHERE patient_id = ?';
        } else {
            updateQuery = 'UPDATE Doctor SET password_hash = ? WHERE doctor_id = ?';
        }

        const updateResult = await executeQuery(updateQuery, [newPasswordHash, userId]);
        
        if (!updateResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update password'
            });
        }

        res.json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while changing password'
        });
    }
});

// Logout (client-side token removal)
router.post('/logout', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = router;
