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

const goalsSchema = new mongoose.Schema(
  {
    calories: {
      type: Number,
      required: true,
      min: 0
    },
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
    },
    adherenceTarget: {
      type: Number,
      default: 85,
      min: 0,
      max: 100
    }
  },
  { _id: false }
);

const intakeLogSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true
    },
    calories: {
      type: Number,
      required: true,
      min: 0
    },
    macros: {
      type: macroSchema,
      required: true
    },
    adherence: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    }
  },
  { timestamps: true }
);

const progressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true
    },
    goals: {
      type: goalsSchema,
      required: true
    },
    logs: {
      type: [intakeLogSchema],
      default: []
    }
  },
  { timestamps: true }
);

progressSchema.index({ client: 1, updatedAt: -1 });

module.exports = mongoose.model('Progress', progressSchema);
