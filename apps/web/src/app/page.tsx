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

const FEATURES = [
  {
    icon: DollarSign,
    title: 'Name Your Price',
    description:
      'Set your own fare. No surge pricing, no guessing. Drivers see your offer and decide.',
    color: '#6C63FF',
  },
  {
    icon: Shield,
    title: 'Safety First',
    description:
      'All drivers verified, background-checked, and rated. Your safety is our priority.',
    color: '#00D4AA',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description:
      'Matches in under 30 seconds. Real-time tracking from pickup to drop-off.',
    color: '#F59E0B',
  },
  {
    icon: Clock,
    title: 'Schedule Rides',
    description:
      'Plan ahead. Schedule rides up to 7 days in advance at your preferred price.',
    color: '#EF4444',
  },
];

const STATS = [
  { value: '2M+', label: 'Happy Riders' },
  { value: '50K+', label: 'Active Drivers' },
  { value: '98%', label: 'Satisfaction Rate' },
  { value: '30s', label: 'Avg Match Time' },
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
    <div className="min-h-screen bg-[#0A0A0F] text-white overflow-x-hidden">
      {/* ─── Navbar ─── */}
      <nav className="safe-top fixed top-0 left-0 right-0 z-50 glass border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#00D4AA] flex items-center justify-center">
              <Car size={16} className="text-white" />
            </div>
            <span className="text-xl font-black tracking-tight">RideMe</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#drivers" className="hover:text-white transition-colors">For Drivers</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-white/70 hover:text-white transition-colors px-4 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="btn-gradient text-sm px-5 py-2 rounded-xl font-semibold"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background gradients */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-[#6C63FF]/10 blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-[#00D4AA]/10 blur-[80px]" />
        </div>

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center pt-24 pb-20"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-[#6C63FF]/10 border border-[#6C63FF]/30 rounded-full px-4 py-1.5 text-sm text-[#6C63FF] font-medium mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-[#6C63FF] animate-pulse" />
            Now live in 50+ cities
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl sm:text-7xl lg:text-8xl font-black leading-[0.95] tracking-tight mb-6"
          >
            You Set the{' '}
            <span className="gradient-text">Price.</span>
            <br />
            We Handle the{' '}
            <span className="gradient-text">Rest.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-xl sm:text-2xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed"
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
              href="/register?role=driver"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-semibold border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all w-full sm:w-auto justify-center"
            >
              <Car size={20} /> Become a Driver
            </Link>
          </motion.div>

          {/* Mock ride card */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-16 max-w-sm mx-auto"
          >
            <div className="card glass p-5 text-left rounded-3xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#00D4AA] flex items-center justify-center text-sm font-bold">
                  JD
                </div>
                <div>
                  <div className="font-semibold text-sm">James D.</div>
                  <div className="flex items-center gap-1 text-xs text-yellow-400">
                    <Star size={10} fill="currentColor" />
                    <span className="text-white/50">4.97 · Toyota Camry</span>
                  </div>
                </div>
                <div className="ml-auto font-mono font-bold text-[#00D4AA] text-xl">$12</div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-[#6C63FF] mt-0.5 flex-shrink-0" />
                  <span className="text-white/70">123 Main St, Downtown</span>
                </div>
                <div className="w-px h-4 ml-[7px] border-l border-dashed border-white/20" />
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-[#00D4AA] mt-0.5 flex-shrink-0" />
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
      <section className="py-16 border-y border-white/[0.06] bg-[#111118]">
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
              <div className="text-white/50 text-sm mt-1">{stat.label}</div>
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
          <motion.div variants={itemVariants} className="text-[#6C63FF] text-sm font-semibold uppercase tracking-widest mb-4">
            Why RideMe
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
            <motion.div variants={itemVariants} className="text-[#00D4AA] text-sm font-semibold uppercase tracking-widest mb-4">
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
                title: 'Name Your Price',
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

      {/* ─── Testimonials ─── */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          className="text-center mb-16"
        >
          <motion.div variants={itemVariants} className="text-[#6C63FF] text-sm font-semibold uppercase tracking-widest mb-4">
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
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#00D4AA] flex items-center justify-center text-xs font-bold">
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
              background: 'linear-gradient(135deg, rgba(108,99,255,0.2), rgba(0,212,170,0.2))',
              border: '1px solid rgba(108,99,255,0.3)',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#6C63FF]/10 to-[#00D4AA]/10" />
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
                  Get Started Free <ArrowRight size={20} />
                </Link>
                <Link
                  href="/login"
                  className="flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-semibold border border-white/20 hover:bg-white/5 transition-all justify-center"
                >
                  Sign In
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
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6C63FF] to-[#00D4AA] flex items-center justify-center">
              <Car size={13} className="text-white" />
            </div>
            <span className="font-black text-lg">RideMe</span>
          </div>
          <div className="text-white/30 text-sm">
            © 2026 RideMe. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-sm text-white/40">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
