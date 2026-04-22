'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { MapPin, Eye, EyeOff, Car, User, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

type Role = 'passenger' | 'driver';

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [role, setRole] = useState<Role>((params.get('role') as Role) || 'passenger');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();

  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', email: '', password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({ name: `${form.firstName} ${form.lastName}`.trim(), phone: form.phone, email: form.email, password: form.password, role });
      router.push(role === 'driver' ? '/driver' : '/app');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-[#6C63FF] opacity-[0.05] blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        <Link href="/" className="flex items-center gap-2 justify-center mb-10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#00D4AA] flex items-center justify-center">
            <MapPin size={16} className="text-white" />
          </div>
          <span className="font-black text-2xl text-white">RideMe</span>
        </Link>

        <div className="bg-[#111118] border border-[rgba(255,255,255,0.06)] rounded-3xl p-6 mb-6">
          <p className="text-sm text-[#8B8B9E] mb-4 text-center">Quiero registrarme como:</p>
          <div className="grid grid-cols-2 gap-3">
            {([['passenger', User, 'Pasajero'], ['driver', Car, 'Chofer']] as const).map(([r, Icon, label]) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  role === r
                    ? 'border-[#6C63FF] bg-[rgba(108,99,255,0.1)]'
                    : 'border-[rgba(255,255,255,0.06)] hover:border-[rgba(108,99,255,0.3)]'
                }`}
              >
                <Icon size={24} className={role === r ? 'text-[#6C63FF]' : 'text-[#8B8B9E]'} />
                <span className={`font-semibold text-sm ${role === r ? 'text-white' : 'text-[#8B8B9E]'}`}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#111118] border border-[rgba(255,255,255,0.06)] rounded-3xl p-6">
          <h2 className="text-xl font-bold mb-6 text-center">Crear cuenta</h2>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 p-3 rounded-xl bg-[rgba(255,71,87,0.1)] border border-[rgba(255,71,87,0.3)] text-[#FF4757] text-sm text-center">
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[['firstName', 'Nombre'], ['lastName', 'Apellido']].map(([name, label]) => (
                <div key={name}>
                  <label className="block text-xs text-[#8B8B9E] mb-1.5 font-medium">{label}</label>
                  <input
                    name={name} value={form[name as keyof typeof form]} onChange={handleChange}
                    required placeholder={label}
                    className="w-full bg-[#1A1A24] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-white placeholder-[#4A4A5A] focus:border-[#6C63FF] focus:outline-none transition-colors"
                  />
                </div>
              ))}
            </div>

            {[
              { name: 'phone', label: 'Teléfono', type: 'tel', placeholder: '+52 55 0000 0000' },
              { name: 'email', label: 'Email (opcional)', type: 'email', placeholder: 'tu@email.com' },
            ].map(({ name, label, type, placeholder }) => (
              <div key={name}>
                <label className="block text-xs text-[#8B8B9E] mb-1.5 font-medium">{label}</label>
                <input
                  name={name} value={form[name as keyof typeof form]} onChange={handleChange}
                  type={type} placeholder={placeholder}
                  required={name !== 'email'}
                  className="w-full bg-[#1A1A24] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-white placeholder-[#4A4A5A] focus:border-[#6C63FF] focus:outline-none transition-colors"
                />
              </div>
            ))}

            <div>
              <label className="block text-xs text-[#8B8B9E] mb-1.5 font-medium">Contraseña</label>
              <div className="relative">
                <input
                  name="password" value={form.password} onChange={handleChange}
                  type={showPwd ? 'text' : 'password'} placeholder="Mínimo 8 caracteres"
                  required minLength={8}
                  className="w-full bg-[#1A1A24] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder-[#4A4A5A] focus:border-[#6C63FF] focus:outline-none transition-colors"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B8B9E] hover:text-white p-1">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>{role === 'driver' ? 'Continuar registro' : 'Crear mi cuenta'} <ArrowRight size={16} /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#8B8B9E] mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-[#6C63FF] hover:text-[#7B72FF] font-medium transition-colors">
            Iniciar sesión
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0F]" />}>
      <RegisterForm />
    </Suspense>
  );
}
