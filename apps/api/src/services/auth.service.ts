import bcrypt from 'bcrypt';
import jwt, { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { redis, RedisKeys } from '../config/redis';
import { query, withTransaction } from '../config/database';
import {
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  BadRequestError,
  TooManyRequestsError,
} from '../utils/errors';
import { logger } from '../utils/logger';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface JwtAccessPayload extends JwtPayload {
  sub: string;
  phone: string;
  role: 'passenger' | 'driver' | 'admin';
  driverId?: string;
}

const BCRYPT_ROUNDS = 12;
const OTP_RATE_LIMIT = 3; // per hour
const OTP_RATE_LIMIT_WINDOW = 3600; // seconds

export function generateAccessToken(payload: Omit<JwtAccessPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    issuer: 'rideme-api',
    audience: 'rideme-client',
  } as jwt.SignOptions);
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    issuer: 'rideme-api',
    audience: 'rideme-client',
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JwtAccessPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: 'rideme-api',
      audience: 'rideme-client',
    }) as JwtAccessPayload;
  } catch (err) {
    throw new UnauthorizedError('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET, {
      issuer: 'rideme-api',
      audience: 'rideme-client',
    }) as JwtPayload;
  } catch (err) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function hashToken(token: string): Promise<string> {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function generateOtp(
  phone: string
): Promise<{ code: string; expiresAt: Date }> {
  // Rate limiting: max OTP_RATE_LIMIT per window
  const rateLimitKey = RedisKeys.rateLimitOtp(phone);
  const attempts = await redis.incr(rateLimitKey);
  if (attempts === 1) {
    await redis.expire(rateLimitKey, OTP_RATE_LIMIT_WINDOW);
  }
  if (attempts > OTP_RATE_LIMIT) {
    throw new TooManyRequestsError('Too many OTP requests. Please try again later.');
  }

  const code = crypto.randomInt(
    Math.pow(10, env.OTP_LENGTH - 1),
    Math.pow(10, env.OTP_LENGTH)
  ).toString();

  const expiresAt = new Date(Date.now() + env.OTP_EXPIRES_IN * 1000);

  // Store in DB (invalidate old ones)
  await query(
    `INSERT INTO otps (phone, code, expires_at)
     VALUES ($1, $2, $3)`,
    [phone, await hashToken(code), expiresAt]
  );

  // Also store in Redis for fast lookup
  await redis.set(RedisKeys.otp(phone), code, 'EX', env.OTP_EXPIRES_IN);

  logger.info('OTP generated', { phone });
  return { code, expiresAt };
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  // First check Redis (fast path)
  const cached = await redis.get(RedisKeys.otp(phone));
  if (cached && cached === code) {
    await redis.del(RedisKeys.otp(phone));
    // Mark DB record as used
    await query(
      `UPDATE otps SET used = TRUE
       WHERE phone = $1 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [phone]
    );
    return true;
  }

  // Fallback: check DB with hashed code
  const hashedCode = await hashToken(code);
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM otps
     WHERE phone = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [phone, hashedCode]
  );

  if (rows.length === 0) {
    return false;
  }

  await query(`UPDATE otps SET used = TRUE WHERE id = $1`, [rows[0].id]);
  await redis.del(RedisKeys.otp(phone));
  return true;
}

export async function registerUser(data: {
  phone: string;
  name: string;
  email?: string;
  password?: string;
}): Promise<{ user: Record<string, unknown>; tokens: TokenPair }> {
  return withTransaction(async (client) => {
    // Check phone uniqueness
    const { rows: existing } = await client.query(
      'SELECT id FROM users WHERE phone = $1',
      [data.phone]
    );
    if (existing.length > 0) {
      throw new ConflictError('Phone number already registered');
    }

    // Create user
    const { rows } = await client.query<{
      id: string;
      phone: string;
      name: string;
      email: string;
    }>(
      `INSERT INTO users (phone, name, email)
       VALUES ($1, $2, $3)
       RETURNING id, phone, name, email, created_at`,
      [data.phone, data.name, data.email ?? null]
    );
    const user = rows[0];

    // Create auth credentials
    const passwordHash = data.password ? await hashPassword(data.password) : null;
    await client.query(
      `INSERT INTO auth_credentials (user_id, password_hash)
       VALUES ($1, $2)`,
      [user.id, passwordHash]
    );

    const tokens = await createTokenPair(user.id, user.phone, 'passenger', client);
    return { user, tokens };
  });
}

export async function loginWithPassword(
  phone: string,
  password: string
): Promise<{ user: Record<string, unknown>; tokens: TokenPair }> {
  const { rows } = await query<{
    id: string;
    phone: string;
    name: string;
    email: string;
    password_hash: string;
    driver_id: string | null;
  }>(
    `SELECT u.id, u.phone, u.name, u.email, ac.password_hash,
            d.id as driver_id
     FROM users u
     JOIN auth_credentials ac ON ac.user_id = u.id
     LEFT JOIN drivers d ON d.user_id = u.id
     WHERE u.phone = $1 AND u.is_active = TRUE`,
    [phone]
  );

  if (rows.length === 0) {
    throw new UnauthorizedError('Invalid phone or password');
  }

  const user = rows[0];
  if (!user.password_hash) {
    throw new UnauthorizedError('Password login not enabled for this account');
  }

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) {
    throw new UnauthorizedError('Invalid phone or password');
  }

  const role = user.driver_id ? 'driver' : 'passenger';
  const tokens = await issueTokens(user.id, user.phone, role, user.driver_id ?? undefined);

  return {
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      role,
      driverId: user.driver_id,
    },
    tokens,
  };
}

export async function loginWithOtp(
  phone: string,
  code: string
): Promise<{ user: Record<string, unknown>; tokens: TokenPair; isNew: boolean }> {
  const valid = await verifyOtp(phone, code);
  if (!valid) {
    throw new UnauthorizedError('Invalid or expired OTP code');
  }

  // Find or create user
  let { rows } = await query<{
    id: string;
    phone: string;
    name: string;
    driver_id: string | null;
  }>(
    `SELECT u.id, u.phone, u.name, d.id as driver_id
     FROM users u
     LEFT JOIN drivers d ON d.user_id = u.id
     WHERE u.phone = $1 AND u.is_active = TRUE`,
    [phone]
  );

  let isNew = false;
  if (rows.length === 0) {
    // Auto-create user from phone
    const { rows: created } = await query<{ id: string; phone: string; name: string }>(
      `INSERT INTO users (phone, name)
       VALUES ($1, $2)
       RETURNING id, phone, name`,
      [phone, `User ${phone.slice(-4)}`]
    );
    await query(
      `INSERT INTO auth_credentials (user_id) VALUES ($1)`,
      [created[0].id]
    );
    rows = [{ ...created[0], driver_id: null }];
    isNew = true;
  }

  const user = rows[0];
  const role: 'passenger' | 'driver' = user.driver_id ? 'driver' : 'passenger';
  const tokens = await issueTokens(user.id, user.phone, role, user.driver_id ?? undefined);

  return {
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role,
      driverId: user.driver_id,
    },
    tokens,
    isNew,
  };
}

async function issueTokens(
  userId: string,
  phone: string,
  role: 'passenger' | 'driver' | 'admin',
  driverId?: string
): Promise<TokenPair> {
  const accessToken = generateAccessToken({ sub: userId, phone, role, ...(driverId ? { driverId } : {}) });
  const refreshToken = generateRefreshToken(userId);

  // Store refresh token hash in Redis (7 days)
  const tokenHash = await hashToken(refreshToken);
  await redis.set(RedisKeys.refreshToken(userId), tokenHash, 'EX', 7 * 24 * 3600);

  // Also persist in DB
  await query(
    `UPDATE auth_credentials SET refresh_token_hash = $1, updated_at = NOW()
     WHERE user_id = $2`,
    [tokenHash, userId]
  );

  return { accessToken, refreshToken };
}

async function createTokenPair(
  userId: string,
  phone: string,
  role: 'passenger' | 'driver' | 'admin',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _client: any
): Promise<TokenPair> {
  return issueTokens(userId, phone, role);
}

export async function refreshTokens(refreshToken: string): Promise<TokenPair> {
  const payload = verifyRefreshToken(refreshToken);
  const userId = payload.sub as string;

  // Validate token against stored hash
  const storedHash = await redis.get(RedisKeys.refreshToken(userId));
  const tokenHash = await hashToken(refreshToken);

  if (!storedHash || storedHash !== tokenHash) {
    throw new UnauthorizedError('Refresh token is invalid or revoked');
  }

  // Get user info
  const { rows } = await query<{
    id: string;
    phone: string;
    driver_id: string | null;
  }>(
    `SELECT u.id, u.phone, d.id as driver_id
     FROM users u
     LEFT JOIN drivers d ON d.user_id = u.id
     WHERE u.id = $1 AND u.is_active = TRUE`,
    [userId]
  );

  if (rows.length === 0) {
    throw new UnauthorizedError('User not found or inactive');
  }

  const user = rows[0];
  const role: 'passenger' | 'driver' = user.driver_id ? 'driver' : 'passenger';
  return issueTokens(user.id, user.phone, role, user.driver_id ?? undefined);
}

export async function logout(userId: string): Promise<void> {
  await redis.del(RedisKeys.refreshToken(userId));
  await query(
    `UPDATE auth_credentials SET refresh_token_hash = NULL, updated_at = NOW()
     WHERE user_id = $1`,
    [userId]
  );
  logger.info('User logged out', { userId });
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const { rows } = await query<{ password_hash: string }>(
    `SELECT password_hash FROM auth_credentials WHERE user_id = $1`,
    [userId]
  );

  if (rows.length === 0 || !rows[0].password_hash) {
    throw new NotFoundError('User credentials not found');
  }

  const valid = await comparePassword(currentPassword, rows[0].password_hash);
  if (!valid) {
    throw new BadRequestError('Current password is incorrect');
  }

  const newHash = await hashPassword(newPassword);
  await query(
    `UPDATE auth_credentials SET password_hash = $1, updated_at = NOW() WHERE user_id = $2`,
    [newHash, userId]
  );
}
