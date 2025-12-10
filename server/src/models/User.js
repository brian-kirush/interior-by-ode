const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    static async findByEmail(email) {
        const result = await query(
            'SELECT id, name, email, password_hash, role FROM users WHERE email = $1',
            [email]
        );
        return result.rows[0];
    }

    static async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    static async create(data) {
        const { name, email, password, role } = data;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await query(
            `INSERT INTO users (name, email, password_hash, role) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id, name, email, role`,
            [name, email, hashedPassword, role || 'user']
        );
        return result.rows[0];
    }
}

module.exports = User;
