import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/auth.service';
import { UnauthorizedError } from '../utils/errors';

export interface AuthUser {
  id: string;
  phone: string;
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

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    req.user = {
      id: payload.sub as string,
      phone: payload.phone as string,
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
