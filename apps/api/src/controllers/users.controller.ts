import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { env } from '../config/env';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { sendSuccess } from '../utils/response';

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().optional(),
});

const updateFcmTokenSchema = z.object({
  fcmToken: z.string().min(1),
});

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { rows } = await query<{
      id: string;
      phone: string;
      name: string;
      email: string | null;
      avatar_url: string | null;
      stripe_customer_id: string | null;
      is_active: boolean;
      created_at: Date;
    }>(
      `SELECT id, phone, name, email, avatar_url, stripe_customer_id, is_active, created_at
       FROM users WHERE id = $1`,
      [req.user!.id]
    );

    if (rows.length === 0) throw new NotFoundError('User not found');

    sendSuccess(res, {
      ...rows[0],
      role: req.user!.role,
      driverId: req.user!.driverId,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = updateProfileSchema.parse(req.body);

    if (Object.keys(input).length === 0) {
      throw new BadRequestError('No fields to update');
    }

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (input.name !== undefined) {
      setClauses.push(`name = $${paramIdx++}`);
      values.push(input.name);
    }
    if (input.email !== undefined) {
      setClauses.push(`email = $${paramIdx++}`);
      values.push(input.email);
    }
    if (input.avatarUrl !== undefined) {
      setClauses.push(`avatar_url = $${paramIdx++}`);
      values.push(input.avatarUrl);
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(req.user!.id);

    const { rows } = await query<{ id: string; name: string; email: string; avatar_url: string }>(
      `UPDATE users SET ${setClauses.join(', ')}
       WHERE id = $${paramIdx}
       RETURNING id, phone, name, email, avatar_url, updated_at`,
      values
    );

    if (rows.length === 0) throw new NotFoundError('User not found');

    sendSuccess(res, rows[0], 'Profile updated');
  } catch (error) {
    next(error);
  }
}

export async function updateFcmToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = updateFcmTokenSchema.parse(req.body);

    await query(
      `UPDATE users SET fcm_token = $1, updated_at = NOW() WHERE id = $2`,
      [input.fcmToken, req.user!.id]
    );

    // If user is also a driver, update driver's user record reference
    if (req.user!.driverId) {
      // FCM token is stored on user; drivers query via user join
    }

    sendSuccess(res, { updated: true }, 'FCM token updated');
  } catch (error) {
    next(error);
  }
}

export async function getRideHistory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const { rows, rowCount } = await query(
      `SELECT
         r.id, r.status, r.pickup_address, r.dropoff_address,
         r.passenger_price, r.final_price, r.distance_meters,
         r.scheduled_at, r.started_at, r.completed_at, r.cancelled_at,
         r.vehicle_type, r.created_at,
         u.name as driver_name, d.rating as driver_rating,
         d.vehicle_make, d.vehicle_model, d.vehicle_plate
       FROM rides r
       LEFT JOIN drivers d ON d.id = r.driver_id
       LEFT JOIN users u ON u.id = d.user_id
       WHERE r.passenger_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user!.id, limit, offset]
    );

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM rides WHERE passenger_id = $1`,
      [req.user!.id]
    );

    sendSuccess(res, rows, undefined, 200, {
      total: parseInt(countRows[0].count),
      limit,
      offset,
    });
  } catch (error) {
    next(error);
  }
}

export async function getUploadUrl(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { contentType, fileName } = req.query as { contentType: string; fileName: string };

    if (!contentType || !fileName) {
      throw new BadRequestError('contentType and fileName are required');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(contentType)) {
      throw new BadRequestError('Only JPEG, PNG, and WebP images are allowed');
    }

    const ext = contentType.split('/')[1];
    const key = `avatars/${req.user!.id}/${uuidv4()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
      ContentType: contentType,
      Metadata: {
        userId: req.user!.id,
        originalName: fileName,
      },
    });

    const presignedUrl = await getSignedUrl(s3, command, {
      expiresIn: env.AWS_S3_PRESIGNED_URL_EXPIRES,
    });

    const publicUrl = `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;

    sendSuccess(res, { presignedUrl, publicUrl, key });
  } catch (error) {
    next(error);
  }
}

export async function getNotificationPreferences(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { rows } = await query<{ fcm_token: string | null }>(
      `SELECT fcm_token FROM users WHERE id = $1`,
      [req.user!.id]
    );

    if (rows.length === 0) throw new NotFoundError('User not found');

    sendSuccess(res, {
      hasFcmToken: !!rows[0].fcm_token,
    });
  } catch (error) {
    next(error);
  }
}
