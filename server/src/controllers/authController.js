const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

class AuthController {
    static login = catchAsync(async (req, res, next) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return next(new AppError('Email and password are required', 400));
        }

        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = userResult.rows[0];
        
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return next(new AppError('Invalid credentials', 401));
        }

        // Set session
        req.session.userId = user.id;
        req.session.userName = user.name;
        req.session.userEmail = user.email;
        req.session.userRole = user.role;
        req.session.loggedIn = true;

        // Remove password hash from response
        delete user.password_hash;

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user,
                session: req.sessionID
            }
        });
    });

    static logout = catchAsync(async (req, res, next) => {
        req.session.destroy((err) => {
            if (err) {
                return next(new AppError('Logout failed', 500));
            }
            res.clearCookie('connect.sid');
            res.json({
                success: true,
                message: 'Logout successful'
            });
        });
    });

    static checkSession = catchAsync(async (req, res, next) => {
        if (req.session.loggedIn) {
            res.json({
                success: true,
                message: 'Session is active',
                data: {
                    id: req.session.userId,
                    name: req.session.userName,
                    email: req.session.userEmail,
                    role: req.session.userRole
                }
            });
        } else {
            return next(new AppError('No active session', 401));
        }
    });
}

module.exports = AuthController;
