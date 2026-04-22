import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { json, raw } from 'express';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/users.routes';
import driverRoutes from './routes/drivers.routes';
import rideRoutes from './routes/rides.routes';
import offerRoutes from './routes/offers.routes';
import paymentRoutes from './routes/payments.routes';
import subscriptionRoutes from './routes/subscriptions.routes';
import webhookRoutes from './routes/webhooks.routes';
import notificationRoutes from './routes/notifications.routes';

export const app = express();

app.set('trust proxy', 1);

// CORS
app.use(cors({
  origin: env.CORS_ORIGINS.split(',').map(o => o.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Security headers
app.use(helmet({ crossOriginEmbedderPolicy: false }));

// Logging
app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));

// Stripe webhook needs raw body BEFORE json() middleware
app.use('/api/v1/webhooks/stripe', raw({ type: 'application/json' }));

// JSON parsing for all other routes
app.use(json({ limit: '10mb' }));

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/drivers', driverRoutes);
app.use('/api/v1/rides', rideRoutes);
app.use('/api/v1/offers', offerRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// 404
app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Global error handler
app.use(errorHandler);
