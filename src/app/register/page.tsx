'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
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
            <h1 className="text-2xl font-bold text-[#eaecef]">Create Account</h1>
            <p className="text-[#848e9c] mt-2">Start trading in minutes</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 rounded-lg bg-[#f6465d]/10 border border-[#f6465d]/30 text-[#f6465d] text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm text-[#848e9c] mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-[#12171d] border border-[#2a3139] text-[#eaecef] placeholder-[#5e6673] focus:outline-none focus:border-[#0ecb81] transition-colors"
                placeholder="satoshi"
                required
              />
            </div>

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

            <div>
              <label className="block text-sm text-[#848e9c] mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center text-[#848e9c]">
            Already have an account?{' '}
            <Link href="/login" className="text-[#0ecb81] hover:underline">
              Sign in
            </Link>
          </div>

          <div className="mt-6 text-center text-xs text-[#5e6673]">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </div>
        </div>
      </div>
    </div>
  );
}
