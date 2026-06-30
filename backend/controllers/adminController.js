const Client = require('../models/Client');
const MealPlan = require('../models/MealPlan');
const Progress = require('../models/Progress');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const sendResponse = require('../utils/sendResponse');

const getPlatformAnalytics = asyncHandler(async (req, res) => {
  const [
    usersByRole,
    pendingDietitians,
    clientCount,
    mealPlanCount,
    progressRecords,
    mealPlans
  ] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    User.countDocuments({ role: 'dietitian', isApproved: false }),
    Client.countDocuments(),
    MealPlan.countDocuments(),
    Progress.find().select('logs'),
    MealPlan.find().select('meals')
  ]);

  const roleCounts = usersByRole.reduce(
    (counts, row) => ({ ...counts, [row._id]: row.count }),
    { user: 0, dietitian: 0, admin: 0 }
  );

  const logs = progressRecords.flatMap((record) => record.logs);
  const averageAdherence =
    logs.length > 0
      ? Math.round(logs.reduce((sum, log) => sum + log.adherence, 0) / logs.length)
      : 0;

  const plannedCalories = mealPlans.reduce(
    (sum, plan) => sum + plan.meals.reduce((mealSum, meal) => mealSum + meal.calories, 0),
    0
  );

  sendResponse(res, 200, {
    roleCounts,
    pendingDietitians,
    clientCount,
    mealPlanCount,
    progressLogCount: logs.length,
    averageAdherence,
    plannedCalories
  });
});

module.exports = {
  getPlatformAnalytics
};
