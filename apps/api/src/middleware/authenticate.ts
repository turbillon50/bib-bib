import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@clerk/backend';
import { env } from '../config/env';
import { verifyAccessToken } from '../services/auth.service';
import { getUserByClerkId } from '../services/auth.service';
import { UnauthorizedError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface AuthUser {
  id: string;
  email: string;
  clerkId: string;
  role: 'passenger' | 'driver' | 'admin';
  driverId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);

    // First try to verify with Clerk
    try {
      const decoded = await verifyToken(token, {
        secretKey: env.CLERK_SECRET_KEY,
      });

      if (!decoded.sub) {
        throw new UnauthorizedError('Invalid token: missing sub claim');
      }

      // Get user from database using Clerk ID
      const user = await getUserByClerkId(decoded.sub);
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      req.user = {
        id: user.id as string,
        email: user.email as string,
        clerkId: decoded.sub,
        role: user.role as AuthUser['role'],
        ...(user.driverId ? { driverId: user.driverId as string } : {}),
      };

      next();
      return;
    } catch (clerkError) {
      logger.debug('Clerk token verification failed, trying JWT fallback', {
        error: (clerkError as Error).message,
      });
    }

    // Fallback to JWT verification (for backward compatibility)
    const payload = verifyAccessToken(token);

    req.user = {
      id: payload.sub as string,
      email: payload.email as string,
      clerkId: payload.clerkId as string,
      role: payload.role as AuthUser['role'],
      ...(payload.driverId ? { driverId: payload.driverId as string } : {}),
    };

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      next(new UnauthorizedError('Invalid or expired token'));
    }
  }
}

export function requireDriver(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'driver') {
    next(new UnauthorizedError('Driver access required'));
    return;
  }
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    next(new UnauthorizedError('Admin access required'));
    return;
  }
  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const payload = verifyAccessToken(token);
      req.user = {
        id: payload.sub as string,
        phone: payload.phone as string,
        role: payload.role as AuthUser['role'],
        ...(payload.driverId ? { driverId: payload.driverId as string } : {}),
      };
    }
  } catch {
    // ignore errors for optional auth
  }
  next();
}
