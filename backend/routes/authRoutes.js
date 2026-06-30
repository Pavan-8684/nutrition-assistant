const express = require('express');
const { body } = require('express-validator');
const { register, login, me } = require('../controllers/authController');
const { requireAuth, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.post(
  '/register',
  [
    body('name').isString().trim().notEmpty().isLength({ max: 80 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isString().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').not().exists().withMessage('Role cannot be set during registration'),
    body('isApproved').not().exists().withMessage('Approval status cannot be set during registration'),
    validate
  ],
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isString().notEmpty(),
    validate
  ],
  login
);

router.get('/me', requireAuth, requireRole('user', 'dietitian', 'admin'), me);

module.exports = router;
