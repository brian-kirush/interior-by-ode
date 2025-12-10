const { query } = require('../config/database');

class Client {
    static async findAll() {
        const result = await query(`
            SELECT c.*, COUNT(p.id) as project_count
            FROM clients c
            LEFT JOIN projects p ON c.id = p.client_id
            GROUP BY c.id
            ORDER BY c.name ASC
        `);
        return result.rows;
    }

    static async findById(id) {
        const result = await query(
            'SELECT * FROM clients WHERE id = $1',
            [id]
        );
        return result.rows[0];
    }

    static async findByEmail(email) {
        const result = await query(
            'SELECT * FROM clients WHERE email = $1',
            [email]
        );
        return result.rows[0];
    }

    static async create(data) {
        const { name, company, email, phone, address } = data;
        const result = await query(
            `INSERT INTO clients (name, company, email, phone, address) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING *`,
            [name, company || '', email, phone, address]
        );
        return result.rows[0];
    }

    static async update(id, data) {
        const { name, company, email, phone, address } = data;
        const result = await query(
            `UPDATE clients 
             SET name = $1, company = $2, email = $3, phone = $4, address = $5, 
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $6 
             RETURNING *`,
            [name, company || '', email, phone, address, id]
        );
        return result.rows[0];
    }

    static async delete(id) {
        const result = await query(
            'DELETE FROM clients WHERE id = $1 RETURNING id',
            [id]
        );
        return result.rows[0];
    }

    static async hasProjects(id) {
        const result = await query(
            'SELECT COUNT(*) FROM projects WHERE client_id = $1',
            [id]
        );
        return parseInt(result.rows[0].count) > 0;
    }
}

module.exports = Client;
