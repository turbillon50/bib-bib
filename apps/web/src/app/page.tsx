'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Car,
  DollarSign,
  Shield,
  Zap,
  Star,
  ChevronRight,
  MapPin,
  Clock,
  ArrowRight,
} from '@/components/icons';
import { SupportButton } from '@/components/SupportButton';
import { ThemeToggle } from '@/components/ThemeToggle';

const FEATURES = [
  {
    icon: DollarSign,
    title: 'Tú pones el precio',
    description:
      'Sin precios inflados. Tú propones, el repartidor acepta. Así de simple.',
    color: '#e85d04',
  },
  {
    icon: Shield,
    title: 'Tu seguridad primero',
    description:
      'Todos los repartidores verificados y calificados. Tu seguridad es lo más importante.',
    color: '#f4a100',
  },
  {
    icon: Zap,
    title: 'Ultra rápido',
    description:
      'Conexión en menos de 30 segundos. Sigue tu mandado en tiempo real.',
    color: '#F59E0B',
  },
  {
    icon: Clock,
    title: 'Programa tu mandado',
    description:
      'Planea con anticipación. Agenda hasta 7 días antes al precio que quieras.',
    color: '#EF4444',
  },
];

const STATS = [
  { value: '2M+', label: 'Clientes satisfechos' },
  { value: '50K+', label: 'Repartidores activos' },
  { value: '98%', label: 'Tasa de satisfacción' },
  { value: '30s', label: 'Tiempo promedio' },
];

const TESTIMONIALS = [
  {
    name: 'Sarah K.',
    role: 'Daily Commuter',
    text: 'I save 30% compared to other apps because I set my own price. Game changer!',
    rating: 5,
    avatar: 'SK',
  },
  {
    name: 'Marcus T.',
    role: 'Driver Partner',
    text: 'I choose which rides to accept. No mandatory surge, just fair pay every time.',
    rating: 5,
    avatar: 'MT',
  },
  {
    name: 'Priya R.',
    role: 'Weekend Rider',
    text: 'The dark app is gorgeous and the experience is so smooth. Love it!',
    rating: 5,
    avatar: 'PR',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -80]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* ─── Navbar ─── */}
      <nav className="safe-top sticky top-0 z-50 border-b border-white/[0.06] bg-surface/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#e85d04] to-[#f4a100] flex items-center justify-center">
              <Car size={16} className="text-white" />
            </div>
            <span className="text-xl font-black tracking-tight">Bib-Bib</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#drivers" className="hover:text-white transition-colors">For Drivers</a>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle className="hidden sm:inline-flex" />
            <Link
              href="/login"
              className="hidden px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="btn-gradient text-sm px-5 py-2 rounded-xl font-semibold"
            >
              Empieza ahora
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section ref={heroRef} className="relative flex min-h-[92svh] items-center justify-center overflow-hidden">
        <img
          src="/brand/hero.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,15,0.88),rgba(10,10,15,0.52),rgba(10,10,15,0.72))]" />

        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="relative z-10 mx-auto max-w-5xl px-4 pb-20 pt-20 text-center sm:px-6"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-[#e85d04]/10 border border-[#e85d04]/30 rounded-full px-4 py-1.5 text-sm text-[#e85d04] font-medium mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-[#e85d04] animate-pulse" />
            Name your price ride-hailing
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mb-6 text-5xl font-black leading-[0.95] tracking-tight text-white sm:text-7xl lg:text-8xl"
          >
            Bib-Bib
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mx-auto mb-10 max-w-2xl text-xl leading-relaxed text-white/70 sm:text-2xl"
          >
            Propose your own fare. Drivers compete for your ride. No surge. No surprises. Just the ride you want, at the price you choose.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/register"
              className="btn-gradient flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-semibold w-full sm:w-auto justify-center"
            >
              Book a Ride <ArrowRight size={20} />
            </Link>
            <Link
              href="/demo?to=/app"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 px-8 py-4 text-lg font-semibold text-white transition-all hover:border-white/40 hover:bg-white/10 sm:w-auto"
            >
              Ver demo
            </Link>
            <Link
              href="/register?role=driver"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-semibold border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all w-full sm:w-auto justify-center text-white"
            >
              <Car size={20} /> Ser repartidor
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm"
          >
            <Link href="/demo?to=/driver" className="rounded-full border border-white/15 px-4 py-2 text-white/75 transition hover:bg-white/10 hover:text-white">
              Demo conductor
            </Link>
            <Link href="/demo?to=/admin" className="rounded-full border border-white/15 px-4 py-2 text-white/75 transition hover:bg-white/10 hover:text-white">
              Demo admin
            </Link>
          </motion.div>

          {/* Mock ride card */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-16 max-w-sm mx-auto"
          >
            <div className="card glass p-5 text-left rounded-3xl text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e85d04] to-[#f4a100] flex items-center justify-center text-sm font-bold">
                  JD
                </div>
                <div>
                  <div className="font-semibold text-sm">James D.</div>
                  <div className="flex items-center gap-1 text-xs text-yellow-400">
                    <Star size={10} fill="currentColor" />
                    <span className="text-white/50">4.97 · Toyota Camry</span>
                  </div>
                </div>
                <div className="ml-auto font-mono font-bold text-[#f4a100] text-xl">$12</div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-[#e85d04] mt-0.5 flex-shrink-0" />
                  <span className="text-white/70">123 Main St, Downtown</span>
                </div>
                <div className="w-px h-4 ml-[7px] border-l border-dashed border-white/20" />
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-[#f4a100] mt-0.5 flex-shrink-0" />
                  <span className="text-white/70">Airport Terminal B</span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-white/40">
                <Clock size={12} />
                <span>Arriving in 3 min</span>
                <span className="ml-auto text-[#22C55E] font-medium">● Accepted</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Stats ─── */}
      <section className="border-y border-white/[0.06] bg-surface py-16">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-4xl sm:text-5xl font-black gradient-text font-mono">{stat.value}</div>
              <div className="text-muted-foreground text-sm mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
          className="text-center mb-16"
        >
          <motion.div variants={itemVariants} className="text-[#e85d04] text-sm font-semibold uppercase tracking-widest mb-4">
            Why Bib-Bib
          </motion.div>
          <motion.h2 variants={itemVariants} className="text-4xl sm:text-5xl font-black mb-4">
            Rides on your terms
          </motion.h2>
          <motion.p variants={itemVariants} className="text-white/50 text-lg max-w-xl mx-auto">
            We built a rideshare that actually works for passengers and drivers.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={containerVariants}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {FEATURES.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              whileHover={{ y: -4, scale: 1.01 }}
              className="card card-interactive p-6 rounded-2xl"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: `${feature.color}20` }}
              >
                <feature.icon size={24} style={{ color: feature.color }} />
              </div>
              <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-24 bg-[#111118]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="text-center mb-16"
          >
            <motion.div variants={itemVariants} className="text-[#f4a100] text-sm font-semibold uppercase tracking-widest mb-4">
              Simple process
            </motion.div>
            <motion.h2 variants={itemVariants} className="text-4xl sm:text-5xl font-black">
              How it works
            </motion.h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Enter Your Route',
                desc: 'Set your pickup and drop-off location. See estimated distance and duration.',
              },
              {
                step: '02',
                title: 'Tú pones el precio',
                desc: 'Slide to propose your fare. See how competitive your price is in real-time.',
              },
              {
                step: '03',
                title: 'Get Offers',
                desc: 'Nearby drivers see your trip and send offers. Accept the best one.',
              },
            ].map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative"
              >
                <div className="text-7xl font-black gradient-text opacity-20 font-mono mb-4">{step.step}</div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-white/50 leading-relaxed">{step.desc}</p>
                {i < 2 && (
                  <ChevronRight
                    size={24}
                    className="hidden md:block absolute top-8 -right-4 text-white/20"
                  />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── App & Driver Preview ─── */}
      <section id="drivers" className="bg-background py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="overflow-hidden rounded-3xl border border-white/10 bg-surface"
          >
            <img src="/brand/app.jpg" alt="Bib-Bib passenger app" className="h-72 w-full object-cover sm:h-96" />
            <div className="p-6">
              <h2 className="text-2xl font-black">Passenger control, premium flow</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Set pickup, destination, payment method and your price from a focused ride request surface.
              </p>
              <Link href="/demo?to=/app" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                Ver demo usuario <ArrowRight size={16} />
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="overflow-hidden rounded-3xl border border-white/10 bg-surface"
          >
            <img src="/brand/driver.jpg" alt="Bib-Bib driver experience" className="h-72 w-full object-cover sm:h-96" />
            <div className="p-6">
              <h2 className="text-2xl font-black">Drivers choose the work that pays</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Drivers stay in control with live requests, counter-offers, subscription status and earnings.
              </p>
              <Link href="/demo?to=/driver" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-secondary">
                Demo conductor <ArrowRight size={16} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          className="text-center mb-16"
        >
          <motion.div variants={itemVariants} className="text-[#e85d04] text-sm font-semibold uppercase tracking-widest mb-4">
            Testimonials
          </motion.div>
          <motion.h2 variants={itemVariants} className="text-4xl sm:text-5xl font-black">
            What people say
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          className="grid md:grid-cols-3 gap-6"
        >
          {TESTIMONIALS.map((t) => (
            <motion.div
              key={t.name}
              variants={itemVariants}
              whileHover={{ y: -4 }}
              className="card p-6 rounded-2xl"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} size={14} className="text-yellow-400" fill="currentColor" />
                ))}
              </div>
              <p className="text-white/70 text-sm leading-relaxed mb-6">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#e85d04] to-[#f4a100] flex items-center justify-center text-xs font-bold">
                  {t.avatar}
                </div>
                <div>
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-white/40 text-xs">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── CTA Banner ─── */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl p-12"
            style={{
              background: 'linear-gradient(135deg, rgba(232,93,4,0.2), rgba(244,161,0,0.2))',
              border: '1px solid rgba(232,93,4,0.3)',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#e85d04]/10 to-[#f4a100]/10" />
            <div className="relative z-10">
              <h2 className="text-4xl sm:text-5xl font-black mb-4">
                Ready to ride smarter?
              </h2>
              <p className="text-white/60 text-lg mb-8">
                Join 2 million+ riders who set their own price.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/register"
                  className="btn-gradient flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-semibold justify-center"
                >
                  Empieza ahora Free <ArrowRight size={20} />
                </Link>
                <Link
                  href="/demo?to=/admin"
                  className="flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-semibold border border-white/20 hover:bg-white/5 transition-all justify-center"
                >
                  Demo admin
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/[0.06] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#e85d04] to-[#f4a100] flex items-center justify-center">
              <Car size={13} className="text-white" />
            </div>
            <span className="font-black text-lg">Bib-Bib</span>
          </div>
          <div className="text-white/30 text-sm">
            © 2026 Bib-Bib. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-sm text-white/40">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Support</a>
          </div>
        </div>
      </footer>
      <ThemeToggle className="fixed bottom-24 left-4 z-[70] sm:hidden" />
      <SupportButton />
    </div>
  );
}
