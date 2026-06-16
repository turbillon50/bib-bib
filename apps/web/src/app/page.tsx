'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading, initialize } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  // Esperar a que Zustand persist hidrate desde localStorage
  useEffect(() => {
    initialize();
    // Dar un tick para que persist cargue
    const t = setTimeout(() => setHydrated(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!hydrated || isLoading) return;
    if (!user) {
      router.replace('/login');
    } else if (user.role === 'driver') {
      router.replace('/driver');
    } else {
      router.replace('/app');
    }
  }, [hydrated, isLoading, user]);

  // Splash — logo + dots mientras carga
  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0f0500',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}
      >
        <img
          src="/brand/logo.jpg"
          alt="Bib-Bib"
          style={{
            width: 100, height: 100,
            borderRadius: 24,
            objectFit: 'cover',
            boxShadow: '0 0 48px rgba(232,93,4,0.55)',
          }}
        />
        <p style={{ color: 'rgba(255,220,180,0.5)', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' }}>
          Cargando...
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
              style={{ width: 8, height: 8, borderRadius: 4, background: '#e85d04' }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
