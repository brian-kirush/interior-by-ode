// server/src/app.js
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const pool = require('./config/database');
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const dashboardRoutes = require('./routes/dashboard');
const invoiceRoutes = require('./routes/invoices');
const projectRoutes = require('./routes/projects');
const quotationRoutes = require('./routes/quotations');
const settingsRoutes = require('./routes/settings');
const taskRoutes = require('./routes/tasks');
const logger = require('./controllers/logger');
const globalErrorHandler = require('./controllers/errorController');

// Initialize express app
const app = express();

// Middleware
// Enable Cross-Origin Resource Sharing
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 'https://interior-by-ode.onrender.com' : 'http://localhost:3000',
  credentials: true
}));
// Parse incoming JSON requests
app.use(express.json());

// Session middleware
let sessionStore;
try {
  sessionStore = new pgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true // Auto-create table if it doesn't exist
  });
} catch (err) {
  // If initialization fails (e.g. DB temporarily unavailable), log and continue
  logger.error('Failed to initialize PostgreSQL session store, falling back to MemoryStore', err);
  sessionStore = null;
}

const sessionOptions = {
  store: sessionStore || new session.MemoryStore(),
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  name: 'connect.sid'
};

app.use(session(sessionOptions));

// Serve static files from client_temp directory
app.use(express.static(path.join(__dirname, '../client_temp')));

// HTTP request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
// Connect all API endpoints
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/tasks', taskRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve index.html for any non-API routes (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client_temp/index.html'));
});

// Global error handler
app.use(globalErrorHandler);

module.exports = app;