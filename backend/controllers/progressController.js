const Client = require('../models/Client');
const MealPlan = require('../models/MealPlan');
const Progress = require('../models/Progress');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const sendResponse = require('../utils/sendResponse');
const {
  ensureClientAccess,
  clientQueryForUser,
  toPagination
} = require('../utils/accessControl');
const { mealPlanWithTotals } = require('./mealPlanController');

const populateProgress = (query) =>
  query
    .populate({
      path: 'client',
      populate: [
        { path: 'user', select: 'name email role' },
        { path: 'dietitian', select: 'name email role isApproved' }
      ]
    })
    .populate('user', 'name email role');

const findAccessibleClient = async (user, clientId) => {
  const client = await Client.findById(clientId);

  if (!client) {
    throw new ApiError(404, 'Client not found');
  }

  ensureClientAccess(user, client);
  return client;
};

const getAccessibleClientIds = async (user) => {
  const clients = await Client.find(clientQueryForUser(user)).select('_id');
  return clients.map((client) => client._id);
};

const calculateAdherence = (calories, goalCalories) => {
  if (!goalCalories) {
    return 0;
  }

  const variance = Math.abs(calories - goalCalories) / goalCalories;
  return Math.max(0, Math.round((1 - variance) * 100));
};

const normalizeLog = (log, goals) => ({
  ...log,
  adherence:
    log.adherence !== undefined
      ? log.adherence
      : calculateAdherence(log.calories, goals.calories)
});

const normalizeLogs = (logs = [], goals) => logs.map((log) => normalizeLog(log, goals));

const listProgress = asyncHandler(async (req, res) => {
  const { page, limit, skip } = toPagination(req.query);
  const filter = {};

  if (req.query.clientId) {
    await findAccessibleClient(req.user, req.query.clientId);
    filter.client = req.query.clientId;
  } else {
    filter.client = { $in: await getAccessibleClientIds(req.user) };
  }

  const [records, total] = await Promise.all([
    populateProgress(Progress.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit)),
    Progress.countDocuments(filter)
  ]);

  sendResponse(res, 200, records, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
  });
});

const createProgress = asyncHandler(async (req, res) => {
  const client = await findAccessibleClient(req.user, req.body.client);

  const progress = await Progress.create({
    user: client.user,
    client: client._id,
    goals: req.body.goals,
    logs: normalizeLogs(req.body.logs, req.body.goals)
  });

  const populatedProgress = await populateProgress(Progress.findById(progress._id));
  sendResponse(res, 201, populatedProgress);
});

const getProgress = asyncHandler(async (req, res) => {
  const progress = await populateProgress(Progress.findById(req.params.id));

  if (!progress) {
    throw new ApiError(404, 'Progress record not found');
  }

  ensureClientAccess(req.user, progress.client);
  sendResponse(res, 200, progress);
});

const updateProgress = asyncHandler(async (req, res) => {
  const progress = await Progress.findById(req.params.id).populate('client');

  if (!progress) {
    throw new ApiError(404, 'Progress record not found');
  }

  ensureClientAccess(req.user, progress.client);

  if (req.body.client !== undefined) {
    const client = await findAccessibleClient(req.user, req.body.client);
    progress.client = client._id;
    progress.user = client.user;
  }

  if (req.body.goals !== undefined) {
    progress.goals = req.body.goals;
  }

  if (req.body.logs !== undefined) {
    progress.logs = normalizeLogs(req.body.logs, progress.goals);
  }

  await progress.save();

  const populatedProgress = await populateProgress(Progress.findById(progress._id));
  sendResponse(res, 200, populatedProgress);
});

const deleteProgress = asyncHandler(async (req, res) => {
  const progress = await Progress.findById(req.params.id).populate('client');

  if (!progress) {
    throw new ApiError(404, 'Progress record not found');
  }

  ensureClientAccess(req.user, progress.client);
  await progress.deleteOne();
  sendResponse(res, 200, { id: req.params.id });
});

const addProgressLog = asyncHandler(async (req, res) => {
  const progress = await Progress.findById(req.params.id).populate('client');

  if (!progress) {
    throw new ApiError(404, 'Progress record not found');
  }

  ensureClientAccess(req.user, progress.client);
  progress.logs.push(normalizeLog(req.body, progress.goals));
  await progress.save();

  const populatedProgress = await populateProgress(Progress.findById(progress._id));
  sendResponse(res, 201, populatedProgress);
});

const getProgressCharts = asyncHandler(async (req, res) => {
  const client = await findAccessibleClient(req.user, req.params.clientId);
  const [progressRecords, mealPlans] = await Promise.all([
    Progress.find({ client: client._id }).sort({ updatedAt: -1 }),
    MealPlan.find({ client: client._id }).sort({ startDate: -1 })
  ]);

  const logs = progressRecords
    .flatMap((record) =>
      record.logs.map((log) => ({
        date: log.date.toISOString().slice(0, 10),
        calories: log.calories,
        protein: log.macros.protein,
        carbs: log.macros.carbs,
        fat: log.macros.fat,
        adherence: log.adherence
      }))
    )
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const mealPlanHistory = mealPlans.map((plan) => {
    const enrichedPlan = mealPlanWithTotals(plan);
    return {
      id: enrichedPlan._id,
      startDate: enrichedPlan.startDate,
      endDate: enrichedPlan.endDate,
      totals: enrichedPlan.totals
    };
  });

  const latestPlan = mealPlanHistory[0] || null;
  const latestProgress = progressRecords[0] || null;
  const latestGoals = latestProgress ? latestProgress.goals : null;
  const averageAdherence =
    logs.length > 0
      ? Math.round(logs.reduce((sum, log) => sum + log.adherence, 0) / logs.length)
      : 0;

  sendResponse(res, 200, {
    client: client._id,
    goals: latestGoals,
    intakeOverTime: logs,
    adherenceTrend: logs.map((log) => ({ date: log.date, adherence: log.adherence })),
    macroDistribution: latestPlan
      ? [
          { name: 'Protein', value: latestPlan.totals.protein },
          { name: 'Carbs', value: latestPlan.totals.carbs },
          { name: 'Fat', value: latestPlan.totals.fat }
        ]
      : [],
    plannedNutrition: mealPlanHistory,
    latestPlannedTotals: latestPlan ? latestPlan.totals : null,
    averageAdherence
  });
});

module.exports = {
  listProgress,
  createProgress,
  getProgress,
  updateProgress,
  deleteProgress,
  addProgressLog,
  getProgressCharts
};
