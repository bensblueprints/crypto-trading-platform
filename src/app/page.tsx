'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) router.push('/dashboard');
      })
      .catch(() => {});
  }, [router]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 grid-pattern relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0ecb81]/5 via-transparent to-[#1e80ff]/5" />

      <div className="relative z-10 text-center max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#2a3139] bg-[#12171d] text-[#848e9c] text-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-[#0ecb81] animate-pulse" />
            Live Trading Platform
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
          <span className="text-[#eaecef]">Trade Crypto</span>
          <br />
          <span className="bg-gradient-to-r from-[#0ecb81] to-[#1e80ff] bg-clip-text text-transparent">
            Like a Pro
          </span>
        </h1>

        <p className="text-lg md:text-xl text-[#848e9c] mb-12 max-w-2xl mx-auto leading-relaxed">
          Fast deposits, instant trading, and secure withdrawals.
          Your gateway to the crypto markets with only 1% platform fee.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/register"
            className="px-8 py-4 bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-[#0b0e11] font-bold rounded-lg transition-all duration-200 hover:scale-105 neon-glow-green"
          >
            Start Trading
          </Link>
          <Link
            href="/login"
            className="px-8 py-4 border border-[#2a3139] hover:border-[#848e9c] text-[#eaecef] font-medium rounded-lg transition-all duration-200 hover:bg-[#1a1f27]"
          >
            Sign In
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { label: 'Trading Volume', value: '$1.2B+' },
            { label: 'Active Traders', value: '50K+' },
            { label: 'Crypto Pairs', value: '100+' },
            { label: 'Uptime', value: '99.9%' },
          ].map((stat) => (
            <div key={stat.label} className="glass-panel p-6">
              <div className="text-2xl md:text-3xl font-bold text-[#0ecb81] mb-2">{stat.value}</div>
              <div className="text-sm text-[#848e9c]">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-20 glass-panel p-8">
          <h2 className="text-2xl font-bold mb-6 text-[#eaecef]">Why Choose Us?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '⚡', title: 'Lightning Fast', desc: 'Execute trades in milliseconds' },
              { icon: '🔒', title: 'Bank-Grade Security', desc: 'Your assets are always safe' },
              { icon: '💰', title: 'Low Fees', desc: 'Only 1% on deposits, 0.1% trading' },
            ].map((feature) => (
              <div key={feature.title} className="text-left p-4 rounded-lg bg-[#12171d] border border-[#2a3139]">
                <div className="text-3xl mb-3">{feature.icon}</div>
                <div className="font-bold text-[#eaecef] mb-2">{feature.title}</div>
                <div className="text-sm text-[#848e9c]">{feature.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="absolute bottom-8 text-center text-[#5e6673] text-sm">
        &copy; 2024 CryptoTrade. All rights reserved.
      </footer>
    </div>
  );
}
