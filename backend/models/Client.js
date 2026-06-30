const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    age: {
      type: Number,
      required: true,
      min: 1,
      max: 120
    },
    weight: {
      type: Number,
      required: true,
      min: 1
    },
    height: {
      type: Number,
      required: true,
      min: 1
    },
    dietaryRestrictions: {
      type: [String],
      default: []
    },
    healthConditions: {
      type: [String],
      default: []
    },
    goals: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    dietitian: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Client', clientSchema);
