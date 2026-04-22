'use client';

import { motion } from 'framer-motion';
import { Star, Clock, Check, X } from 'lucide-react';

interface Offer {
  id: string;
  offeredPrice: number;
  offerType: 'accept' | 'counter';
  driverEtaSeconds?: number;
  driver?: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    ratingAverage: number;
    totalTrips: number;
    vehicle?: { make: string; model: string; color: string; plateNumber: string };
  };
}

interface OfferCardProps {
  offer: Offer;
  index: number;
  onAccept: (offerId: string) => void;
  onReject: (offerId: string) => void;
  loading?: boolean;
}

export function OfferCard({ offer, index, onAccept, onReject, loading }: OfferCardProps) {
  const d = offer.driver;
  const initials = d ? `${d.firstName[0]}${d.lastName[0]}` : '?';
  const etaMin = offer.driverEtaSeconds ? Math.ceil(offer.driverEtaSeconds / 60) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 400, damping: 30 }}
      className="bg-[#111118] border border-[rgba(255,255,255,0.08)] rounded-2xl p-4 hover:border-[rgba(108,99,255,0.3)] transition-colors"
    >
      <div className="flex items-center gap-3 mb-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6C63FF] to-[#00D4AA] flex items-center justify-center font-bold text-white flex-shrink-0">
          {d?.avatarUrl ? (
            <img src={d.avatarUrl} alt="" className="w-full h-full rounded-2xl object-cover" />
          ) : initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">
            {d ? `${d.firstName} ${d.lastName}` : 'Chofer'}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1 text-xs text-[#8B8B9E]">
              <Star size={11} className="text-[#FFD700] fill-[#FFD700]" />
              {d?.ratingAverage?.toFixed(1) ?? '5.0'}
            </span>
            <span className="text-[#4A4A5A]">·</span>
            <span className="text-xs text-[#8B8B9E]">{d?.totalTrips ?? 0} viajes</span>
          </div>
        </div>

        {/* Price */}
        <div className="text-right">
          <div className="text-xl font-black font-mono bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] bg-clip-text text-transparent">
            ${offer.offeredPrice.toFixed(2)}
          </div>
          {offer.offerType === 'counter' && (
            <span className="text-xs text-[#FFD700] font-medium">Contra-oferta</span>
          )}
        </div>
      </div>

      {/* Vehicle info */}
      {d?.vehicle && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-[#1A1A24] rounded-xl">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getColorDot(d.vehicle.color) }} />
          <span className="text-xs text-[#8B8B9E]">
            {d.vehicle.make} {d.vehicle.model} · {d.vehicle.color} · {d.vehicle.plateNumber}
          </span>
        </div>
      )}

      {/* ETA + Actions */}
      <div className="flex items-center gap-3">
        {etaMin && (
          <div className="flex items-center gap-1.5 text-xs text-[#8B8B9E]">
            <Clock size={13} />
            <span>{etaMin} min</span>
          </div>
        )}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => onReject(offer.id)}
            disabled={loading}
            className="p-2.5 rounded-xl border border-[rgba(255,71,87,0.3)] text-[#FF4757] hover:bg-[rgba(255,71,87,0.1)] transition-colors disabled:opacity-50"
          >
            <X size={16} />
          </button>
          <button
            onClick={() => onAccept(offer.id)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Check size={16} /> Aceptar
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function getColorDot(color: string): string {
  const map: Record<string, string> = {
    blanco: '#FFFFFF', negro: '#1A1A1A', gris: '#888', rojo: '#FF4757',
    azul: '#6C63FF', verde: '#2ED573', amarillo: '#FFD700', naranja: '#FFA502',
  };
  return map[color.toLowerCase()] ?? '#8B8B9E';
}
