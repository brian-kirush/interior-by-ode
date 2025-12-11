const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function setupDatabase() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        console.log('🔧 Setting up database...');

        // Create tables
        const tables = [
            // Users table
            `CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role VARCHAR(50) DEFAULT 'admin',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // Clients table
            `CREATE TABLE IF NOT EXISTS clients (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                company VARCHAR(100),
                email VARCHAR(100) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                address TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // Projects table
            `CREATE TABLE IF NOT EXISTS projects (
                id SERIAL PRIMARY KEY,
                client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
                name VARCHAR(200) NOT NULL,
                description TEXT,
                status VARCHAR(50) DEFAULT 'planning',
                progress INTEGER DEFAULT 0,
                budget DECIMAL(12,2) DEFAULT 0.00,
                start_date DATE,
                end_date DATE,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // Project milestones table
            `CREATE TABLE IF NOT EXISTS project_milestones (
                id SERIAL PRIMARY KEY,
                project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                phase VARCHAR(100) NOT NULL,
                activity VARCHAR(200) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                completed_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // Tasks table
            `CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                title VARCHAR(200) NOT NULL,
                description TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                priority VARCHAR(50) DEFAULT 'medium',
                assigned_to VARCHAR(100),
                due_date DATE,
                completed_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // Quotations table
            `CREATE TABLE IF NOT EXISTS quotations (
                id SERIAL PRIMARY KEY,
                quotation_number VARCHAR(50) UNIQUE NOT NULL,
                client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
                project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
                subtotal DECIMAL(12,2) DEFAULT 0.00,
                tax_rate DECIMAL(5,2) DEFAULT 16.00,
                tax_amount DECIMAL(12,2) DEFAULT 0.00,
                discount_amount DECIMAL(12,2) DEFAULT 0.00,
                total DECIMAL(12,2) DEFAULT 0.00,
                status VARCHAR(50) DEFAULT 'draft',
                valid_until DATE,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // Quotation items table
            `CREATE TABLE IF NOT EXISTS quotation_items (
                id SERIAL PRIMARY KEY,
                quotation_id INTEGER REFERENCES quotations(id) ON DELETE CASCADE,
                description TEXT NOT NULL,
                unit VARCHAR(50),
                quantity DECIMAL(10,2) DEFAULT 1.00,
                unit_price DECIMAL(12,2) DEFAULT 0.00,
                total DECIMAL(12,2) DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // Invoices table
            `CREATE TABLE IF NOT EXISTS invoices (
                id SERIAL PRIMARY KEY,
                invoice_number VARCHAR(50) UNIQUE NOT NULL,
                client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
                quotation_id INTEGER REFERENCES quotations(id) ON DELETE SET NULL,
                project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
                subtotal DECIMAL(12,2) DEFAULT 0.00,
                tax_rate DECIMAL(5,2) DEFAULT 16.00,
                tax_amount DECIMAL(12,2) DEFAULT 0.00,
                discount_amount DECIMAL(12,2) DEFAULT 0.00,
                total DECIMAL(12,2) DEFAULT 0.00,
                status VARCHAR(50) DEFAULT 'draft',
                issue_date DATE DEFAULT CURRENT_DATE,
                due_date DATE,
                paid_date DATE NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // Invoice items table
            `CREATE TABLE IF NOT EXISTS invoice_items (
                id SERIAL PRIMARY KEY,
                invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
                description TEXT NOT NULL,
                unit VARCHAR(50),
                quantity DECIMAL(10,2) DEFAULT 1.00,
                unit_price DECIMAL(12,2) DEFAULT 0.00,
                total DECIMAL(12,2) DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // Team notes table
            `CREATE TABLE IF NOT EXISTS team_notes (
                id SERIAL PRIMARY KEY,
                note_text TEXT NOT NULL,
                author VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // Settings table
            `CREATE TABLE IF NOT EXISTS settings (
                id SERIAL PRIMARY KEY,
                setting_key VARCHAR(100) UNIQUE NOT NULL,
                setting_value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // Session table for express-session with PostgreSQL store
            `CREATE TABLE IF NOT EXISTS "session" (
                "sid" varchar NOT NULL COLLATE "default",
                "sess" json NOT NULL,
                "expire" timestamp(6) NOT NULL,
                PRIMARY KEY ("sid")
            )`
        ];

        for (const tableSql of tables) {
            await pool.query(tableSql);
        }
        console.log('✅ Tables checked/created');

        // Create updated_at trigger function
        await pool.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql'
        `);

        // Apply trigger to tables with updated_at column
        const tablesWithUpdatedAt = ['users', 'clients', 'projects', 'settings'];
        for (const tableName of tablesWithUpdatedAt) {
            await pool.query(`
                DROP TRIGGER IF EXISTS update_${tableName}_updated_at ON ${tableName};
                CREATE TRIGGER update_${tableName}_updated_at
                BEFORE UPDATE ON ${tableName}
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column()
            `);
        }
        console.log('✅ Trigger function for updated_at created/updated');

        // Insert default settings
        const defaultSettings = [
            ['company_name', 'Interiors by Ode'],
            ['company_address', 'Nairobi, Kenya'],
            ['company_phone', '+254 700 000 000'],
            ['company_email', 'info@interiorsbyode.com'],
            ['default_tax_rate', '16'],
            ['bank_name', 'Equity Bank Kenya'],
            ['account_name', 'Interiors by Ode'],
            ['account_number', '1234567890'],
            ['mpesa_paybill', '123456'],
            ['mpesa_account_ref', 'Use invoice number']
        ];

        for (const [key, value] of defaultSettings) {
            await pool.query(
                `INSERT INTO settings (setting_key, setting_value) 
                 VALUES ($1, $2) 
                 ON CONFLICT (setting_key) DO NOTHING`,
                [key, value]
            );
        }
        console.log('✅ Default settings inserted');

        // Insert default admin user
        const existingUser = await pool.query(
            "SELECT COUNT(*) FROM users WHERE email = 'admin@interiorsbyode.com'"
        );

        if (parseInt(existingUser.rows[0].count) === 0) {
            const hashedPassword = await bcrypt.hash('ode', 10);
            await pool.query(
                `INSERT INTO users (name, email, password_hash, role) 
                 VALUES ($1, $2, $3, $4)`,
                ['Administrator', 'admin@interiorsbyode.com', hashedPassword, 'admin']
            );
            console.log('✅ Default admin user created');
            console.log('   Email: admin@interiorsbyode.com');
            console.log('   Password: ode');
        }

        console.log('🎉 Database setup completed successfully!');
        return { success: true };
    } catch (error) {
        console.error('❌ Database setup error:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

module.exports = { setupDatabase };
