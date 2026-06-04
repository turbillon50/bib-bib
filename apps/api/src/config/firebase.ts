import * as admin from 'firebase-admin';
import { env } from './env';
import { logger } from '../utils/logger';

let firebaseApp: admin.app.App | null = null;

/**
 * Whether Firebase Admin credentials are configured.
 * Push notifications are disabled when env vars are missing.
 */
export function isFirebaseConfigured(): boolean {
  return Boolean(
    env.FIREBASE_PROJECT_ID &&
    env.FIREBASE_CLIENT_EMAIL &&
    env.FIREBASE_PRIVATE_KEY
  );
}

export function initializeFirebase(): admin.app.App | null {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (!isFirebaseConfigured()) {
    logger.warn(
      'Firebase Admin not configured (FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY missing). Push notifications disabled.'
    );
    return null;
  }

  const privateKey = (env.FIREBASE_PRIVATE_KEY as string).replace(/\\n/g, '\n');

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID as string,
      privateKey,
      clientEmail: env.FIREBASE_CLIENT_EMAIL as string,
    }),
  });

  logger.info('Firebase Admin SDK initialized');
  return firebaseApp;
}

export function getFirebaseApp(): admin.app.App | null {
  if (!firebaseApp) {
    return initializeFirebase();
  }
  return firebaseApp;
}

export function getMessaging(): admin.messaging.Messaging | null {
  const app = getFirebaseApp();
  return app ? app.messaging() : null;
}

export default admin;
