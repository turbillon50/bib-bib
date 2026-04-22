'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, DollarSign, X, Check, ChevronRight } from 'lucide-react';

interface IncomingRide {
  rideId: string;
  originAddress: string;
  destinationAddress: string;
  proposedPrice: number;
  currency: string;
  expiresAt: string;
  distanceMeters?: number;
}

interface IncomingOfferModalProps {
  ride: IncomingRide | null;
  onAccept: (rideId: string, price: number) => void;
  onCounter: (rideId: string, price: number) => void;
  onReject: (rideId: string) => void;
}

export function IncomingOfferModal({ ride, onAccept, onCounter, onReject }: IncomingOfferModalProps) {
  const [timeLeft, setTimeLeft] = useState(30);
  const [showCounter, setShowCounter] = useState(false);
  const [counterPrice, setCounterPrice] = useState('');

  useEffect(() => {
    if (!ride) return;
    const expiry = new Date(ride.expiresAt).getTime();
    const total = expiry - Date.now();
    setTimeLeft(Math.max(0, Math.ceil(total / 1000)));
    setShowCounter(false);
    setCounterPrice(ride.proposedPrice.toString());

    const interval = setInterval(() => {
      const remaining = Math.ceil((expiry - Date.now()) / 1000);
      setTimeLeft(Math.max(0, remaining));
      if (remaining <= 0) clearInterval(interval);
    }, 500);

    return () => clearInterval(interval);
  }, [ride?.rideId]);

  const progress = Math.min(timeLeft / 30, 1);
  const circumference = 2 * Math.PI * 36;
  const distanceKm = ride?.distanceMeters ? (ride.distanceMeters / 1000).toFixed(1) : null;

  return (
    <AnimatePresence>
      {ride && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 bg-[rgba(0,0,0,0.7)] backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: '100%', scale: 0.95 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: '100%', scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="w-full max-w-md bg-[#111118] border border-[rgba(255,255,255,0.1)] rounded-3xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[rgba(108,99,255,0.2)] to-[rgba(0,212,170,0.1)] px-5 pt-5 pb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-[#6C63FF] uppercase tracking-wider">Nueva solicitud</span>
                <div className="relative w-12 h-12">
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(108,99,255,0.2)" strokeWidth="6" />
                    <motion.circle
                      cx="40" cy="40" r="36" fill="none"
                      stroke={timeLeft < 10 ? '#FF4757' : '#6C63FF'}
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference * (1 - progress)}
                      transition={{ duration: 0.5 }}
                    />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center text-sm font-black ${timeLeft < 10 ? 'text-[#FF4757]' : 'text-white'}`}>
                    {timeLeft}
                  </span>
                </div>
              </div>
              <div className="text-2xl font-black font-mono bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] bg-clip-text text-transparent">
                ${ride.proposedPrice.toFixed(2)} {ride.currency}
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Route */}
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-[rgba(108,99,255,0.2)] flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-[#6C63FF]" />
                  </div>
                  <div>
                    <div className="text-xs text-[#8B8B9E] font-medium">Recogida</div>
                    <div className="text-sm font-medium leading-tight">{ride.originAddress}</div>
                  </div>
                </div>
                <div className="ml-2.5 w-0.5 h-4 bg-[rgba(255,255,255,0.1)]" />
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-[rgba(0,212,170,0.2)] flex items-center justify-center flex-shrink-0">
                    <MapPin size={11} className="text-[#00D4AA]" />
                  </div>
                  <div>
                    <div className="text-xs text-[#8B8B9E] font-medium">Destino</div>
                    <div className="text-sm font-medium leading-tight">{ride.destinationAddress}</div>
                  </div>
                </div>
              </div>

              {distanceKm && (
                <div className="flex items-center gap-2 text-xs text-[#8B8B9E] px-3 py-2 bg-[#1A1A24] rounded-xl">
                  <Clock size={13} /> Distancia aproximada: {distanceKm} km
                </div>
              )}

              {/* Counter offer form */}
              <AnimatePresence>
                {showCounter && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[#8B8B9E] font-mono text-lg">$</span>
                      <input
                        type="number" value={counterPrice}
                        onChange={e => setCounterPrice(e.target.value)}
                        className="flex-1 bg-[#1A1A24] border border-[rgba(108,99,255,0.3)] rounded-xl px-4 py-2.5 text-white font-mono text-lg font-bold focus:outline-none focus:border-[#6C63FF]"
                        placeholder="Tu precio"
                        step="0.50"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Buttons */}
              <div className="flex gap-2">
                <button onClick={() => onReject(ride.rideId)} className="p-3 rounded-xl border border-[rgba(255,71,87,0.3)] text-[#FF4757] hover:bg-[rgba(255,71,87,0.1)] transition-colors">
                  <X size={18} />
                </button>
                <button
                  onClick={() => setShowCounter(!showCounter)}
                  className="flex-1 py-3 rounded-xl border border-[rgba(255,165,2,0.3)] text-[#FFA502] hover:bg-[rgba(255,165,2,0.08)] transition-colors text-sm font-semibold"
                >
                  {showCounter ? 'Cancelar' : 'Contra-oferta'}
                </button>
                <button
                  onClick={() => {
                    const price = showCounter ? parseFloat(counterPrice) : ride.proposedPrice;
                    if (showCounter) onCounter(ride.rideId, price);
                    else onAccept(ride.rideId, price);
                  }}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] font-bold text-sm flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                >
                  <Check size={16} />
                  {showCounter ? `Ofrecer $${counterPrice}` : 'Aceptar'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
