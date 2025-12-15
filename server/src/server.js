// server/src/server.js
// Fail early with a helpful message if Node.js is too old for modern dependencies
const nodeMajor = parseInt(process.version.replace(/^v/, '').split('.')[0], 10);
if (Number.isNaN(nodeMajor) || nodeMajor < 18) {
  console.error(`\n❌ Unsupported Node.js version: ${process.version}\nThis project requires Node.js v18 or later. Please upgrade (e.g., using nvm) and restart.\n`);
  process.exit(1);
}

const app = require('./app');
const logger = require('./controllers/logger');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  logger.error('Unhandled Rejection', { error: err.message, stack: err.stack });
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  process.exit(1);
});