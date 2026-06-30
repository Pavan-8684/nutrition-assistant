const express = require('express');
const { getPlatformAnalytics } = require('../controllers/adminController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/analytics', requireAuth, requireRole('admin'), getPlatformAnalytics);

module.exports = router;
