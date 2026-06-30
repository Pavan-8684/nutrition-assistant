const express = require('express');
const { body, param } = require('express-validator');
const {
  listClients,
  createClient,
  getClient,
  updateClient,
  deleteClient
} = require('../controllers/clientController');
const { requireAuth, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const idParam = param('id').isMongoId().withMessage('Valid client id is required');
const optionalStringArray = (field) => [
  body(field).optional().isArray().withMessage(`${field} must be an array`),
  body(`${field}.*`).optional().isString().trim().notEmpty()
];
const numberField = (field) =>
  body(field)
    .custom((value) => typeof value === 'number' && Number.isFinite(value) && value > 0)
    .withMessage(`${field} must be a positive number`);

router.get('/', requireAuth, requireRole('user', 'dietitian', 'admin'), listClients);

router.post(
  '/',
  requireAuth,
  requireRole('user', 'dietitian', 'admin'),
  [
    body('user').optional().isMongoId().withMessage('user must be a valid user id'),
    body('dietitian').optional({ nullable: true }).isMongoId().withMessage('dietitian must be a valid user id'),
    numberField('age').custom((value) => value <= 120).withMessage('age must be 120 or less'),
    numberField('weight'),
    numberField('height'),
    ...optionalStringArray('dietaryRestrictions'),
    ...optionalStringArray('healthConditions'),
    body('goals').isString().trim().notEmpty().isLength({ max: 500 }),
    validate
  ],
  createClient
);

router.get(
  '/:id',
  requireAuth,
  requireRole('user', 'dietitian', 'admin'),
  [idParam, validate],
  getClient
);

router.put(
  '/:id',
  requireAuth,
  requireRole('user', 'dietitian', 'admin'),
  [
    idParam,
    body('user').optional().isMongoId().withMessage('user must be a valid user id'),
    body('dietitian').optional({ nullable: true }).isMongoId().withMessage('dietitian must be a valid user id'),
    body('age').optional().custom((value) => typeof value === 'number' && value > 0 && value <= 120),
    body('weight').optional().custom((value) => typeof value === 'number' && value > 0),
    body('height').optional().custom((value) => typeof value === 'number' && value > 0),
    ...optionalStringArray('dietaryRestrictions'),
    ...optionalStringArray('healthConditions'),
    body('goals').optional().isString().trim().notEmpty().isLength({ max: 500 }),
    validate
  ],
  updateClient
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('user', 'dietitian', 'admin'),
  [idParam, validate],
  deleteClient
);

module.exports = router;
