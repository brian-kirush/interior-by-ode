// server/src/app.js
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
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
app.use(cors());
// Parse incoming JSON requests
app.use(express.json());

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

// Global error handler
app.use(globalErrorHandler);

module.exports = app;