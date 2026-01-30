'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface PlatformSettings {
  tradingMode: 'SIMULATED' | 'REAL';
  binanceApiKey: string | null;
  binanceConfigured: boolean;
  depositFee: number;
  withdrawalFee: number;
  tradingFee: number;
}

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
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingsTab, setSettingsTab] = useState<'overview' | 'settings'>('overview');
  const [binanceKey, setBinanceKey] = useState('');
  const [binanceSecret, setBinanceSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const toggleTradingMode = async () => {
    if (!settings) return;

    const newMode = settings.tradingMode === 'SIMULATED' ? 'REAL' : 'SIMULATED';

    if (newMode === 'REAL' && !settings.binanceConfigured) {
      alert('Please configure Binance API credentials first');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradingMode: newMode }),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update trading mode');
      }
    } catch (err) {
      alert('Failed to update trading mode');
    } finally {
      setSaving(false);
    }
  };

  const saveBinanceCredentials = async () => {
    if (!binanceKey || !binanceSecret) {
      alert('Please enter both API key and secret');
      return;
    }

    setSaving(true);
    setTestResult(null);

    try {
      // First test the connection
      const testRes = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ binanceApiKey: binanceKey, binanceSecret }),
      });

      const testData = await testRes.json();

      if (!testData.success) {
        setTestResult({ success: false, message: testData.error });
        setSaving(false);
        return;
      }

      // If test passed, save credentials
      const saveRes = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ binanceApiKey: binanceKey, binanceSecret }),
      });

      if (saveRes.ok) {
        const data = await saveRes.json();
        setSettings(data.settings);
        setTestResult({ success: true, message: 'Binance API configured successfully!' });
        setBinanceKey('');
        setBinanceSecret('');
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Failed to save credentials' });
    } finally {
      setSaving(false);
    }
  };

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
    fetchSettings();
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#eaecef]">Admin Dashboard</h1>

        {/* Tab Navigation */}
        <div className="flex gap-2">
          <button
            onClick={() => setSettingsTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              settingsTab === 'overview'
                ? 'bg-[#f0b90b] text-[#181a20]'
                : 'bg-[#2a3139] text-[#848e9c] hover:text-[#eaecef]'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setSettingsTab('settings')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              settingsTab === 'settings'
                ? 'bg-[#f0b90b] text-[#181a20]'
                : 'bg-[#2a3139] text-[#848e9c] hover:text-[#eaecef]'
            }`}
          >
            Settings
          </button>
        </div>
      </div>

      {/* Settings Tab */}
      {settingsTab === 'settings' && (
        <div className="space-y-6">
          {/* Trading Mode */}
          <div className="glass-panel p-6">
            <h2 className="text-lg font-semibold text-[#eaecef] mb-4">Trading Mode</h2>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[#eaecef] font-medium">
                  Current Mode: {' '}
                  <span className={settings?.tradingMode === 'REAL' ? 'text-[#0ecb81]' : 'text-[#f0b90b]'}>
                    {settings?.tradingMode || 'SIMULATED'}
                  </span>
                </div>
                <div className="text-sm text-[#848e9c] mt-1">
                  {settings?.tradingMode === 'REAL'
                    ? 'Real trades are being executed on Binance'
                    : 'Trades are simulated internally - no real exchange orders'}
                </div>
              </div>
              <button
                onClick={toggleTradingMode}
                disabled={saving}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  settings?.tradingMode === 'REAL'
                    ? 'bg-[#f6465d] hover:bg-[#f6465d]/80 text-white'
                    : 'bg-[#0ecb81] hover:bg-[#0ecb81]/80 text-white'
                } disabled:opacity-50`}
              >
                {saving ? 'Switching...' : settings?.tradingMode === 'REAL' ? 'Switch to Simulated' : 'Enable Real Trading'}
              </button>
            </div>

            {settings?.tradingMode === 'REAL' && (
              <div className="mt-4 p-3 bg-[#f6465d]/10 border border-[#f6465d]/30 rounded-lg">
                <div className="text-[#f6465d] font-medium">Warning: Real Trading Active</div>
                <div className="text-sm text-[#848e9c]">
                  All trades will be executed on Binance using real funds. Make sure your API keys have proper permissions.
                </div>
              </div>
            )}
          </div>

          {/* Binance API Configuration */}
          <div className="glass-panel p-6">
            <h2 className="text-lg font-semibold text-[#eaecef] mb-4">Binance API Configuration</h2>

            {settings?.binanceConfigured ? (
              <div className="mb-4 p-3 bg-[#0ecb81]/10 border border-[#0ecb81]/30 rounded-lg">
                <div className="text-[#0ecb81] font-medium">Binance API Connected</div>
                <div className="text-sm text-[#848e9c]">
                  API Key: {settings.binanceApiKey?.slice(0, 8)}...{settings.binanceApiKey?.slice(-4)}
                </div>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-[#f0b90b]/10 border border-[#f0b90b]/30 rounded-lg">
                <div className="text-[#f0b90b] font-medium">Binance API Not Configured</div>
                <div className="text-sm text-[#848e9c]">
                  Configure your Binance API credentials to enable real trading
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#848e9c] mb-1">API Key</label>
                <input
                  type="text"
                  value={binanceKey}
                  onChange={(e) => setBinanceKey(e.target.value)}
                  placeholder="Enter Binance API Key"
                  className="w-full bg-[#2a3139] border border-[#3a4149] rounded-lg px-4 py-2 text-[#eaecef] placeholder-[#848e9c] focus:outline-none focus:border-[#f0b90b]"
                />
              </div>
              <div>
                <label className="block text-sm text-[#848e9c] mb-1">API Secret</label>
                <input
                  type="password"
                  value={binanceSecret}
                  onChange={(e) => setBinanceSecret(e.target.value)}
                  placeholder="Enter Binance API Secret"
                  className="w-full bg-[#2a3139] border border-[#3a4149] rounded-lg px-4 py-2 text-[#eaecef] placeholder-[#848e9c] focus:outline-none focus:border-[#f0b90b]"
                />
              </div>

              {testResult && (
                <div className={`p-3 rounded-lg ${testResult.success ? 'bg-[#0ecb81]/10 border border-[#0ecb81]/30' : 'bg-[#f6465d]/10 border border-[#f6465d]/30'}`}>
                  <div className={testResult.success ? 'text-[#0ecb81]' : 'text-[#f6465d]'}>
                    {testResult.message}
                  </div>
                </div>
              )}

              <button
                onClick={saveBinanceCredentials}
                disabled={saving || !binanceKey || !binanceSecret}
                className="w-full bg-[#f0b90b] hover:bg-[#f0b90b]/80 text-[#181a20] font-medium py-3 rounded-lg disabled:opacity-50 transition-colors"
              >
                {saving ? 'Testing & Saving...' : 'Test & Save Credentials'}
              </button>
            </div>

            <div className="mt-6 p-4 bg-[#2a3139] rounded-lg">
              <h3 className="text-[#eaecef] font-medium mb-2">How to get Binance API Keys:</h3>
              <ol className="text-sm text-[#848e9c] space-y-2">
                <li>1. Log in to your Binance account</li>
                <li>2. Go to Account &gt; API Management</li>
                <li>3. Click "Create API" and label it (e.g., "TradingBot")</li>
                <li>4. Complete security verification</li>
                <li>5. Enable "Spot Trading" permission</li>
                <li>6. Optionally restrict to your server IP for security</li>
                <li>7. Copy the API Key and Secret (Secret only shown once!)</li>
              </ol>
              <div className="mt-3 text-xs text-[#f0b90b]">
                Important: Never enable withdrawal permissions for trading bots
              </div>
            </div>
          </div>

          {/* Fee Settings */}
          <div className="glass-panel p-6">
            <h2 className="text-lg font-semibold text-[#eaecef] mb-4">Platform Fees</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-[#2a3139] rounded-lg">
                <div className="text-2xl font-bold text-[#f0b90b]">{((settings?.depositFee || 0.01) * 100).toFixed(1)}%</div>
                <div className="text-sm text-[#848e9c]">Deposit Fee</div>
              </div>
              <div className="text-center p-4 bg-[#2a3139] rounded-lg">
                <div className="text-2xl font-bold text-[#f0b90b]">{((settings?.withdrawalFee || 0.005) * 100).toFixed(2)}%</div>
                <div className="text-sm text-[#848e9c]">Withdrawal Fee</div>
              </div>
              <div className="text-center p-4 bg-[#2a3139] rounded-lg">
                <div className="text-2xl font-bold text-[#f0b90b]">{((settings?.tradingFee || 0.001) * 100).toFixed(2)}%</div>
                <div className="text-sm text-[#848e9c]">Trading Fee</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overview Tab - Revenue Cards */}
      {settingsTab === 'overview' && (<>
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
      </>)}
    </div>
  );
}
