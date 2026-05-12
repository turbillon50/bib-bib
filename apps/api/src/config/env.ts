import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  API_URL: z.string().url().default('http://localhost:4000'),

  // Database
  DATABASE_URL: z.string().min(1),
  DB_POOL_MAX: z.coerce.number().default(20),
  DB_POOL_IDLE_TIMEOUT: z.coerce.number().default(30000),
  DB_POOL_CONNECTION_TIMEOUT: z.coerce.number().default(2000),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_MONTHLY_PRICE_ID: z.string().min(1),
  STRIPE_PER_TRIP_AMOUNT: z.coerce.number().default(150),

  // Clerk
  CLERK_SECRET_KEY: z.string().min(1),

  // Resend
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().email(),

  // AWS S3
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_S3_BUCKET: z.string().min(1),
  AWS_S3_PRESIGNED_URL_EXPIRES: z.coerce.number().default(3600),

  // App settings
  OTP_EXPIRES_IN: z.coerce.number().default(300),
  OTP_LENGTH: z.coerce.number().default(6),
  NEARBY_DRIVER_RADIUS_METERS: z.coerce.number().default(5000),
  OFFER_EXPIRY_SECONDS: z.coerce.number().default(30),
  SCHEDULED_RIDE_LEAD_TIME_MINUTES: z.coerce.number().default(15),
  DRIVER_TRIP_FEE_CENTS: z.coerce.number().default(150),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const env = validateEnv();
