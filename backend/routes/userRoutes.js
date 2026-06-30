const express = require('express');
const { body, param } = require('express-validator');
const {
  createUser,
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  setUserRole,
  approveDietitian
} = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const idParam = param('id').isMongoId().withMessage('Valid user id is required');

router.get('/', requireAuth, requireRole('admin'), listUsers);

router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  [
    body('name').isString().trim().notEmpty().isLength({ max: 80 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isString().isLength({ min: 8 }),
    body('role').optional().isIn(['user', 'dietitian', 'admin']),
    body('isApproved').optional().isBoolean({ strict: true }),
    validate
  ],
  createUser
);

router.get(
  '/:id',
  requireAuth,
  requireRole('user', 'dietitian', 'admin'),
  [idParam, validate],
  getUser
);

router.patch(
  '/:id',
  requireAuth,
  requireRole('user', 'dietitian', 'admin'),
  [
    idParam,
    body('name').optional().isString().trim().notEmpty().isLength({ max: 80 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('password').optional().isString().isLength({ min: 8 }),
    body('role').not().exists().withMessage('Use the role management endpoint to change roles'),
    body('isApproved').not().exists().withMessage('Use the approval endpoint to change approval status'),
    validate
  ],
  updateUser
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  [idParam, validate],
  deleteUser
);

router.patch(
  '/:id/role',
  requireAuth,
  requireRole('admin'),
  [
    idParam,
    body('role').isIn(['user', 'dietitian', 'admin']).withMessage('Role must be user, dietitian, or admin'),
    validate
  ],
  setUserRole
);

router.patch(
  '/:id/approve-dietitian',
  requireAuth,
  requireRole('admin'),
  [
    idParam,
    body('approved').isBoolean({ strict: true }).withMessage('approved must be a boolean'),
    validate
  ],
  approveDietitian
);

module.exports = router;
