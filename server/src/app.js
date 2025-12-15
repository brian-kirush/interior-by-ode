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
const debugRoutes = require('./routes/debug');
const logger = require('./controllers/logger');
const globalErrorHandler = require('./controllers/errorController');

// Initialize express app
const app = express();

// If running behind a reverse proxy (like Render or Cloudflare), enable trust proxy
// so express-session can correctly detect secure connections and set cookies.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

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
    createTableIfMissing: false // Disable auto-create in production to avoid race conditions
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
  proxy: process.env.NODE_ENV === 'production', // ensure secure cookies are set when behind a proxy
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax', // allow cookies to be sent when navigating from the same site
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
app.use('/api/debug', debugRoutes);

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