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
  email: string;
  role: 'passenger' | 'driver' | 'admin';
  driverId?: string;
  clerkId: string;
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
