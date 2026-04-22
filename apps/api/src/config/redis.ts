import IORedis, { RedisOptions } from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
};

if (env.REDIS_PASSWORD) {
  redisOptions.password = env.REDIS_PASSWORD;
}

export const redis = new IORedis(env.REDIS_URL, redisOptions);

redis.on('connect', () => logger.info('Redis connected'));
redis.on('ready', () => logger.info('Redis ready'));
redis.on('error', (err) => logger.error('Redis error', { error: err.message }));
redis.on('close', () => logger.warn('Redis connection closed'));
redis.on('reconnecting', () => logger.info('Redis reconnecting'));

// Separate connection for BullMQ (BullMQ requires maxRetriesPerRequest: null)
export function createBullMQConnection(): IORedis {
  const connection = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    ...(env.REDIS_PASSWORD ? { password: env.REDIS_PASSWORD } : {}),
  });

  connection.on('error', (err) => {
    logger.error('BullMQ Redis connection error', { error: err.message });
  });

  return connection;
}

export async function connectRedis(): Promise<void> {
  await redis.connect();
}

// Key helpers
export const RedisKeys = {
  otp: (phone: string) => `otp:${phone}`,
  refreshToken: (userId: string) => `refresh:${userId}`,
  driverLocation: (driverId: string) => `driver:location:${driverId}`,
  driverOnline: () => `drivers:online`,
  rideOffers: (rideId: string) => `ride:offers:${rideId}`,
  rideStatus: (rideId: string) => `ride:status:${rideId}`,
  userSession: (userId: string) => `session:${userId}`,
  rateLimitOtp: (phone: string) => `ratelimit:otp:${phone}`,
};

export const getRedisClient = () => redis;
