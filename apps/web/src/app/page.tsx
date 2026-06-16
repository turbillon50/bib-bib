'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/sign-in');
    } else if (user.role === 'driver') {
      router.replace('/driver');
    } else {
      router.replace('/app');
    }
  }, [user, isLoading]);

  return (
    <div style={{
      minHeight: '100dvh', background: '#0f0500',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}
      >
        <img
          src="/brand/logo.jpg"
          alt="Bib-Bib"
          style={{ width: 96, height: 96, borderRadius: 24, objectFit: 'cover',
            boxShadow: '0 0 40px rgba(232,93,4,0.5)' }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              style={{ width: 8, height: 8, borderRadius: 4, background: '#e85d04' }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
