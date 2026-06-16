'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useGeolocation } from '@/hooks/useGeolocation';
import { BottomNav } from '@/components/layout/BottomNav';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// MapView solo en cliente — evita crash SSR
const MapView = dynamic(
  () => import('@/components/maps/MapView').then(m => m.MapView),
  { ssr: false, loading: () => (
    <div style={{ width:'100%', height:'100%', background:'#1a0800',
      display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:32, height:32, border:'2px solid rgba(232,93,4,0.3)',
        borderTop:'2px solid #e85d04', borderRadius:'50%',
        animation:'spin 1s linear infinite' }} />
    </div>
  )}
);

export default function HomePage() {
  const { user, initialize } = useAuthStore();
  const { location, requestPermission } = useGeolocation();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    initialize();
    requestPermission();
  }, []);

  const center = location
    ? { lat: location.latitude, lng: location.longitude }
    : { lat: 21.1619, lng: -86.8515 };

  const handlePedir = () => {
    if (user) router.push('/app');
    else setShowLoginPrompt(true);
  };

  if (!mounted) return (
    <div style={{ width:'100%', height:'100dvh', background:'#0f0500',
      display:'flex', alignItems:'center', justifyContent:'center' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:40, height:40, border:'2px solid rgba(232,93,4,0.25)',
        borderTop:'2px solid #e85d04', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ width:'100%', height:'100dvh', position:'relative', overflow:'hidden', background:'#0f0500' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* MAPA LIBRE — sin login */}
      <MapView center={center}
        userLocation={location ? { lat: location.latitude, lng: location.longitude } : undefined}
        className="w-full h-full" />

      {/* Header flotante */}
      <motion.div initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }}
        transition={{ duration:0.3 }}
        style={{ position:'absolute', top:0, left:0, right:0,
          paddingTop:'env(safe-area-inset-top, 12px)', zIndex:20 }}>
        <div style={{ margin:'8px 12px 0',
          background:'rgba(15,5,0,0.88)', backdropFilter:'blur(20px)',
          borderRadius:16, padding:'8px 14px',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          border:'1px solid rgba(232,93,4,0.2)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <img src="/brand/logo.jpg" alt="Bib-Bib"
              style={{ width:34, height:34, borderRadius:8, objectFit:'cover' }} />
            <div>
              <p style={{ fontSize:14, fontWeight:900, color:'#fff8f0', margin:0, lineHeight:1 }}>Bib-Bib</p>
              <p style={{ fontSize:10, color:'rgba(255,220,180,0.5)', margin:0 }}>Servicio a domicilio</p>
            </div>
          </div>
          {user ? (
            <Link href="/app/profile" style={{ background:'rgba(232,93,4,0.15)',
              border:'1px solid rgba(232,93,4,0.3)', borderRadius:10, padding:'6px 12px',
              color:'#e85d04', fontSize:12, fontWeight:700, textDecoration:'none' }}>
              Mi cuenta
            </Link>
          ) : (
            <div style={{ display:'flex', gap:8 }}>
              <Link href="/login" style={{ border:'1px solid rgba(232,93,4,0.3)',
                borderRadius:10, padding:'6px 12px', color:'rgba(255,220,180,0.7)',
                fontSize:12, fontWeight:600, textDecoration:'none', background:'transparent' }}>
                Entrar
              </Link>
              <Link href="/register" style={{ background:'linear-gradient(135deg,#e85d04,#f4a100)',
                borderRadius:10, padding:'6px 12px', color:'white',
                fontSize:12, fontWeight:700, textDecoration:'none',
                boxShadow:'0 2px 12px rgba(232,93,4,0.4)' }}>
                Registrarme
              </Link>
            </div>
          )}
        </div>
      </motion.div>

      {/* Bottom sheet */}
      <motion.div initial={{ opacity:0, y:40 }} animate={{ opacity:1, y:0 }}
        transition={{ duration:0.4, delay:0.2 }}
        style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:20,
          paddingBottom:'env(safe-area-inset-bottom, 0px)' }}>
        <div style={{ background:'rgba(15,5,0,0.94)', backdropFilter:'blur(24px)',
          borderTopLeftRadius:24, borderTopRightRadius:24,
          border:'1px solid rgba(232,93,4,0.15)', padding:'12px 16px 8px' }}>
          <div style={{ width:36, height:4, background:'rgba(232,93,4,0.3)',
            borderRadius:2, margin:'0 auto 14px' }} />

          {/* Barra búsqueda */}
          <motion.button whileTap={{ scale:0.97 }} onClick={handlePedir}
            style={{ width:'100%', background:'rgba(255,248,240,0.07)',
              border:'1.5px solid rgba(232,93,4,0.25)', borderRadius:14,
              padding:'12px 16px', display:'flex', alignItems:'center', gap:12,
              cursor:'pointer', textAlign:'left' }}>
            <div style={{ width:36, height:36, borderRadius:10, flexShrink:0,
              background:'linear-gradient(135deg,#e85d04,#f4a100)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
                strokeLinecap="round" width="18" height="18">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize:15, fontWeight:700, color:'#fff8f0', margin:0 }}>
                ¿A dónde va tu mandado?
              </p>
              <p style={{ fontSize:11, color:'rgba(255,220,180,0.4)', margin:'2px 0 0' }}>
                Toca para pedir
              </p>
            </div>
          </motion.button>

          {/* Accesos rápidos */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginTop:10 }}>
            {[{icon:'🛵',label:'Mandado'},{icon:'🛒',label:'Súper'},{icon:'🍔',label:'Comida'}].map(({icon,label}) => (
              <motion.button key={label} whileTap={{ scale:0.95 }} onClick={handlePedir}
                style={{ background:'rgba(255,248,240,0.04)',
                  border:'1px solid rgba(232,93,4,0.15)', borderRadius:12,
                  padding:'10px 8px', display:'flex', flexDirection:'column',
                  alignItems:'center', gap:4, cursor:'pointer' }}>
                <span style={{ fontSize:20 }}>{icon}</span>
                <span style={{ fontSize:11, color:'rgba(255,220,180,0.6)', fontWeight:600 }}>{label}</span>
              </motion.button>
            ))}
          </div>

          {/* Nav */}
          <BottomNav />
        </div>
      </motion.div>

      {/* Modal login */}
      <AnimatePresence>
        {showLoginPrompt && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={() => setShowLoginPrompt(false)}
            style={{ position:'fixed', inset:0, zIndex:50,
              background:'rgba(0,0,0,0.65)', backdropFilter:'blur(4px)',
              display:'flex', alignItems:'flex-end' }}>
            <motion.div initial={{ y:60 }} animate={{ y:0 }} exit={{ y:60 }}
              onClick={e => e.stopPropagation()}
              style={{ width:'100%', background:'#1a0800',
                borderTopLeftRadius:24, borderTopRightRadius:24,
                padding:'20px 20px 40px',
                border:'1px solid rgba(232,93,4,0.2)' }}>
              <div style={{ width:36, height:4, background:'rgba(232,93,4,0.3)',
                borderRadius:2, margin:'0 auto 18px' }} />
              <img src="/brand/logo.jpg" alt=""
                style={{ width:52, height:52, borderRadius:12, objectFit:'cover',
                  display:'block', margin:'0 auto 12px' }} />
              <h3 style={{ textAlign:'center', fontSize:20, fontWeight:900,
                color:'#fff8f0', margin:'0 0 6px' }}>¡Casi listo!</h3>
              <p style={{ textAlign:'center', fontSize:13,
                color:'rgba(255,220,180,0.5)', margin:'0 0 22px' }}>
                Crea tu cuenta gratis para pedir tu primer mandado
              </p>
              <Link href="/register" style={{ display:'block', padding:'14px',
                background:'linear-gradient(135deg,#e85d04,#f4a100)',
                borderRadius:14, textAlign:'center', color:'white',
                fontSize:15, fontWeight:700, textDecoration:'none',
                boxSizing:'border-box', boxShadow:'0 4px 20px rgba(232,93,4,0.4)' }}>
                Crear cuenta gratis
              </Link>
              <Link href="/login" style={{ display:'block', textAlign:'center',
                marginTop:12, color:'rgba(255,220,180,0.5)',
                fontSize:13, textDecoration:'none' }}>
                Ya tengo cuenta — Entrar
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
