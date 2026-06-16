'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useGeolocation } from '@/hooks/useGeolocation';
import { MapView } from '@/components/maps/MapView';
import { BottomNav } from '@/components/layout/BottomNav';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { user, initialize } = useAuthStore();
  const { location, requestLocation } = useGeolocation();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const router = useRouter();

  useEffect(() => { initialize(); }, []);
  useEffect(() => { requestLocation(); }, []);

  const center = location
    ? { lat: location.latitude, lng: location.longitude }
    : { lat: 21.1619, lng: -86.8515 }; // Cancun default

  const handlePedirMandado = () => {
    if (user) {
      router.push('/app');
    } else {
      setShowLoginPrompt(true);
    }
  };

  return (
    <div style={{ width: '100%', height: '100dvh', position: 'relative', overflow: 'hidden', background: '#0f0500' }}>

      {/* MAPA A FULL — visible sin login */}
      <MapView
        center={center}
        userLocation={location ? { lat: location.latitude, lng: location.longitude } : undefined}
        className="w-full h-full"
      />

      {/* Header flotante con logo */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          paddingTop: 'env(safe-area-inset-top, 12px)',
          zIndex: 20,
        }}
      >
        <div style={{
          margin: '8px 12px 0',
          background: 'rgba(15,5,0,0.88)',
          backdropFilter: 'blur(20px)',
          borderRadius: 16,
          padding: '8px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          border: '1px solid rgba(232,93,4,0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/brand/logo.jpg" alt="Bib-Bib"
              style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover' }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 900, color: '#fff8f0', margin: 0, lineHeight: 1 }}>Bib-Bib</p>
              <p style={{ fontSize: 10, color: 'rgba(255,220,180,0.5)', margin: 0, letterSpacing: 0.5 }}>Servicio a domicilio</p>
            </div>
          </div>
          {user ? (
            <Link href="/app/profile" style={{
              background: 'rgba(232,93,4,0.15)', border: '1px solid rgba(232,93,4,0.3)',
              borderRadius: 10, padding: '6px 12px', color: '#e85d04',
              fontSize: 12, fontWeight: 700, textDecoration: 'none',
            }}>
              Mi cuenta
            </Link>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <Link href="/login" style={{
                background: 'transparent', border: '1px solid rgba(232,93,4,0.3)',
                borderRadius: 10, padding: '6px 12px', color: 'rgba(255,220,180,0.7)',
                fontSize: 12, fontWeight: 600, textDecoration: 'none',
              }}>
                Entrar
              </Link>
              <Link href="/register" style={{
                background: 'linear-gradient(135deg, #e85d04, #f4a100)',
                borderRadius: 10, padding: '6px 12px', color: 'white',
                fontSize: 12, fontWeight: 700, textDecoration: 'none',
                boxShadow: '0 2px 12px rgba(232,93,4,0.4)',
              }}>
                Registrarme
              </Link>
            </div>
          )}
        </div>
      </motion.div>

      {/* Bottom Sheet — pedir mandado */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          zIndex: 20,
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
        }}
      >
        <div style={{
          background: 'rgba(15,5,0,0.94)',
          backdropFilter: 'blur(24px)',
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          border: '1px solid rgba(232,93,4,0.15)',
          padding: '16px 16px 8px',
        }}>
          {/* Handle */}
          <div style={{
            width: 36, height: 4, background: 'rgba(232,93,4,0.3)',
            borderRadius: 2, margin: '0 auto 16px',
          }} />

          {/* Search bar estilo Uber/Airbnb */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handlePedirMandado}
            style={{
              width: '100%', background: 'rgba(255,248,240,0.08)',
              border: '1.5px solid rgba(232,93,4,0.25)',
              borderRadius: 14, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #e85d04, #f4a100)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" width="18" height="18">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#fff8f0', margin: 0 }}>¿A dónde va tu mandado?</p>
              <p style={{ fontSize: 12, color: 'rgba(255,220,180,0.45)', margin: '2px 0 0' }}>Toca para pedir</p>
            </div>
          </motion.button>

          {/* Quick actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
            {[
              { icon: '🛵', label: 'Mandado', href: '/app' },
              { icon: '🛒', label: 'Súper', href: '/app' },
              { icon: '🍔', label: 'Comida', href: '/app' },
            ].map(({ icon, label, href }) => (
              <motion.button
                key={label} whileTap={{ scale: 0.95 }}
                onClick={() => user ? router.push(href) : setShowLoginPrompt(true)}
                style={{
                  background: 'rgba(255,248,240,0.05)',
                  border: '1px solid rgba(232,93,4,0.18)',
                  borderRadius: 12, padding: '10px 8px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 20 }}>{icon}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,220,180,0.65)', fontWeight: 600 }}>{label}</span>
              </motion.button>
            ))}
          </div>

          {/* Bottom nav */}
          <div style={{ marginTop: 8 }}>
            <BottomNav />
          </div>
        </div>
      </motion.div>

      {/* Modal prompt login — solo cuando intentan pedir */}
      <AnimatePresence>
        {showLoginPrompt && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowLoginPrompt(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 50,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'flex-end',
            }}
          >
            <motion.div
              initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', background: '#1a0800',
                borderTopLeftRadius: 24, borderTopRightRadius: 24,
                padding: '24px 20px 40px',
                border: '1px solid rgba(232,93,4,0.2)',
              }}
            >
              <div style={{ width: 36, height: 4, background: 'rgba(232,93,4,0.3)', borderRadius: 2, margin: '0 auto 20px' }} />
              <img src="/brand/logo.jpg" alt="" style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'cover', display: 'block', margin: '0 auto 12px' }} />
              <h3 style={{ textAlign: 'center', fontSize: 20, fontWeight: 900, color: '#fff8f0', margin: '0 0 6px' }}>
                ¡Casi listo!
              </h3>
              <p style={{ textAlign: 'center', fontSize: 14, color: 'rgba(255,220,180,0.55)', margin: '0 0 24px' }}>
                Crea tu cuenta gratis para pedir tu primer mandado
              </p>
              <Link href="/register" style={{
                display: 'block', width: '100%', padding: '14px',
                background: 'linear-gradient(135deg, #e85d04, #f4a100)',
                borderRadius: 14, textAlign: 'center',
                color: 'white', fontSize: 15, fontWeight: 700,
                textDecoration: 'none', boxSizing: 'border-box',
                boxShadow: '0 4px 20px rgba(232,93,4,0.4)',
              }}>
                Crear cuenta gratis
              </Link>
              <Link href="/login" style={{
                display: 'block', textAlign: 'center', marginTop: 14,
                color: 'rgba(255,220,180,0.55)', fontSize: 14, textDecoration: 'none',
              }}>
                Ya tengo cuenta — Entrar
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
