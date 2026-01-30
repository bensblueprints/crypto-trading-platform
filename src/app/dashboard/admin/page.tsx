'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AdminStats {
  revenue: {
    totalFees: number;
    depositFees: number;
    withdrawalFees: number;
    tradingFees: number;
  };
  volume: {
    totalDeposits: number;
    totalWithdrawals: number;
    totalTradeVolume: number;
  };
  counts: {
    deposits: number;
    withdrawals: number;
    trades: number;
    pendingDeposits: number;
    pendingWithdrawals: number;
  };
  users: {
    total: number;
    withBalance: number;
  };
  recent: {
    transactions: Array<{
      id: string;
      type: string;
      currency: string;
      amount: number;
      fee: number;
      status: string;
      user: string;
      createdAt: string;
    }>;
    trades: Array<{
      id: string;
      pair: string;
      type: string;
      amount: number;
      price: number;
      total: number;
      fee: number;
      status: string;
      user: string;
      createdAt: string;
    }>;
  };
}

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/stats');
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        if (res.status === 403) {
          setError('Admin access required');
          return;
        }
        if (!res.ok) {
          throw new Error('Failed to fetch stats');
        }
        const data = await res.json();
        setStats(data);
      } catch (err) {
        setError('Failed to load admin stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[#848e9c]">Loading admin stats...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[#f6465d]">{error}</div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#eaecef]">Admin Dashboard</h1>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-6">
          <div className="text-sm text-[#848e9c] mb-1">Total Revenue</div>
          <div className="text-3xl font-bold text-[#0ecb81]">
            ${stats.revenue.totalFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-[#848e9c] mt-2">All platform fees collected</div>
        </div>

        <div className="glass-panel p-6">
          <div className="text-sm text-[#848e9c] mb-1">Deposit Fees (1%)</div>
          <div className="text-2xl font-bold text-[#eaecef]">
            ${stats.revenue.depositFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-[#848e9c] mt-2">{stats.counts.deposits} deposits</div>
        </div>

        <div className="glass-panel p-6">
          <div className="text-sm text-[#848e9c] mb-1">Withdrawal Fees (0.5%)</div>
          <div className="text-2xl font-bold text-[#eaecef]">
            ${stats.revenue.withdrawalFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-[#848e9c] mt-2">{stats.counts.withdrawals} withdrawals</div>
        </div>

        <div className="glass-panel p-6">
          <div className="text-sm text-[#848e9c] mb-1">Trading Fees (0.1%)</div>
          <div className="text-2xl font-bold text-[#eaecef]">
            ${stats.revenue.tradingFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-[#848e9c] mt-2">{stats.counts.trades} trades</div>
        </div>
      </div>

      {/* Volume & Users */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="glass-panel p-6">
          <div className="text-sm text-[#848e9c] mb-1">Total Deposit Volume</div>
          <div className="text-xl font-bold text-[#eaecef]">
            ${stats.volume.totalDeposits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="text-sm text-[#848e9c] mb-1">Total Trade Volume</div>
          <div className="text-xl font-bold text-[#eaecef]">
            ${stats.volume.totalTradeVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="text-sm text-[#848e9c] mb-1">Total Users</div>
          <div className="text-xl font-bold text-[#eaecef]">
            {stats.users.total}
          </div>
          <div className="text-xs text-[#848e9c] mt-2">{stats.users.withBalance} with balance</div>
        </div>
      </div>

      {/* Pending */}
      {(stats.counts.pendingDeposits > 0 || stats.counts.pendingWithdrawals > 0) && (
        <div className="glass-panel p-4 border-l-4 border-[#f0b90b]">
          <div className="flex gap-6">
            {stats.counts.pendingDeposits > 0 && (
              <div>
                <span className="text-[#f0b90b] font-medium">{stats.counts.pendingDeposits}</span>
                <span className="text-[#848e9c] ml-2">pending deposits</span>
              </div>
            )}
            {stats.counts.pendingWithdrawals > 0 && (
              <div>
                <span className="text-[#f0b90b] font-medium">{stats.counts.pendingWithdrawals}</span>
                <span className="text-[#848e9c] ml-2">pending withdrawals</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="glass-panel p-4">
          <h2 className="text-lg font-semibold text-[#eaecef] mb-4">Recent Transactions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#848e9c] border-b border-[#2a3139]">
                  <th className="text-left py-2">Type</th>
                  <th className="text-left py-2">User</th>
                  <th className="text-right py-2">Amount</th>
                  <th className="text-right py-2">Fee</th>
                  <th className="text-right py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-[#2a3139]/50">
                    <td className="py-2">
                      <span className={tx.type === 'DEPOSIT' ? 'text-[#0ecb81]' : 'text-[#f6465d]'}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-2 text-[#848e9c]">{tx.user}</td>
                    <td className="py-2 text-right text-[#eaecef]">
                      {tx.amount.toFixed(4)} {tx.currency}
                    </td>
                    <td className="py-2 text-right text-[#0ecb81]">
                      ${tx.fee.toFixed(2)}
                    </td>
                    <td className="py-2 text-right">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        tx.status === 'COMPLETED' ? 'bg-[#0ecb81]/10 text-[#0ecb81]' :
                        tx.status === 'PENDING' ? 'bg-[#f0b90b]/10 text-[#f0b90b]' :
                        'bg-[#f6465d]/10 text-[#f6465d]'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stats.recent.transactions.length === 0 && (
              <div className="text-center py-4 text-[#848e9c]">No transactions yet</div>
            )}
          </div>
        </div>

        {/* Recent Trades */}
        <div className="glass-panel p-4">
          <h2 className="text-lg font-semibold text-[#eaecef] mb-4">Recent Trades</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#848e9c] border-b border-[#2a3139]">
                  <th className="text-left py-2">Pair</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-right py-2">Total</th>
                  <th className="text-right py-2">Fee</th>
                  <th className="text-right py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.trades.map((trade) => (
                  <tr key={trade.id} className="border-b border-[#2a3139]/50">
                    <td className="py-2 text-[#eaecef]">{trade.pair}</td>
                    <td className="py-2">
                      <span className={trade.type === 'BUY' ? 'text-[#0ecb81]' : 'text-[#f6465d]'}>
                        {trade.type}
                      </span>
                    </td>
                    <td className="py-2 text-right text-[#eaecef]">
                      ${trade.total.toFixed(2)}
                    </td>
                    <td className="py-2 text-right text-[#0ecb81]">
                      ${trade.fee.toFixed(2)}
                    </td>
                    <td className="py-2 text-right">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        trade.status === 'FILLED' ? 'bg-[#0ecb81]/10 text-[#0ecb81]' :
                        trade.status === 'PENDING' ? 'bg-[#f0b90b]/10 text-[#f0b90b]' :
                        'bg-[#f6465d]/10 text-[#f6465d]'
                      }`}>
                        {trade.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stats.recent.trades.length === 0 && (
              <div className="text-center py-4 text-[#848e9c]">No trades yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
