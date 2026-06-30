const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./utils/logger');

const port = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();
    app.listen(port, () => {
      logger.info(`Nutrition Assistant API running on port ${port}`);
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start API server');
    process.exit(1);
  }
};

start();
