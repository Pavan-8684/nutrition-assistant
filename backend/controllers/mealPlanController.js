const Client = require('../models/Client');
const MealPlan = require('../models/MealPlan');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const sendResponse = require('../utils/sendResponse');
const {
  ensureClientAccess,
  clientQueryForUser,
  toPagination
} = require('../utils/accessControl');

const populateMealPlan = (query) =>
  query
    .populate({
      path: 'client',
      populate: [
        { path: 'user', select: 'name email role' },
        { path: 'dietitian', select: 'name email role isApproved' }
      ]
    })
    .populate('createdBy', 'name email role');

const mealPlanWithTotals = (plan) => {
  const data = plan.toObject ? plan.toObject() : plan;
  const totals = data.meals.reduce(
    (sum, meal) => ({
      calories: sum.calories + meal.calories,
      protein: sum.protein + meal.macros.protein,
      carbs: sum.carbs + meal.macros.carbs,
      fat: sum.fat + meal.macros.fat
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return { ...data, totals };
};

const assertDateRange = (startDate, endDate) => {
  if (new Date(endDate) < new Date(startDate)) {
    throw new ApiError(400, 'endDate must be on or after startDate');
  }
};

const getAccessibleClientIds = async (user) => {
  const clients = await Client.find(clientQueryForUser(user)).select('_id');
  return clients.map((client) => client._id);
};

const findAccessibleClient = async (user, clientId) => {
  const client = await Client.findById(clientId);

  if (!client) {
    throw new ApiError(404, 'Client not found');
  }

  ensureClientAccess(user, client);
  return client;
};

const listMealPlans = asyncHandler(async (req, res) => {
  const { page, limit, skip } = toPagination(req.query);
  const filter = {};

  if (req.query.clientId) {
    await findAccessibleClient(req.user, req.query.clientId);
    filter.client = req.query.clientId;
  } else {
    filter.client = { $in: await getAccessibleClientIds(req.user) };
  }

  const [plans, total] = await Promise.all([
    populateMealPlan(MealPlan.find(filter).sort({ startDate: -1 }).skip(skip).limit(limit)),
    MealPlan.countDocuments(filter)
  ]);

  sendResponse(res, 200, plans.map(mealPlanWithTotals), {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
  });
});

const createMealPlan = asyncHandler(async (req, res) => {
  assertDateRange(req.body.startDate, req.body.endDate);
  await findAccessibleClient(req.user, req.body.client);

  const plan = await MealPlan.create({
    client: req.body.client,
    meals: req.body.meals,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    createdBy: req.user._id
  });

  const populatedPlan = await populateMealPlan(MealPlan.findById(plan._id));
  sendResponse(res, 201, mealPlanWithTotals(populatedPlan));
});

const getMealPlan = asyncHandler(async (req, res) => {
  const plan = await populateMealPlan(MealPlan.findById(req.params.id));

  if (!plan) {
    throw new ApiError(404, 'Meal plan not found');
  }

  ensureClientAccess(req.user, plan.client);
  sendResponse(res, 200, mealPlanWithTotals(plan));
});

const updateMealPlan = asyncHandler(async (req, res) => {
  const plan = await MealPlan.findById(req.params.id).populate('client');

  if (!plan) {
    throw new ApiError(404, 'Meal plan not found');
  }

  ensureClientAccess(req.user, plan.client);

  if (req.body.client !== undefined) {
    await findAccessibleClient(req.user, req.body.client);
    plan.client = req.body.client;
  }

  ['meals', 'startDate', 'endDate'].forEach((field) => {
    if (req.body[field] !== undefined) {
      plan[field] = req.body[field];
    }
  });

  assertDateRange(plan.startDate, plan.endDate);
  await plan.save();

  const populatedPlan = await populateMealPlan(MealPlan.findById(plan._id));
  sendResponse(res, 200, mealPlanWithTotals(populatedPlan));
});

const deleteMealPlan = asyncHandler(async (req, res) => {
  const plan = await MealPlan.findById(req.params.id).populate('client');

  if (!plan) {
    throw new ApiError(404, 'Meal plan not found');
  }

  ensureClientAccess(req.user, plan.client);
  await plan.deleteOne();
  sendResponse(res, 200, { id: req.params.id });
});

module.exports = {
  listMealPlans,
  createMealPlan,
  getMealPlan,
  updateMealPlan,
  deleteMealPlan,
  mealPlanWithTotals
};
