'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Clock, Star, Banknote, CreditCard } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { api } from '@/lib/api';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Trip {
  id: string;
  origin_address: string;
  destination_address: string;
  final_price: number | null;
  proposed_price: number;
  status: string;
  payment_method: string;
  created_at: string;
}

export default function HistoryPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/rides?page=1').then(res => setTrips(res.data?.data ?? [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0F] pb-24">
      <div className="safe-top px-4 pt-4 pb-4 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-3">
          <Link href="/app" className="text-[#8B8B9E] hover:text-white transition-colors">
            <ArrowLeft size={22} />
          </Link>
          <h1 className="font-black text-xl">Mis Viajes</h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))
        ) : trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <MapPin size={40} className="text-[#4A4A5A] mb-3" />
            <p className="text-[#8B8B9E]">No tienes viajes registrados</p>
            <Link href="/app" className="mt-4 text-sm text-[#6C63FF]">Pedir mi primer viaje</Link>
          </div>
        ) : (
          trips.map((trip, i) => (
            <motion.div
              key={trip.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-[#111118] border border-[rgba(255,255,255,0.06)] rounded-2xl p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-[#6C63FF] flex-shrink-0" />
                    <span className="text-[#8B8B9E] truncate">{trip.origin_address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin size={9} className="text-[#00D4AA] flex-shrink-0" />
                    <span className="text-[#8B8B9E] truncate">{trip.destination_address}</span>
                  </div>
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <div className="font-mono font-bold text-[#6C63FF]">
                    ${(trip.final_price ?? trip.proposed_price).toFixed(2)}
                  </div>
                  <div className={`text-xs mt-0.5 ${trip.status === 'completed' ? 'text-[#2ED573]' : 'text-[#FF4757]'}`}>
                    {trip.status === 'completed' ? 'Completado' : 'Cancelado'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#4A4A5A]">
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {formatDistanceToNow(new Date(trip.created_at), { addSuffix: true, locale: es })}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  {trip.payment_method === 'cash' ? <Banknote size={11} /> : <CreditCard size={11} />}
                  {trip.payment_method === 'cash' ? 'Efectivo' : 'Tarjeta'}
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <BottomNav role="passenger" />
    </div>
  );
}
