const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class AuthController {
    static async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and password are required'
                });
            }

            const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            const user = userResult.rows[0];
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
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

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error during login'
            });
        }
    }

    static logout(req, res) {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Logout failed'
                });
            }
            res.clearCookie('connect.sid');
            res.json({
                success: true,
                message: 'Logout successful'
            });
        });
    }

    static checkSession(req, res) {
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
            res.status(401).json({
                success: false,
                message: 'No active session'
            });
        }
    }
}

module.exports = AuthController;
