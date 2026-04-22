import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  registerUser,
  loginWithPassword,
  loginWithOtp,
  refreshTokens,
  logout,
  generateOtp,
  changePassword,
} from '../services/auth.service';
import { sendOtpSms } from '../services/notification.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { BadRequestError } from '../utils/errors';

const registerSchema = z.object({
  phone: z.string().min(7).max(20),
  name: z.string().min(2).max(100),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
});

const loginSchema = z.object({
  phone: z.string().min(7).max(20),
  password: z.string().min(1),
});

const otpSendSchema = z.object({
  phone: z.string().min(7).max(20),
});

const otpVerifySchema = z.object({
  phone: z.string().min(7).max(20),
  code: z.string().length(6),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = registerSchema.parse(req.body);
    const { user, tokens } = await registerUser(input);
    sendCreated(res, { user, tokens }, 'Registration successful');
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = loginSchema.parse(req.body);
    const { user, tokens } = await loginWithPassword(input.phone, input.password);
    sendSuccess(res, { user, tokens }, 'Login successful');
  } catch (error) {
    next(error);
  }
}

export async function sendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = otpSendSchema.parse(req.body);
    const { code, expiresAt } = await generateOtp(input.phone);

    // Send SMS
    await sendOtpSms(input.phone, code);

    sendSuccess(
      res,
      { expiresAt, message: 'OTP sent via SMS' },
      'OTP sent successfully'
    );
  } catch (error) {
    next(error);
  }
}

export async function verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = otpVerifySchema.parse(req.body);
    const { user, tokens, isNew } = await loginWithOtp(input.phone, input.code);

    if (isNew) {
      sendCreated(res, { user, tokens, isNew }, 'Account created and logged in');
    } else {
      sendSuccess(res, { user, tokens, isNew }, 'OTP verified, logged in');
    }
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = refreshSchema.parse(req.body);
    const tokens = await refreshTokens(input.refreshToken);
    sendSuccess(res, tokens, 'Tokens refreshed');
  } catch (error) {
    next(error);
  }
}

export async function logoutHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new BadRequestError('Not authenticated');
    await logout(req.user.id);
    sendSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
}

export async function changePasswordHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) throw new BadRequestError('Not authenticated');
    const input = changePasswordSchema.parse(req.body);
    await changePassword(req.user.id, input.currentPassword, input.newPassword);
    sendSuccess(res, null, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
}
