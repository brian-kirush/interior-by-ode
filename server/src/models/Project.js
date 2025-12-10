const { query } = require('../config/database');

class Project {
    static async findAll() {
        const result = await query(`
            SELECT p.*, c.name as client_name, c.company as client_company,
                   (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count
            FROM projects p
            LEFT JOIN clients c ON p.client_id = c.id
            ORDER BY p.created_at DESC
        `);
        return result.rows;
    }

    static async findById(id) {
        const result = await query(`
            SELECT p.*, c.name as client_name, c.email as client_email, 
                   c.phone as client_phone, c.address as client_address,
                   c.company as client_company
            FROM projects p
            LEFT JOIN clients c ON p.client_id = c.id
            WHERE p.id = $1
        `, [id]);
        return result.rows[0];
    }

    static async create(data) {
        const { client_id, name, description, budget, status } = data;
        const result = await query(
            `INSERT INTO projects (client_id, name, description, budget, status) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING *`,
            [client_id, name, description || '', budget || 0, status || 'planning']
        );
        return result.rows[0];
    }

    static async update(id, data) {
        const updates = [];
        const values = [];
        let paramCount = 1;

        Object.keys(data).forEach(key => {
            if (data[key] !== undefined) {
                updates.push(`${key} = $${paramCount}`);
                values.push(data[key]);
                paramCount++;
            }
        });

        if (updates.length === 0) {
            throw new Error('No data to update');
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        const queryStr = `
            UPDATE projects 
            SET ${updates.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await query(queryStr, values);
        return result.rows[0];
    }

    static async delete(id) {
        const result = await query(
            'DELETE FROM projects WHERE id = $1 RETURNING id',
            [id]
        );
        return result.rows[0];
    }

    static async getTasks(projectId) {
        const result = await query(
            'SELECT * FROM tasks WHERE project_id = $1 ORDER BY due_date ASC',
            [projectId]
        );
        return result.rows;
    }

    static async getMilestones(projectId) {
        const result = await query(
            'SELECT * FROM project_milestones WHERE project_id = $1 ORDER BY created_at ASC',
            [projectId]
        );
        return result.rows;
    }
}

module.exports = Project;
