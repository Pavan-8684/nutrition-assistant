const express = require('express');
const { body, param } = require('express-validator');
const {
  listMealPlans,
  createMealPlan,
  getMealPlan,
  updateMealPlan,
  deleteMealPlan
} = require('../controllers/mealPlanController');
const { requireAuth, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const idParam = param('id').isMongoId().withMessage('Valid meal plan id is required');
const nonNegativeNumber = (field) =>
  body(field)
    .custom((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0)
    .withMessage(`${field} must be a non-negative number`);

const requiredMealValidators = [
  body('client').isMongoId().withMessage('client must be a valid client id'),
  body('meals').isArray({ min: 1 }).withMessage('At least one meal is required'),
  body('meals.*.name').isString().trim().notEmpty().isLength({ max: 120 }),
  body('meals.*.ingredients').isArray({ min: 1 }).withMessage('Each meal needs at least one ingredient'),
  body('meals.*.ingredients.*').isString().trim().notEmpty(),
  nonNegativeNumber('meals.*.calories'),
  nonNegativeNumber('meals.*.macros.protein'),
  nonNegativeNumber('meals.*.macros.carbs'),
  nonNegativeNumber('meals.*.macros.fat'),
  body('startDate').isISO8601().withMessage('startDate must be an ISO date'),
  body('endDate').isISO8601().withMessage('endDate must be an ISO date')
];

const optionalMealValidators = [
  body('client').optional().isMongoId().withMessage('client must be a valid client id'),
  body('meals').optional().isArray({ min: 1 }).withMessage('At least one meal is required'),
  body('meals.*.name').optional().isString().trim().notEmpty().isLength({ max: 120 }),
  body('meals.*.ingredients').optional().isArray({ min: 1 }).withMessage('Each meal needs at least one ingredient'),
  body('meals.*.ingredients.*').optional().isString().trim().notEmpty(),
  body('meals.*.calories')
    .optional()
    .custom((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0),
  body('meals.*.macros.protein')
    .optional()
    .custom((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0),
  body('meals.*.macros.carbs')
    .optional()
    .custom((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0),
  body('meals.*.macros.fat')
    .optional()
    .custom((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0),
  body('startDate').optional().isISO8601().withMessage('startDate must be an ISO date'),
  body('endDate').optional().isISO8601().withMessage('endDate must be an ISO date')
];

router.get('/', requireAuth, requireRole('user', 'dietitian', 'admin'), listMealPlans);

router.post(
  '/',
  requireAuth,
  requireRole('user', 'dietitian', 'admin'),
  [...requiredMealValidators, validate],
  createMealPlan
);

router.get(
  '/:id',
  requireAuth,
  requireRole('user', 'dietitian', 'admin'),
  [idParam, validate],
  getMealPlan
);

router.put(
  '/:id',
  requireAuth,
  requireRole('user', 'dietitian', 'admin'),
  [idParam, ...optionalMealValidators, validate],
  updateMealPlan
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('user', 'dietitian', 'admin'),
  [idParam, validate],
  deleteMealPlan
);

module.exports = router;
