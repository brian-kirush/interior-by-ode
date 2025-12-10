const { query } = require('../config/database');

class ProjectController {
    async getAllProjects(req, res) {
        try {
            const result = await query(`
                SELECT p.*, c.name as client_name, c.company as client_company,
                       (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count
                FROM projects p
                LEFT JOIN clients c ON p.client_id = c.id
                ORDER BY p.created_at DESC
            `);
            
            res.json({
                success: true,
                message: 'Projects retrieved successfully',
                data: result.rows
            });
        } catch (error) {
            console.error('Get projects error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve projects'
            });
        }
    }

    async getProjectById(req, res) {
        try {
            const { id } = req.params;
            
            const projectResult = await query(`
                SELECT p.*, c.name as client_name, c.email as client_email, 
                       c.phone as client_phone, c.address as client_address,
                       c.company as client_company
                FROM projects p
                LEFT JOIN clients c ON p.client_id = c.id
                WHERE p.id = $1
            `, [id]);

            if (projectResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Project not found'
                });
            }

            const project = projectResult.rows[0];

            const tasksResult = await query(
                'SELECT * FROM tasks WHERE project_id = $1 ORDER BY due_date ASC',
                [id]
            );

            const milestonesResult = await query(
                'SELECT * FROM project_milestones WHERE project_id = $1 ORDER BY created_at ASC',
                [id]
            );

            project.tasks = tasksResult.rows;
            project.milestones = milestonesResult.rows;

            res.json({
                success: true,
                message: 'Project retrieved successfully',
                data: project
            });
        } catch (error) {
            console.error('Get project error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve project'
            });
        }
    }

    async createProject(req, res) {
        try {
            const { client_id, name, description, budget, status } = req.body;

            if (!client_id || !name) {
                return res.status(400).json({
                    success: false,
                    message: 'Client ID and project name are required'
                });
            }

            const result = await query(
                `INSERT INTO projects (client_id, name, description, budget, status) 
                 VALUES ($1, $2, $3, $4, $5) 
                 RETURNING id, name, description, budget, status, client_id, created_at`,
                [client_id, name, description || '', budget || 0, status || 'planning']
            );

            const project = result.rows[0];

            const milestones = [
                ['Discovery & Planning', 'Initial client consultation and brief'],
                ['Discovery & Planning', 'Site visit, measurements, and photos'],
                ['Discovery & Planning', 'Budget discussion and finalization'],
                ['Discovery & Planning', 'Contract sign-off'],
                ['Concept & Design', 'Mood board and color palette creation'],
                ['Concept & Design', 'Space planning and 2D layouts'],
                ['Concept & Design', '3D visualizations (if applicable)'],
                ['Concept & Design', 'Client presentation and approval'],
                ['Execution & Management', 'Material and furniture procurement'],
                ['Execution & Management', 'Coordination with contractors and vendors'],
                ['Execution & Management', 'Site supervision and quality checks'],
                ['Execution & Management', 'Installation and final styling'],
                ['Execution & Management', 'Project handover and final invoicing']
            ];

            for (const [phase, activity] of milestones) {
                await query(
                    'INSERT INTO project_milestones (project_id, phase, activity) VALUES ($1, $2, $3)',
                    [project.id, phase, activity]
                );
            }

            res.status(201).json({
                success: true,
                message: 'Project created successfully',
                data: project
            });
        } catch (error) {
            console.error('Create project error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create project'
            });
        }
    }

    async updateProject(req, res) {
        try {
            const { id } = req.params;
            const { name, description, status, budget, progress, notes } = req.body;

            const updates = [];
            const values = [];
            let paramCount = 1;

            if (name !== undefined) {
                updates.push(`name = $${paramCount++}`);
                values.push(name);
            }
            if (description !== undefined) {
                updates.push(`description = $${paramCount++}`);
                values.push(description);
            }
            if (status !== undefined) {
                updates.push(`status = $${paramCount++}`);
                values.push(status);
            }
            if (budget !== undefined) {
                updates.push(`budget = $${paramCount++}`);
                values.push(budget);
            }
            if (progress !== undefined) {
                updates.push(`progress = $${paramCount++}`);
                values.push(progress);
            }
            if (notes !== undefined) {
                updates.push(`notes = $${paramCount++}`);
                values.push(notes);
            }

            if (updates.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No data provided for update'
                });
            }

            updates.push(`updated_at = CURRENT_TIMESTAMP`);
            values.push(id);

            const queryStr = `
                UPDATE projects 
                SET ${updates.join(', ')}
                WHERE id = $${paramCount}
                RETURNING id, name, description, status, budget, progress, notes, updated_at
            `;

            const result = await query(queryStr, values);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Project not found'
                });
            }

            res.json({
                success: true,
                message: 'Project updated successfully',
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Update project error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update project'
            });
        }
    }

    async deleteProject(req, res) {
        try {
            const { id } = req.params;

            const result = await query(
                'DELETE FROM projects WHERE id = $1 RETURNING id',
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Project not found'
                });
            }

            res.json({
                success: true,
                message: 'Project deleted successfully'
            });
        } catch (error) {
            console.error('Delete project error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete project'
            });
        }
    }
}

module.exports = new ProjectController();
