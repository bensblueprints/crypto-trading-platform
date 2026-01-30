'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 grid-pattern">
      <div className="w-full max-w-md">
        <div className="glass-panel p-8">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block mb-6">
              <span className="text-2xl font-bold bg-gradient-to-r from-[#0ecb81] to-[#1e80ff] bg-clip-text text-transparent">
                CryptoTrade
              </span>
            </Link>
            <h1 className="text-2xl font-bold text-[#eaecef]">Welcome Back</h1>
            <p className="text-[#848e9c] mt-2">Sign in to access your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 rounded-lg bg-[#f6465d]/10 border border-[#f6465d]/30 text-[#f6465d] text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm text-[#848e9c] mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-[#12171d] border border-[#2a3139] text-[#eaecef] placeholder-[#5e6673] focus:outline-none focus:border-[#0ecb81] transition-colors"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-[#848e9c] mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-[#12171d] border border-[#2a3139] text-[#eaecef] placeholder-[#5e6673] focus:outline-none focus:border-[#0ecb81] transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-[#0b0e11] font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center text-[#848e9c]">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-[#0ecb81] hover:underline">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
