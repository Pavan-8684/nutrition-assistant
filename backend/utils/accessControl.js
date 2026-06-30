const ApiError = require('./ApiError');

const normalizeId = (value) => {
  if (!value) {
    return '';
  }

  if (value._id) {
    return String(value._id);
  }

  return String(value);
};

const sameId = (left, right) => normalizeId(left) === normalizeId(right);

const ensureDietitianApproved = (user) => {
  if (user.role === 'dietitian' && !user.isApproved) {
    throw new ApiError(403, 'Dietitian account is pending admin approval');
  }
};

const canAccessClient = (user, client) => {
  if (!user || !client) {
    return false;
  }

  if (user.role === 'admin') {
    return true;
  }

  if (user.role === 'user') {
    return sameId(client.user, user._id);
  }

  if (user.role === 'dietitian') {
    return user.isApproved && sameId(client.dietitian, user._id);
  }

  return false;
};

const ensureClientAccess = (user, client) => {
  ensureDietitianApproved(user);

  if (!canAccessClient(user, client)) {
    throw new ApiError(403, 'You do not have access to this client');
  }
};

const clientQueryForUser = (user) => {
  if (user.role === 'admin') {
    return {};
  }

  if (user.role === 'user') {
    return { user: user._id };
  }

  ensureDietitianApproved(user);
  return { dietitian: user._id };
};

const toPagination = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 50);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

module.exports = {
  sameId,
  ensureDietitianApproved,
  canAccessClient,
  ensureClientAccess,
  clientQueryForUser,
  toPagination
};
