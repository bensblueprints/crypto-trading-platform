'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/store/useStore';

interface Price {
  pair: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

export default function DashboardPage() {
  const { wallets, setWallets } = useStore();
  const [prices, setPrices] = useState<Price[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [balanceRes, pricesRes] = await Promise.all([
          fetch('/api/wallet/balance'),
          fetch('/api/trade/prices'),
        ]);

        if (balanceRes.ok) {
          const balanceData = await balanceRes.json();
          setWallets(balanceData.wallets);
          setTotalBalance(balanceData.totalUSD);
        }

        if (pricesRes.ok) {
          const pricesData = await pricesRes.json();
          setPrices(pricesData.prices);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [setWallets]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number, decimals = 2) => {
    if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
    if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
    if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
    return value.toFixed(decimals);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#eaecef]">Dashboard</h1>
          <p className="text-[#848e9c]">Welcome back to your trading terminal</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/wallet"
            className="px-4 py-2 bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-[#0b0e11] font-medium rounded-lg transition-colors"
          >
            Deposit
          </Link>
          <Link
            href="/dashboard/trade"
            className="px-4 py-2 border border-[#2a3139] hover:border-[#848e9c] text-[#eaecef] font-medium rounded-lg transition-colors"
          >
            Trade Now
          </Link>
        </div>
      </div>

      <div className="glass-panel p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <div className="text-sm text-[#848e9c] mb-1">Total Portfolio Value</div>
            <div className="text-3xl font-bold text-[#eaecef]">{formatCurrency(totalBalance)}</div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#0ecb81]/10 text-[#0ecb81] text-sm">
            <span>↑</span>
            <span>+2.45% today</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {wallets.map((wallet) => (
            <div key={wallet.id} className="p-4 rounded-lg bg-[#12171d] border border-[#2a3139]">
              <div className="text-sm text-[#848e9c] mb-1">{wallet.currency}</div>
              <div className="text-lg font-bold text-[#eaecef]">
                {wallet.balance.toFixed(wallet.currency === 'USDT' ? 2 : 6)}
              </div>
              {wallet.lockedBalance > 0 && (
                <div className="text-xs text-[#f0b90b] mt-1">
                  Locked: {wallet.lockedBalance.toFixed(4)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel p-6">
        <h2 className="text-lg font-bold text-[#eaecef] mb-4">Market Overview</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-[#848e9c] border-b border-[#2a3139]">
                <th className="pb-3 font-medium">Pair</th>
                <th className="pb-3 font-medium text-right">Price</th>
                <th className="pb-3 font-medium text-right">24h Change</th>
                <th className="pb-3 font-medium text-right hidden sm:table-cell">24h High</th>
                <th className="pb-3 font-medium text-right hidden sm:table-cell">24h Low</th>
                <th className="pb-3 font-medium text-right hidden md:table-cell">Volume</th>
                <th className="pb-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {prices.map((price) => (
                <tr key={price.pair} className="border-b border-[#2a3139]/50 hover:bg-[#12171d] transition-colors">
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-[#1a1f27] flex items-center justify-center text-xs font-bold text-[#f0b90b]">
                        {price.pair.split('/')[0].slice(0, 2)}
                      </span>
                      <span className="font-medium text-[#eaecef]">{price.pair}</span>
                    </div>
                  </td>
                  <td className="py-4 text-right font-mono text-[#eaecef]">
                    ${price.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: price.price < 1 ? 4 : 2 })}
                  </td>
                  <td className={`py-4 text-right font-medium ${price.change24h >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                    {price.change24h >= 0 ? '+' : ''}{price.change24h.toFixed(2)}%
                  </td>
                  <td className="py-4 text-right text-[#848e9c] hidden sm:table-cell font-mono">
                    ${price.high24h.toLocaleString()}
                  </td>
                  <td className="py-4 text-right text-[#848e9c] hidden sm:table-cell font-mono">
                    ${price.low24h.toLocaleString()}
                  </td>
                  <td className="py-4 text-right text-[#848e9c] hidden md:table-cell">
                    ${formatNumber(price.volume24h)}
                  </td>
                  <td className="py-4 text-right">
                    <Link
                      href={`/dashboard/trade?pair=${price.pair}`}
                      className="px-3 py-1 text-sm bg-[#1a1f27] hover:bg-[#252b35] text-[#0ecb81] rounded transition-colors"
                    >
                      Trade
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-panel p-6">
          <h2 className="text-lg font-bold text-[#eaecef] mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/dashboard/wallet" className="p-4 rounded-lg bg-[#12171d] border border-[#2a3139] hover:border-[#0ecb81] transition-colors group">
              <div className="text-2xl mb-2">💰</div>
              <div className="font-medium text-[#eaecef] group-hover:text-[#0ecb81]">Deposit</div>
              <div className="text-sm text-[#848e9c]">Add funds</div>
            </Link>
            <Link href="/dashboard/wallet?tab=withdraw" className="p-4 rounded-lg bg-[#12171d] border border-[#2a3139] hover:border-[#f6465d] transition-colors group">
              <div className="text-2xl mb-2">📤</div>
              <div className="font-medium text-[#eaecef] group-hover:text-[#f6465d]">Withdraw</div>
              <div className="text-sm text-[#848e9c]">Cash out</div>
            </Link>
            <Link href="/dashboard/trade" className="p-4 rounded-lg bg-[#12171d] border border-[#2a3139] hover:border-[#1e80ff] transition-colors group">
              <div className="text-2xl mb-2">📈</div>
              <div className="font-medium text-[#eaecef] group-hover:text-[#1e80ff]">Spot Trade</div>
              <div className="text-sm text-[#848e9c]">Buy & Sell</div>
            </Link>
            <Link href="/dashboard/history" className="p-4 rounded-lg bg-[#12171d] border border-[#2a3139] hover:border-[#f0b90b] transition-colors group">
              <div className="text-2xl mb-2">📜</div>
              <div className="font-medium text-[#eaecef] group-hover:text-[#f0b90b]">History</div>
              <div className="text-sm text-[#848e9c]">View trades</div>
            </Link>
          </div>
        </div>

        <div className="glass-panel p-6">
          <h2 className="text-lg font-bold text-[#eaecef] mb-4">Platform Info</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-[#12171d]">
              <span className="text-[#848e9c]">Deposit Fee</span>
              <span className="text-[#0ecb81] font-medium">1%</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-[#12171d]">
              <span className="text-[#848e9c]">Withdrawal Fee</span>
              <span className="text-[#f0b90b] font-medium">0.5%</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-[#12171d]">
              <span className="text-[#848e9c]">Trading Fee</span>
              <span className="text-[#1e80ff] font-medium">0.1%</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-[#12171d]">
              <span className="text-[#848e9c]">Min Deposit</span>
              <span className="text-[#eaecef] font-medium">$10 USD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
