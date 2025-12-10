const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`❌ ${envVar} environment variable is required`);
        process.exit(1);
    }
}

// CORS configuration
const corsOptions = {
    credentials: true
};

if (process.env.NODE_ENV === 'production') {
    corsOptions.origin = process.env.FRONTEND_URL || ['https://interior-by-ode.onrender.com', 'http://localhost:3000'];
} else {
    corsOptions.origin = ['http://localhost:8000', 'http://localhost:5500', 'http://localhost:3000', 'http://localhost:5173'];
}

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust the first proxy in front of the app (e.g., Render's reverse proxy)
// This is crucial for secure cookies to work correctly.
app.set('trust proxy', 1);

// Import database connection pool for session store
const pool = require('./config/database');
const pgSession = require('connect-pg-simple')(session);

// Session configuration
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'user_sessions', // Use a custom table name
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'interior-by-ode-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS in production
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Database initialization function
async function initializeDatabase() {
    try {
        console.log('🔧 Initializing database tables...');
        
        // Universal trigger function for updated_at
        const triggerFunctionSql = `
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `;
        await pool.query(triggerFunctionSql);

        // Custom ENUM types for consistency
        const enums = [
            `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed'); END IF; END $$;`,
            `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high'); END IF; END $$;`,
            `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN CREATE TYPE project_status AS ENUM ('planning', 'in_progress', 'completed', 'on_hold', 'cancelled', 'submitted'); END IF; END $$;`,
            `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_status') THEN CREATE TYPE document_status AS ENUM ('draft', 'sent', 'approved', 'rejected', 'paid', 'overdue', 'cancelled'); END IF; END $$;`
        ];

        for (const enumSql of enums) {
            await pool.query(enumSql);
        }
        console.log('✅ Custom types ensured.');

        const tables = [
            `CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name VARCHAR(100),
                role VARCHAR(50) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS clients (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                phone VARCHAR(20),
                company VARCHAR(100),
                address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS projects (
                id SERIAL PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                description TEXT,
                client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
                budget DECIMAL(12, 2),
                status project_status DEFAULT 'planning',
                progress INTEGER DEFAULT 0,
                notes TEXT,
                start_date TIMESTAMPTZ,
                deadline TIMESTAMPTZ,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS project_milestones (
                id SERIAL PRIMARY KEY,
                project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                phase VARCHAR(100) NOT NULL,
                activity TEXT NOT NULL,
                is_completed BOOLEAN DEFAULT false
            )`,

            `CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                status task_status DEFAULT 'pending',
                assigned_to VARCHAR(100),
                priority task_priority DEFAULT 'medium',
                due_date TIMESTAMPTZ,
                completed_at TIMESTAMPTZ,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
                project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
                rating INTEGER CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS quotations (
                id SERIAL PRIMARY KEY,
                quotation_number VARCHAR(50) UNIQUE NOT NULL,
                client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
                subtotal DECIMAL(12, 2) NOT NULL,
                tax_rate DECIMAL(5, 2) DEFAULT 16.00,
                tax_amount DECIMAL(12, 2) DEFAULT 0,
                discount_amount DECIMAL(12, 2) DEFAULT 0,
                total DECIMAL(12, 2) NOT NULL,
                status document_status DEFAULT 'draft',
                notes TEXT,
                valid_until DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            `CREATE TABLE IF NOT EXISTS quotation_items (
                id SERIAL PRIMARY KEY,
                quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
                description TEXT NOT NULL,
                unit VARCHAR(50),
                quantity DECIMAL(10, 2) NOT NULL,
                unit_price DECIMAL(12, 2) NOT NULL,
                total DECIMAL(12, 2) NOT NULL
            )`,
            
            `CREATE TABLE IF NOT EXISTS invoices (
                id SERIAL PRIMARY KEY,
                invoice_number VARCHAR(50) UNIQUE NOT NULL,
                client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
                quotation_id INTEGER REFERENCES quotations(id) ON DELETE SET NULL,
                subtotal DECIMAL(12, 2) NOT NULL,
                tax_amount DECIMAL(12, 2) DEFAULT 0,
                discount_amount DECIMAL(12, 2) DEFAULT 0,
                total DECIMAL(12, 2) NOT NULL,
                status document_status DEFAULT 'draft',
                issue_date DATE NOT NULL,
                due_date DATE,
                paid_at TIMESTAMPTZ,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            `CREATE TABLE IF NOT EXISTS invoice_items (
                id SERIAL PRIMARY KEY,
                invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
                description TEXT NOT NULL,
                quantity DECIMAL(10, 2) NOT NULL,
                unit_price DECIMAL(12, 2) NOT NULL,
                total DECIMAL(12, 2) NOT NULL
            )`,

            `CREATE TABLE IF NOT EXISTS settings (
                id SERIAL PRIMARY KEY,
                setting_key VARCHAR(100) UNIQUE NOT NULL,
                setting_value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        for (const tableSql of tables) {
            try {
                await pool.query(tableSql);
            } catch (error) {
                console.error(`❌ Error creating table:`, error.message);
            }
        }

        // Apply the trigger to all relevant tables
        const tablesWithTrigger = ['clients', 'projects', 'tasks', 'settings'];
        for (const tableName of tablesWithTrigger) {
            await pool.query(`
                DROP TRIGGER IF EXISTS update_${tableName}_updated_at ON ${tableName};
                CREATE TRIGGER update_${tableName}_updated_at BEFORE UPDATE ON ${tableName} FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            `);
        }

        console.log('✅ Database tables initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Error initializing database:', error);
        return false;
    }
}

// Import routes
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const projectRoutes = require('./routes/projects');
const quotationRoutes = require('./routes/quotations');
const invoiceRoutes = require('./routes/invoices');
const dashboardRoutes = require('./routes/dashboard');
const settingsRoutes = require('./routes/settings');
const taskRoutes = require('./routes/tasks');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/tasks', taskRoutes);

// Basic route for testing
app.get('/api', (req, res) => {
    res.json({ 
        message: 'Interior by Ode API', 
        version: '1.0.0',
        status: 'running',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Health check with database connection test
app.get('/health', async (req, res) => {
    const healthData = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Interior by Ode API',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memory: process.memoryUsage()
    };

    try {
        if (pool) {
            // Test database connection
            await pool.query('SELECT 1');
            healthData.database = 'connected';
        } else {
            healthData.database = 'config_not_loaded';
        }
        
        res.status(200).json(healthData);
    } catch (error) {
        console.error('Health check database error:', error.message);
        healthData.status = 'partial';
        healthData.database = 'disconnected';
        healthData.error = error.message;
        res.status(503).json(healthData);
    }
});

// Database status endpoint
app.get('/api/db-status', async (req, res) => {
    try {
        const tables = ['users', 'clients', 'projects', 'tasks', 'reviews', 'quotations', 'invoices'];
        const status = {};
        
        for (const table of tables) {
            try {
                const result = await pool.query(
                    `SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = $1
                    )`,
                    [table]
                );
                status[table] = result.rows[0].exists;
            } catch (error) {
                status[table] = false;
            }
        }
        
        res.json({
            success: true,
            tables: status,
            database_url: process.env.DATABASE_URL ? 'configured' : 'not configured',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Initialize database endpoint (for manual initialization if needed)
app.post('/api/init-db', async (req, res) => {
    try {
        const success = await initializeDatabase();
        if (success) {
            res.json({ success: true, message: 'Database initialized successfully' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to initialize database' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    // CORRECTED PATH: From server/src/server.js, go up one level to server/, then into client_temp
    const clientPath = path.join(__dirname, '../client_temp');
    
    // Check if client directory exists before serving static files
    if (fs.existsSync(clientPath)) {
        app.use(express.static(clientPath));
        
        // Handle SPA routing - return index.html for all non-API routes
        app.get('*', (req, res) => {
            // Don't interfere with API routes
            if (!req.path.startsWith('/api/')) {
                res.sendFile(path.join(clientPath, 'index.html'));
            }
        });
        console.log('✅ Serving static files from:', clientPath);
    } else {
        console.log('⚠️  Client directory not found, API-only mode');
    }
}

// Global error handler
app.use((err, req, res, next) => {
    console.error('🔥 Server Error:', err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message,
        timestamp: new Date().toISOString()
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `API route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
    });
});

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('🔥 UNCAUGHT EXCEPTION:', error.message);
    console.error('Stack:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 UNHANDLED REJECTION at:', promise);
    console.error('Reason:', reason);
});

// Application initialization function
async function initializeApp() {
    try {
        console.log('🔧 Initializing application...');
        
        // Verify database connection
        if (pool) {
            console.log('🔍 Testing database connection...');
            await pool.query('SELECT 1');
            console.log('✅ Database connection verified');
            
            // Initialize database tables
            console.log('🔧 Initializing database tables...');
            await initializeDatabase();
        } else {
            console.warn('⚠️  Database pool not available');
        }
        
        return true;
    } catch (error) {
        console.warn('⚠️  Database connection failed:', error.message);
        console.warn('   The application will start in limited mode.');
        console.warn('   Visit /api/db-status to check database status.');
        // Don't exit - let the server start anyway
        return false;
    }
}

// Start server
async function startServer() {
    try {
        await initializeApp();
        
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 Health check: http://localhost:${PORT}/health`);
            console.log(`🔗 Database status: http://localhost:${PORT}/api/db-status`);
            console.log(`🔗 Initialize DB: POST http://localhost:${PORT}/api/init-db`);
            
            // Log CORS configuration
            if (process.env.NODE_ENV === 'production') {
                console.log(`🌐 CORS Origin:`, corsOptions.origin);
            } else {
                console.log(`🌐 CORS Origins:`, corsOptions.origin);
            }
            
            // Log database status
            if (process.env.DATABASE_URL) {
                console.log(`💾 Database: Configured`);
            } else {
                console.warn('⚠️  Database: DATABASE_URL not set');
            }
            
            // Log static file serving status
            if (process.env.NODE_ENV === 'production') {
                const clientPath = path.join(__dirname, '../client_temp');
                if (fs.existsSync(clientPath)) {
                    console.log(`📁 Serving frontend from: ${clientPath}`);
                } else {
                    console.log(`📁 Frontend not found at: ${clientPath}`);
                }
            }
        });
    } catch (error) {
        console.error('🔥 Failed to start server:', error);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

startServer();