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

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'interior-by-ode-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Import database connection for health check
let pool;
try {
    pool = require('./config/database');
} catch (error) {
    console.warn('⚠️  Database config not found or error loading it:', error.message);
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

// Start server
try {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔗 Health check: http://localhost:${PORT}/health`);
        
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
    console.error('🔥 Server failed to start:', error);
    console.error('Stack:', error.stack);
}