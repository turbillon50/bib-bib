import { neon } from '@neondatabase/serverless';
import { Resend } from 'resend';

type Sql = ReturnType<typeof neon>;

let supportSql: Sql | null = null;
let resendClient: Resend | null = null;

export function getSupportDb(): Sql {
  const url = process.env.SUPPORT_DATABASE_URL;
  if (!url) throw new Error('SUPPORT_DATABASE_URL is not set');
  if (!supportSql) supportSql = neon(url);
  return supportSql;
}

export function getOptionalResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!resendClient) resendClient = new Resend(key);
  return resendClient;
}

export function supportFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || 'RideMe <no-reply@rideme.ink>';
}

export function supportAdminEmail(): string | null {
  return (
    process.env.SUPPORT_ADMIN_EMAIL ||
    process.env.ADMIN_EMAILS?.split(',').map((email) => email.trim()).find(Boolean) ||
    null
  );
}

export function isEmail(value: string | null | undefined): value is string {
  return !!value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
