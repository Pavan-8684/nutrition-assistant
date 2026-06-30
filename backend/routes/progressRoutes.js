const express = require('express');
const { body, param } = require('express-validator');
const {
  listProgress,
  createProgress,
  getProgress,
  updateProgress,
  deleteProgress,
  addProgressLog,
  getProgressCharts
} = require('../controllers/progressController');
const { requireAuth, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const idParam = param('id').isMongoId().withMessage('Valid progress id is required');
const clientIdParam = param('clientId').isMongoId().withMessage('Valid client id is required');

const numberBetween = (field, min, max) =>
  body(field)
    .custom((value) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max)
    .withMessage(`${field} must be a number between ${min} and ${max}`);

const nonNegativeNumber = (field) => numberBetween(field, 0, Number.MAX_SAFE_INTEGER);

const goalsValidators = [
  nonNegativeNumber('goals.calories'),
  nonNegativeNumber('goals.protein'),
  nonNegativeNumber('goals.carbs'),
  nonNegativeNumber('goals.fat'),
  numberBetween('goals.adherenceTarget', 0, 100).optional()
];

const optionalGoalsValidators = [
  body('goals').optional().isObject().withMessage('goals must be an object'),
  body('goals.calories')
    .if(body('goals').exists())
    .custom((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0),
  body('goals.protein')
    .if(body('goals').exists())
    .custom((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0),
  body('goals.carbs')
    .if(body('goals').exists())
    .custom((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0),
  body('goals.fat')
    .if(body('goals').exists())
    .custom((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0),
  body('goals.adherenceTarget')
    .optional()
    .custom((value) => typeof value === 'number' && value >= 0 && value <= 100)
];

const logPath = (prefix, field) => (prefix ? `${prefix}.${field}` : field);

const logValidators = (prefix) => [
  body(logPath(prefix, 'date')).isISO8601().withMessage(`${logPath(prefix, 'date')} must be an ISO date`),
  nonNegativeNumber(logPath(prefix, 'calories')),
  nonNegativeNumber(logPath(prefix, 'macros.protein')),
  nonNegativeNumber(logPath(prefix, 'macros.carbs')),
  nonNegativeNumber(logPath(prefix, 'macros.fat')),
  body(logPath(prefix, 'adherence'))
    .optional()
    .custom((value) => typeof value === 'number' && value >= 0 && value <= 100),
  body(logPath(prefix, 'notes')).optional().isString().trim().isLength({ max: 500 })
];

const logsArrayValidators = [
  body('logs').optional().isArray().withMessage('logs must be an array'),
  body('logs.*.date').if(body('logs').exists()).isISO8601().withMessage('logs date must be an ISO date'),
  body('logs.*.calories')
    .if(body('logs').exists())
    .custom((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0),
  body('logs.*.macros.protein')
    .if(body('logs').exists())
    .custom((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0),
  body('logs.*.macros.carbs')
    .if(body('logs').exists())
    .custom((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0),
  body('logs.*.macros.fat')
    .if(body('logs').exists())
    .custom((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0),
  body('logs.*.adherence')
    .optional()
    .custom((value) => typeof value === 'number' && value >= 0 && value <= 100),
  body('logs.*.notes').optional().isString().trim().isLength({ max: 500 })
];

router.get('/', requireAuth, requireRole('user', 'dietitian', 'admin'), listProgress);

router.post(
  '/',
  requireAuth,
  requireRole('user', 'dietitian', 'admin'),
  [
    body('client').isMongoId().withMessage('client must be a valid client id'),
    ...goalsValidators,
    ...logsArrayValidators,
    validate
  ],
  createProgress
);

router.get(
  '/client/:clientId/charts',
  requireAuth,
  requireRole('user', 'dietitian', 'admin'),
  [clientIdParam, validate],
  getProgressCharts
);

router.get(
  '/:id',
  requireAuth,
  requireRole('user', 'dietitian', 'admin'),
  [idParam, validate],
  getProgress
);

router.put(
  '/:id',
  requireAuth,
  requireRole('user', 'dietitian', 'admin'),
  [
    idParam,
    body('client').optional().isMongoId().withMessage('client must be a valid client id'),
    ...optionalGoalsValidators,
    ...logsArrayValidators,
    validate
  ],
  updateProgress
);

router.post(
  '/:id/logs',
  requireAuth,
  requireRole('user', 'dietitian', 'admin'),
  [idParam, ...logValidators(''), validate],
  addProgressLog
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('user', 'dietitian', 'admin'),
  [idParam, validate],
  deleteProgress
);

module.exports = router;
