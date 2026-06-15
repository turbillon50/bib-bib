'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Car, Mail, Lock, Loader2 } from '@/components/icons';
import { useAuthStore } from '@/store/authStore';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setServerError('');
    try {
      await login(data.email, data.password);
      const user = useAuthStore.getState().user;
      if (user?.role === 'driver') {
        router.push('/driver');
      } else {
        router.push('/app');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setServerError(error?.response?.data?.message || 'Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center relative overflow-hidden">
      {/* Animated gradient orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-[#6C63FF] blur-[120px] pointer-events-none"
      />
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-[#00D4AA] blur-[120px] pointer-events-none"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md mx-auto px-4"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6C63FF] to-[#00D4AA] flex items-center justify-center shadow-[0_0_30px_rgba(108,99,255,0.4)]">
              <Car size={28} className="text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight">Bib-Bib</span>
          </Link>
          <h1 className="text-3xl font-black mt-6 mb-2">Welcome back</h1>
          <p className="text-white/50">Sign in to your account to continue</p>
        </div>

        {/* Form Card */}
        <div className="card glass rounded-3xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Email address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="input-dark w-full pl-11 pr-4 py-3.5 text-sm"
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-xs mt-1.5">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-white/70">Password</label>
                <Link href="/forgot-password" className="text-xs text-[#6C63FF] hover:text-[#00D4AA] transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="input-dark w-full pl-11 pr-12 py-3.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1.5">{errors.password.message}</p>
              )}
            </div>

            {/* Server Error */}
            {serverError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm"
              >
                {serverError}
              </motion.div>
            )}

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileTap={{ scale: 0.98 }}
              className="btn-gradient w-full py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 divider" />
            <span className="text-white/30 text-xs">or</span>
            <div className="flex-1 divider" />
          </div>

          {/* Demo accounts */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onSubmit({ email: 'passenger@demo.com', password: 'demo1234' })}
              className="py-2.5 px-3 rounded-xl border border-white/10 hover:border-[#6C63FF]/40 hover:bg-[#6C63FF]/5 transition-all text-xs text-white/60 hover:text-white"
            >
              Demo Passenger
            </button>
            <button
              type="button"
              onClick={() => onSubmit({ email: 'driver@demo.com', password: 'demo1234' })}
              className="py-2.5 px-3 rounded-xl border border-white/10 hover:border-[#00D4AA]/40 hover:bg-[#00D4AA]/5 transition-all text-xs text-white/60 hover:text-white"
            >
              Demo Driver
            </button>
          </div>
        </div>

        {/* Register link */}
        <p className="text-center text-white/40 text-sm mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-[#6C63FF] hover:text-[#00D4AA] transition-colors font-medium">
            Create one
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
