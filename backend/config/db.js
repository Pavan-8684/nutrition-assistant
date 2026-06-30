const mongoose = require('mongoose');
const dns = require('dns');
const logger = require('../utils/logger');

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('MONGO_URI is required');
  }

  if (process.env.MONGO_DNS_SERVERS) {
    dns.setServers(
      process.env.MONGO_DNS_SERVERS.split(',')
        .map((server) => server.trim())
        .filter(Boolean)
    );
  }

  await mongoose.connect(mongoUri);
  logger.info('MongoDB connected');
};

module.exports = connectDB;
