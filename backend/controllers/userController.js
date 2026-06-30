const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const sendResponse = require('../utils/sendResponse');
const { sameId, toPagination } = require('../utils/accessControl');

const createUser = asyncHandler(async (req, res) => {
  const existingUser = await User.findOne({ email: req.body.email });

  if (existingUser) {
    throw new ApiError(409, 'Email is already registered');
  }

  const role = req.body.role || 'user';
  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    role,
    isApproved:
      req.body.isApproved !== undefined ? req.body.isApproved : role !== 'dietitian'
  });

  sendResponse(res, 201, user);
});

const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = toPagination(req.query);
  const filter = {};

  if (req.query.role) {
    filter.role = req.query.role;
  }

  const [users, total] = await Promise.all([
    User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter)
  ]);

  sendResponse(res, 200, users, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
  });
});

const getUser = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' && !sameId(req.user._id, req.params.id)) {
    throw new ApiError(403, 'You can only view your own user record');
  }

  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  sendResponse(res, 200, user);
});

const updateUser = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' && !sameId(req.user._id, req.params.id)) {
    throw new ApiError(403, 'You can only update your own user record');
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const allowedFields = ['name', 'email', 'password'];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  });

  await user.save();
  sendResponse(res, 200, user);
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  await user.deleteOne();
  sendResponse(res, 200, { id: req.params.id });
});

const setUserRole = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  user.role = req.body.role;
  user.isApproved = req.body.role === 'dietitian' ? false : true;
  await user.save();

  sendResponse(res, 200, user);
});

const approveDietitian = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user.role !== 'dietitian') {
    throw new ApiError(400, 'Only dietitian accounts can be approved or rejected');
  }

  user.isApproved = req.body.approved;
  await user.save();

  sendResponse(res, 200, user);
});

module.exports = {
  createUser,
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  setUserRole,
  approveDietitian
};
