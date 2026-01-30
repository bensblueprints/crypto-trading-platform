'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/store/useStore';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser, setWallets, logout, isLoading, setLoading } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setUser(data.user);
        setWallets(data.user.wallets || []);
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, setUser, setWallets, setLoading]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    logout();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0e11]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0ecb81] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#848e9c]">Loading...</p>
        </div>
      </div>
    );
  }

  const ADMIN_EMAILS = ['admin@cryptotrade.com', 'ben@justfeatured.com'];
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: '📊' },
    { href: '/dashboard/trade', label: 'Trade', icon: '📈' },
    { href: '/dashboard/bots', label: 'Bots', icon: '🤖' },
    { href: '/dashboard/wallet', label: 'Wallet', icon: '💼' },
    { href: '/dashboard/history', label: 'History', icon: '📜' },
    ...(isAdmin ? [{ href: '/dashboard/admin', label: 'Admin', icon: '⚙️' }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#0b0e11]">
      <header className="sticky top-0 z-50 border-b border-[#2a3139] bg-[#0b0e11]/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-xl font-bold bg-gradient-to-r from-[#0ecb81] to-[#1e80ff] bg-clip-text text-transparent">
              CryptoTrade
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-[#1a1f27] text-[#0ecb81]'
                      : 'text-[#848e9c] hover:text-[#eaecef] hover:bg-[#12171d]'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <div className="text-sm text-[#eaecef]">{user?.username}</div>
              <div className="text-xs text-[#848e9c]">{user?.email}</div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-[#f6465d] hover:bg-[#f6465d]/10 rounded-lg transition-colors"
            >
              Logout
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#848e9c] hover:text-[#eaecef]"
            >
              ☰
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-[#2a3139] p-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'bg-[#1a1f27] text-[#0ecb81]'
                    : 'text-[#848e9c] hover:text-[#eaecef] hover:bg-[#12171d]'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
