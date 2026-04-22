'use client';

import { motion } from 'framer-motion';

interface OnlineToggleProps {
  isOnline: boolean;
  onToggle: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function OnlineToggle({ isOnline, onToggle, loading, disabled }: OnlineToggleProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={onToggle}
        disabled={loading || disabled}
        className={`relative w-20 h-20 rounded-full border-4 transition-all duration-500 flex items-center justify-center ${
          isOnline
            ? 'border-[#2ED573] bg-[rgba(46,213,115,0.15)] shadow-[0_0_30px_rgba(46,213,115,0.4)]'
            : 'border-[rgba(255,255,255,0.15)] bg-[#1A1A24]'
        } disabled:opacity-50`}
      >
        {loading ? (
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <motion.div
            animate={{ scale: isOnline ? [1, 1.1, 1] : 1 }}
            transition={{ repeat: isOnline ? Infinity : 0, duration: 2 }}
            className={`w-8 h-8 rounded-full ${isOnline ? 'bg-[#2ED573]' : 'bg-[#4A4A5A]'}`}
          />
        )}

        {/* Pulse rings */}
        {isOnline && !loading && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-[#2ED573]"
              animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-[#2ED573]"
              animate={{ scale: [1, 1.8], opacity: [0.3, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeOut', delay: 0.5 }}
            />
          </>
        )}
      </button>

      <div className="text-center">
        <span className={`font-bold text-sm ${isOnline ? 'text-[#2ED573]' : 'text-[#8B8B9E]'}`}>
          {loading ? 'Actualizando...' : isOnline ? 'En línea' : 'Fuera de línea'}
        </span>
        {!isOnline && !loading && (
          <p className="text-xs text-[#4A4A5A] mt-0.5">Toca para recibir viajes</p>
        )}
      </div>
    </div>
  );
}
