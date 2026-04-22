import http from 'http';
import { app } from './app';
import { initializeSocketServer } from './socket/socketServer';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { initializeJobQueues } from './jobs/queue';
import { env } from './config/env';
import { logger } from './utils/logger';

const server = http.createServer(app);

initializeSocketServer(server);

async function start() {
  try {
    await connectDatabase();
    await connectRedis();
    await initializeJobQueues();

    server.listen(env.PORT, () => {
      logger.info(`RideMe API running on port ${env.PORT} [${env.NODE_ENV}]`);
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err });
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received – shutting down gracefully');
  server.close(() => process.exit(0));
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason });
});

start();
