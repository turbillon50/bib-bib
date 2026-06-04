import jwt, { JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env';
import { redis, RedisKeys } from '../config/redis';
import { query, withTransaction } from '../config/database';
import {
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  BadRequestError,
} from '../utils/errors';
import { logger } from '../utils/logger';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface JwtAccessPayload extends JwtPayload {
  sub: string;
  email?: string;
  phone?: string;
  role: 'passenger' | 'driver' | 'admin';
  driverId?: string;
  clerkId?: string;
}

export function generateAccessToken(
  payload: Omit<JwtAccessPayload, 'iat' | 'exp'>
): string {
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

/**
 * Create or update user from Clerk auth data
 * Called after successful Clerk authentication
 */
export async function upsertUserFromClerk(data: {
  clerkId: string;
  email: string;
  name: string;
  phone?: string;
  imageUrl?: string;
}): Promise<{
  user: Record<string, unknown>;
  tokens: TokenPair;
}> {
  return withTransaction(async (client) => {
    // Check if user exists
    let { rows: existing } = await client.query(
      'SELECT id, clerk_id FROM users WHERE clerk_id = $1',
      [data.clerkId]
    );

    let userId: string;
    if (existing.length > 0) {
      // Update existing user
      userId = existing[0].id;
      await client.query(
        `UPDATE users SET name = $1, email = $2, phone = COALESCE($3, phone), 
         image_url = COALESCE($4, image_url), updated_at = NOW()
         WHERE id = $5`,
        [data.name, data.email, data.phone || null, data.imageUrl || null, userId]
      );
    } else {
      // Create new user
      const { rows: created } = await client.query<{ id: string }>(
        `INSERT INTO users (clerk_id, email, name, phone, image_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [data.clerkId, data.email, data.name, data.phone || null, data.imageUrl || null]
      );
      userId = created[0].id;
    }

    // Fetch complete user data
    const { rows: users } = await client.query<{
      id: string;
      email: string;
      name: string;
      phone: string;
      clerk_id: string;
      driver_id: string | null;
    }>(
      `SELECT u.id, u.email, u.name, u.phone, u.clerk_id, d.id as driver_id
       FROM users u
       LEFT JOIN drivers d ON d.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );

    if (users.length === 0) {
      throw new NotFoundError('User not found after creation');
    }

    const user = users[0];
    const role: 'passenger' | 'driver' = user.driver_id ? 'driver' : 'passenger';
    const tokens = await issueTokens(
      user.id,
      user.email,
      role,
      user.clerk_id,
      user.driver_id ?? undefined
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role,
        driverId: user.driver_id,
      },
      tokens,
    };
  });
}

async function issueTokens(
  userId: string,
  email: string,
  role: 'passenger' | 'driver' | 'admin',
  clerkId: string,
  driverId?: string
): Promise<TokenPair> {
  const accessToken = generateAccessToken({
    sub: userId,
    email,
    role,
    clerkId,
    ...(driverId ? { driverId } : {}),
  });
  const refreshToken = generateRefreshToken(userId);

  // Store refresh token hash in Redis (7 days)
  await redis.set(
    RedisKeys.refreshToken(userId),
    refreshToken,
    'EX',
    7 * 24 * 3600
  );

  // Also persist in DB if needed
  await query(
    `UPDATE users SET last_login = NOW() WHERE id = $1`,
    [userId]
  );

  return { accessToken, refreshToken };
}

export async function refreshTokens(refreshToken: string): Promise<TokenPair> {
  const payload = verifyRefreshToken(refreshToken);
  const userId = payload.sub as string;

  // Validate token against stored value
  const storedToken = await redis.get(RedisKeys.refreshToken(userId));
  if (!storedToken || storedToken !== refreshToken) {
    throw new UnauthorizedError('Refresh token is invalid or revoked');
  }

  // Get user info
  const { rows } = await query<{
    id: string;
    email: string;
    clerk_id: string;
    driver_id: string | null;
  }>(
    `SELECT u.id, u.email, u.clerk_id, d.id as driver_id
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
  return issueTokens(
    user.id,
    user.email,
    role,
    user.clerk_id,
    user.driver_id ?? undefined
  );
}

export async function logout(userId: string): Promise<void> {
  await redis.del(RedisKeys.refreshToken(userId));
  logger.info('User logged out', { userId });
}

/**
 * Get user by Clerk ID (for middleware verification)
 */
export async function getUserByClerkId(clerkId: string): Promise<Record<string, unknown> | null> {
  const { rows } = await query<{
    id: string;
    email: string;
    name: string;
    phone: string;
    clerk_id: string;
    driver_id: string | null;
  }>(
    `SELECT u.id, u.email, u.name, u.phone, u.clerk_id, d.id as driver_id
     FROM users u
     LEFT JOIN drivers d ON d.user_id = u.id
     WHERE u.clerk_id = $1 AND u.is_active = TRUE`,
    [clerkId]
  );

  if (rows.length === 0) {
    return null;
  }

  const user = rows[0];
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.driver_id ? 'driver' : 'passenger',
    driverId: user.driver_id,
  };
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<Record<string, unknown> | null> {
  const { rows } = await query<{
    id: string;
    email: string;
    name: string;
    phone: string;
    clerk_id: string;
    driver_id: string | null;
  }>(
    `SELECT u.id, u.email, u.name, u.phone, u.clerk_id, d.id as driver_id
     FROM users u
     LEFT JOIN drivers d ON d.user_id = u.id
     WHERE u.id = $1 AND u.is_active = TRUE`,
    [userId]
  );

  if (rows.length === 0) {
    return null;
  }

  const user = rows[0];
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.driver_id ? 'driver' : 'passenger',
    driverId: user.driver_id,
  };
}

// ============================================================
// PHONE + PASSWORD / OTP AUTH
// ============================================================

import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 10;

export interface AuthResult {
  user: Record<string, unknown>;
  tokens: TokenPair;
}

interface UserRow {
  id: string;
  phone: string;
  email: string | null;
  name: string;
  clerk_id?: string | null;
  driver_id: string | null;
}

function toPublicUser(user: UserRow): Record<string, unknown> {
  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    name: user.name,
    role: user.driver_id ? 'driver' : 'passenger',
    driverId: user.driver_id,
  };
}

async function issuePhoneTokens(user: UserRow): Promise<TokenPair> {
  const role: 'passenger' | 'driver' = user.driver_id ? 'driver' : 'passenger';
  const accessToken = generateAccessToken({
    sub: user.id,
    phone: user.phone,
    ...(user.email ? { email: user.email } : {}),
    role,
    ...(user.clerk_id ? { clerkId: user.clerk_id } : {}),
    ...(user.driver_id ? { driverId: user.driver_id } : {}),
  });
  const refreshToken = generateRefreshToken(user.id);

  await redis.set(
    RedisKeys.refreshToken(user.id),
    refreshToken,
    'EX',
    7 * 24 * 3600
  );

  return { accessToken, refreshToken };
}

async function findUserByPhone(phone: string): Promise<UserRow | null> {
  const { rows } = await query<UserRow>(
    `SELECT u.id, u.phone, u.email, u.name, d.id as driver_id
     FROM users u
     LEFT JOIN drivers d ON d.user_id = u.id
     WHERE u.phone = $1`,
    [phone]
  );
  return rows[0] ?? null;
}

/**
 * Register a new user with phone (+ optional email/password).
 */
export async function registerUser(input: {
  phone: string;
  name: string;
  email?: string;
  password?: string;
}): Promise<AuthResult> {
  return withTransaction(async (client) => {
    const { rows: existing } = await client.query(
      'SELECT id FROM users WHERE phone = $1',
      [input.phone]
    );
    if (existing.length > 0) {
      throw new ConflictError('A user with this phone number already exists');
    }

    if (input.email) {
      const { rows: emailExisting } = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [input.email]
      );
      if (emailExisting.length > 0) {
        throw new ConflictError('A user with this email already exists');
      }
    }

    const { rows: created } = await client.query<{ id: string }>(
      `INSERT INTO users (phone, name, email)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [input.phone, input.name, input.email ?? null]
    );
    const userId = created[0].id;

    if (input.password) {
      const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
      await client.query(
        `INSERT INTO auth_credentials (user_id, password_hash)
         VALUES ($1, $2)`,
        [userId, passwordHash]
      );
    }

    const user: UserRow = {
      id: userId,
      phone: input.phone,
      email: input.email ?? null,
      name: input.name,
      driver_id: null,
    };

    const tokens = await issuePhoneTokens(user);
    logger.info('User registered', { userId, phone: input.phone });

    return { user: toPublicUser(user), tokens };
  });
}

/**
 * Login with phone + password.
 */
export async function loginWithPassword(
  phone: string,
  password: string
): Promise<AuthResult> {
  const user = await findUserByPhone(phone);
  if (!user) {
    throw new UnauthorizedError('Invalid phone or password');
  }

  const { rows: creds } = await query<{ password_hash: string | null }>(
    'SELECT password_hash FROM auth_credentials WHERE user_id = $1',
    [user.id]
  );

  const passwordHash = creds[0]?.password_hash;
  if (!passwordHash) {
    throw new UnauthorizedError(
      'Password login not enabled for this account. Use OTP login.'
    );
  }

  const valid = await bcrypt.compare(password, passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid phone or password');
  }

  const tokens = await issuePhoneTokens(user);
  logger.info('User logged in with password', { userId: user.id });

  return { user: toPublicUser(user), tokens };
}

/**
 * Generate a one-time password for a phone number and store it in Redis.
 */
export async function generateOtp(
  phone: string
): Promise<{ code: string; expiresAt: Date }> {
  // Basic rate limiting: max 5 OTP requests per 15 minutes per phone
  const rateKey = RedisKeys.rateLimitOtp(phone);
  const attempts = await redis.incr(rateKey);
  if (attempts === 1) {
    await redis.expire(rateKey, 15 * 60);
  }
  if (attempts > 5) {
    throw new BadRequestError('Too many OTP requests. Please try again later.');
  }

  const length = env.OTP_LENGTH;
  let code = '';
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }

  const ttlSeconds = env.OTP_EXPIRES_IN;
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  await redis.set(RedisKeys.otp(phone), code, 'EX', ttlSeconds);
  logger.info('OTP generated', { phone });

  return { code, expiresAt };
}

/**
 * Login (or auto-register) with phone + OTP code.
 */
export async function loginWithOtp(
  phone: string,
  code: string
): Promise<AuthResult & { isNew: boolean }> {
  const storedCode = await redis.get(RedisKeys.otp(phone));
  if (!storedCode || storedCode !== code) {
    throw new UnauthorizedError('Invalid or expired OTP code');
  }

  // OTP is single use
  await redis.del(RedisKeys.otp(phone));

  let user = await findUserByPhone(phone);
  let isNew = false;

  if (!user) {
    // Auto-register a minimal account on first OTP login
    const { rows: created } = await query<{ id: string }>(
      `INSERT INTO users (phone, name)
       VALUES ($1, $2)
       RETURNING id`,
      [phone, `User ${phone.slice(-4)}`]
    );
    user = {
      id: created[0].id,
      phone,
      email: null,
      name: `User ${phone.slice(-4)}`,
      driver_id: null,
    };
    isNew = true;
    logger.info('User auto-registered via OTP', { userId: user.id, phone });
  }

  const tokens = await issuePhoneTokens(user);
  logger.info('User logged in with OTP', { userId: user.id });

  return { user: toPublicUser(user), tokens, isNew };
}

/**
 * Change (or set) a user's password.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const { rows: creds } = await query<{
    id: string;
    password_hash: string | null;
  }>(
    'SELECT id, password_hash FROM auth_credentials WHERE user_id = $1',
    [userId]
  );

  const existing = creds[0];

  if (existing?.password_hash) {
    const valid = await bcrypt.compare(currentPassword, existing.password_hash);
    if (!valid) {
      throw new UnauthorizedError('Current password is incorrect');
    }
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  if (existing) {
    await query(
      `UPDATE auth_credentials SET password_hash = $1, updated_at = NOW()
       WHERE user_id = $2`,
      [newHash, userId]
    );
  } else {
    await query(
      `INSERT INTO auth_credentials (user_id, password_hash)
       VALUES ($1, $2)`,
      [userId, newHash]
    );
  }

  logger.info('Password changed', { userId });
}
