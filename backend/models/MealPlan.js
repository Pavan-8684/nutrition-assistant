const mongoose = require('mongoose');

const macroSchema = new mongoose.Schema(
  {
    protein: {
      type: Number,
      required: true,
      min: 0
    },
    carbs: {
      type: Number,
      required: true,
      min: 0
    },
    fat: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const mealSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    ingredients: {
      type: [String],
      required: true,
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: 'At least one ingredient is required'
      }
    },
    calories: {
      type: Number,
      required: true,
      min: 0
    },
    macros: {
      type: macroSchema,
      required: true
    }
  },
  { _id: true }
);

const mealPlanSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true
    },
    meals: {
      type: [mealSchema],
      required: true,
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: 'At least one meal is required'
      }
    },
    startDate: {
      type: Date,
      required: true,
      index: true
    },
    endDate: {
      type: Date,
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

mealPlanSchema.methods.getTotals = function getTotals() {
  return this.meals.reduce(
    (totals, meal) => ({
      calories: totals.calories + meal.calories,
      protein: totals.protein + meal.macros.protein,
      carbs: totals.carbs + meal.macros.carbs,
      fat: totals.fat + meal.macros.fat
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
};

module.exports = mongoose.model('MealPlan', mealPlanSchema);
