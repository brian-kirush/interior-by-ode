const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// Dashboard Routes
router
  .get('/stats', dashboardController.getStats)
  .get('/recent-projects', dashboardController.getRecentProjects)
  .get('/upcoming-deadlines', dashboardController.getUpcomingDeadlines)
  .get('/revenue-data', dashboardController.getRevenueData)
  .get('/overview', dashboardController.getOverview);

module.exports = router;