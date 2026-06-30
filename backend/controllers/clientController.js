const Client = require('../models/Client');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const sendResponse = require('../utils/sendResponse');
const {
  sameId,
  ensureClientAccess,
  ensureDietitianApproved,
  clientQueryForUser,
  toPagination
} = require('../utils/accessControl');

const populateClient = (query) =>
  query.populate('user', 'name email role').populate('dietitian', 'name email role isApproved');

const assertProfileUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(400, 'Linked user does not exist');
  }

  return user;
};

const assertDietitian = async (dietitianId) => {
  if (!dietitianId) {
    return null;
  }

  const dietitian = await User.findById(dietitianId);

  if (!dietitian || dietitian.role !== 'dietitian') {
    throw new ApiError(400, 'Assigned dietitian must be a dietitian user');
  }

  if (!dietitian.isApproved) {
    throw new ApiError(400, 'Assigned dietitian must be approved');
  }

  return dietitian;
};

const listClients = asyncHandler(async (req, res) => {
  const { page, limit, skip } = toPagination(req.query);
  const filter = clientQueryForUser(req.user);

  const [clients, total] = await Promise.all([
    populateClient(Client.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)),
    Client.countDocuments(filter)
  ]);

  sendResponse(res, 200, clients, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
  });
});

const createClient = asyncHandler(async (req, res) => {
  let profileUserId = req.body.user;
  let dietitianId = req.body.dietitian || null;

  if (req.user.role === 'user') {
    if (profileUserId && !sameId(profileUserId, req.user._id)) {
      throw new ApiError(403, 'Users can only create their own client profile');
    }

    profileUserId = req.user._id;
    dietitianId = null;
  }

  if (req.user.role === 'dietitian') {
    ensureDietitianApproved(req.user);
    profileUserId = req.body.user;
    dietitianId = req.user._id;
  }

  if (!profileUserId) {
    throw new ApiError(400, 'A linked user is required');
  }

  await assertProfileUser(profileUserId);
  await assertDietitian(dietitianId);

  const existingProfile = await Client.findOne({ user: profileUserId });

  if (existingProfile) {
    throw new ApiError(409, 'This user already has a client profile');
  }

  const client = await Client.create({
    user: profileUserId,
    age: req.body.age,
    weight: req.body.weight,
    height: req.body.height,
    dietaryRestrictions: req.body.dietaryRestrictions || [],
    healthConditions: req.body.healthConditions || [],
    goals: req.body.goals,
    dietitian: dietitianId
  });

  const populatedClient = await populateClient(Client.findById(client._id));
  sendResponse(res, 201, populatedClient);
});

const getClient = asyncHandler(async (req, res) => {
  const client = await populateClient(Client.findById(req.params.id));

  if (!client) {
    throw new ApiError(404, 'Client not found');
  }

  ensureClientAccess(req.user, client);
  sendResponse(res, 200, client);
});

const updateClient = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);

  if (!client) {
    throw new ApiError(404, 'Client not found');
  }

  ensureClientAccess(req.user, client);

  ['age', 'weight', 'height', 'dietaryRestrictions', 'healthConditions', 'goals'].forEach((field) => {
    if (req.body[field] !== undefined) {
      client[field] = req.body[field];
    }
  });

  if (req.user.role === 'admin') {
    if (req.body.user !== undefined) {
      await assertProfileUser(req.body.user);
      client.user = req.body.user;
    }

    if (req.body.dietitian !== undefined) {
      await assertDietitian(req.body.dietitian);
      client.dietitian = req.body.dietitian || null;
    }
  }

  await client.save();
  const populatedClient = await populateClient(Client.findById(client._id));
  sendResponse(res, 200, populatedClient);
});

const deleteClient = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);

  if (!client) {
    throw new ApiError(404, 'Client not found');
  }

  ensureClientAccess(req.user, client);
  await client.deleteOne();
  sendResponse(res, 200, { id: req.params.id });
});

module.exports = {
  listClients,
  createClient,
  getClient,
  updateClient,
  deleteClient
};
