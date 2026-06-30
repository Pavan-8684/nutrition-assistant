require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Client = require('./models/Client');
const MealPlan = require('./models/MealPlan');
const Progress = require('./models/Progress');
const User = require('./models/User');
const logger = require('./utils/logger');

const accounts = [
  {
    name: 'Nutrition Admin',
    email: 'admin@example.com',
    password: 'AdminPass123!',
    role: 'admin',
    isApproved: true
  },
  {
    name: 'Dana Dietitian',
    email: 'dietitian@example.com',
    password: 'DietitianPass123!',
    role: 'dietitian',
    isApproved: true
  },
  {
    name: 'Uma User',
    email: 'user@example.com',
    password: 'UserPass123!',
    role: 'user',
    isApproved: true
  }
];

const upsertUser = async (account) => {
  let user = await User.findOne({ email: account.email });

  if (!user) {
    user = new User(account);
  } else {
    user.name = account.name;
    user.password = account.password;
    user.role = account.role;
    user.isApproved = account.isApproved;
  }

  await user.save();
  return user;
};

const seed = async () => {
  await connectDB();

  const admin = await upsertUser(accounts[0]);
  const dietitian = await upsertUser(accounts[1]);
  const user = await upsertUser(accounts[2]);

  const client = await Client.findOneAndUpdate(
    { user: user._id },
    {
      user: user._id,
      age: 30,
      weight: 72,
      height: 175,
      dietaryRestrictions: ['vegetarian'],
      healthConditions: ['none'],
      goals: 'Improve energy and maintain a balanced vegetarian meal routine.',
      dietitian: dietitian._id
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await Promise.all([
    MealPlan.deleteMany({ client: client._id }),
    Progress.deleteMany({ client: client._id })
  ]);

  await MealPlan.create({
    client: client._id,
    createdBy: dietitian._id,
    startDate: new Date('2026-06-24'),
    endDate: new Date('2026-06-30'),
    meals: [
      {
        name: 'Protein Oats',
        ingredients: ['rolled oats', 'Greek yogurt', 'banana', 'chia seeds'],
        calories: 420,
        macros: { protein: 28, carbs: 58, fat: 10 }
      },
      {
        name: 'Lentil Power Bowl',
        ingredients: ['lentils', 'brown rice', 'spinach', 'olive oil'],
        calories: 620,
        macros: { protein: 32, carbs: 82, fat: 18 }
      },
      {
        name: 'Paneer Wrap',
        ingredients: ['whole wheat wrap', 'paneer', 'peppers', 'mint yogurt'],
        calories: 540,
        macros: { protein: 34, carbs: 48, fat: 22 }
      }
    ]
  });

  await Progress.create({
    user: user._id,
    client: client._id,
    goals: {
      calories: 1800,
      protein: 95,
      carbs: 210,
      fat: 55,
      adherenceTarget: 85
    },
    logs: [
      {
        date: new Date('2026-06-24'),
        calories: 1720,
        macros: { protein: 88, carbs: 205, fat: 50 },
        adherence: 96,
        notes: 'Close to target.'
      },
      {
        date: new Date('2026-06-25'),
        calories: 1850,
        macros: { protein: 98, carbs: 220, fat: 57 },
        adherence: 97,
        notes: 'Slightly above goal but balanced.'
      }
    ]
  });

  logger.info(
    {
      admin: admin.email,
      dietitian: dietitian.email,
      user: user.email
    },
    'Seed data ready'
  );
};

seed()
  .then(async () => {
    await mongoose.disconnect();
  })
  .catch(async (error) => {
    logger.error({ error }, 'Seed failed');
    await mongoose.disconnect();
    process.exit(1);
  });
