'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';

const loginSchema = z.object({
  email: z.string().email('Ingresa un correo válido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

// SVG inline — sin Lucide
const IconMail = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
  </svg>
);
const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const IconEyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const IconSpin = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setServerError('');
    try {
      await login(data.email, data.password);
      const user = useAuthStore.getState().user;
      if (user?.role === 'driver') router.push('/driver');
      else router.push('/app');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setServerError(error?.response?.data?.message || 'Correo o contraseña incorrectos');
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(160deg, #fff8f0 0%, #fff0d8 50%, #ffe4c0 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: 400 }}
      >
        {/* Logo real */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <img
              src="/brand/logo.jpg"
              alt="Bib-Bib"
              style={{ width: 80, height: 80, borderRadius: 20, objectFit: 'cover',
                boxShadow: '0 8px 32px rgba(232,93,4,0.35)' }}
            />
            <span style={{ fontSize: 22, fontWeight: 900, color: '#3d1000', letterSpacing: -0.5 }}>Bib-Bib</span>
          </Link>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#1a0800', margin: '12px 0 4px', letterSpacing: -0.5 }}>
            Bienvenido de nuevo
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(61,16,0,0.55)', margin: 0 }}>
            Inicia sesión para continuar
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px)',
          borderRadius: 24,
          padding: '28px 24px',
          boxShadow: '0 8px 40px rgba(107,26,26,0.12), 0 2px 8px rgba(107,26,26,0.06)',
          border: '1px solid rgba(232,93,4,0.12)',
        }}>
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(61,16,0,0.7)', marginBottom: 6 }}>
                Correo electrónico
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(61,16,0,0.35)' }}>
                  <IconMail />
                </span>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="tu@correo.com"
                  autoComplete="email"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    paddingLeft: 40, paddingRight: 14, paddingTop: 12, paddingBottom: 12,
                    fontSize: 14, borderRadius: 12,
                    border: errors.email ? '1.5px solid #ef4444' : '1.5px solid rgba(232,93,4,0.2)',
                    background: 'rgba(255,248,240,0.8)',
                    color: '#1a0800', outline: 'none',
                    transition: 'border 150ms',
                  }}
                />
              </div>
              {errors.email && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'rgba(61,16,0,0.7)' }}>Contraseña</label>
                <Link href="/forgot-password" style={{ fontSize: 12, color: '#e85d04', textDecoration: 'none' }}>
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(61,16,0,0.35)' }}>
                  <IconLock />
                </span>
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    paddingLeft: 40, paddingRight: 44, paddingTop: 12, paddingBottom: 12,
                    fontSize: 14, borderRadius: 12,
                    border: errors.password ? '1.5px solid #ef4444' : '1.5px solid rgba(232,93,4,0.2)',
                    background: 'rgba(255,248,240,0.8)',
                    color: '#1a0800', outline: 'none',
                  }}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(61,16,0,0.4)', padding: 0 }}>
                  {showPassword ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
              {errors.password && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.password.message}</p>}
            </div>

            {/* Error servidor */}
            {serverError && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 10, padding: '10px 14px', color: '#dc2626', fontSize: 13 }}>
                {serverError}
              </motion.div>
            )}

            {/* Botón entrar */}
            <motion.button
              type="submit" disabled={isLoading} whileTap={{ scale: 0.97 }}
              style={{
                width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                background: 'linear-gradient(135deg, #e85d04, #f4a100)',
                color: 'white', fontSize: 15, fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                boxShadow: '0 4px 20px rgba(232,93,4,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {isLoading ? <><IconSpin /> Entrando...</> : 'Entrar'}
            </motion.button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(232,93,4,0.15)' }} />
            <span style={{ fontSize: 12, color: 'rgba(61,16,0,0.35)' }}>o prueba la demo</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(232,93,4,0.15)' }} />
          </div>

          {/* Demo buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: '👤 Demo Cliente', email: 'passenger@demo.com' },
              { label: '🛵 Demo Repartidor', email: 'driver@demo.com' },
            ].map(({ label, email }) => (
              <motion.button key={email} whileTap={{ scale: 0.96 }}
                type="button"
                onClick={() => onSubmit({ email, password: 'demo1234' })}
                style={{
                  padding: '10px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                  border: '1.5px solid rgba(232,93,4,0.25)',
                  background: 'rgba(232,93,4,0.06)',
                  color: '#6b2200', cursor: 'pointer',
                }}>
                {label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Registro */}
        <p style={{ textAlign: 'center', color: 'rgba(61,16,0,0.5)', fontSize: 14, marginTop: 20 }}>
          ¿No tienes cuenta?{' '}
          <Link href="/register" style={{ color: '#e85d04', fontWeight: 700, textDecoration: 'none' }}>
            Regístrate
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
