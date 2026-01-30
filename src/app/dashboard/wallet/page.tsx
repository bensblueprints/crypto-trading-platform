'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/store/useStore';

function WalletContent() {
  const searchParams = useSearchParams();
  const { wallets, setWallets } = useStore();
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>(
    searchParams.get('tab') === 'withdraw' ? 'withdraw' : 'deposit'
  );
  const [selectedCurrency, setSelectedCurrency] = useState('USDT');
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [network, setNetwork] = useState('TRC20');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; url?: string } | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  const currencies = ['USDT', 'BTC', 'ETH', 'BNB', 'SOL'];
  const networks: Record<string, string[]> = {
    USDT: ['TRC20', 'ERC20', 'BEP20'],
    BTC: ['BTC'],
    ETH: ['ERC20'],
    BNB: ['BEP20'],
    SOL: ['SOL'],
  };

  useEffect(() => {
    fetchBalance();
    fetchTransactions();
  }, []);

  const fetchBalance = async () => {
    try {
      const res = await fetch('/api/wallet/balance');
      if (res.ok) {
        const data = await res.json();
        setWallets(data.wallets);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const [deposits, withdrawals] = await Promise.all([
        fetch('/api/wallet/deposit').then(r => r.json()),
        fetch('/api/wallet/withdraw').then(r => r.json()),
      ]);
      const all = [...(deposits.transactions || []), ...(withdrawals.transactions || [])];
      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTransactions(all.slice(0, 20));
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setResult({ success: false, message: 'Please enter a valid amount' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency: selectedCurrency }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({
          success: true,
          message: `Deposit initiated! Amount: ${amount} ${selectedCurrency} (Fee: ${data.transaction.fee.toFixed(2)} ${selectedCurrency})`,
          url: data.payment?.url,
        });
        setAmount('');
        fetchTransactions();
      } else {
        setResult({ success: false, message: data.error || 'Deposit failed' });
      }
    } catch {
      setResult({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setResult({ success: false, message: 'Please enter a valid amount' });
      return;
    }

    if (!address) {
      setResult({ success: false, message: 'Please enter a wallet address' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency: selectedCurrency, address, network }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({
          success: true,
          message: `Withdrawal initiated! Amount: ${amount} ${selectedCurrency} to ${address.slice(0, 10)}...`,
        });
        setAmount('');
        setAddress('');
        fetchBalance();
        fetchTransactions();
      } else {
        setResult({ success: false, message: data.error || 'Withdrawal failed' });
      }
    } catch {
      setResult({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const currentWallet = wallets.find(w => w.currency === selectedCurrency);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#eaecef]">Wallet</h1>
        <p className="text-[#848e9c]">Manage your deposits and withdrawals</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6">
            <div className="flex border-b border-[#2a3139] mb-6">
              <button
                onClick={() => setActiveTab('deposit')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'deposit'
                    ? 'text-[#0ecb81] border-[#0ecb81]'
                    : 'text-[#848e9c] border-transparent hover:text-[#eaecef]'
                }`}
              >
                Deposit
              </button>
              <button
                onClick={() => setActiveTab('withdraw')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'withdraw'
                    ? 'text-[#f6465d] border-[#f6465d]'
                    : 'text-[#848e9c] border-transparent hover:text-[#eaecef]'
                }`}
              >
                Withdraw
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm text-[#848e9c] mb-2">Select Currency</label>
                <div className="flex flex-wrap gap-2">
                  {currencies.map((currency) => (
                    <button
                      key={currency}
                      onClick={() => {
                        setSelectedCurrency(currency);
                        setNetwork(networks[currency][0]);
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedCurrency === currency
                          ? 'bg-[#0ecb81] text-[#0b0e11]'
                          : 'bg-[#12171d] text-[#848e9c] hover:text-[#eaecef] border border-[#2a3139]'
                      }`}
                    >
                      {currency}
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === 'withdraw' && (
                <div>
                  <label className="block text-sm text-[#848e9c] mb-2">Network</label>
                  <div className="flex flex-wrap gap-2">
                    {networks[selectedCurrency]?.map((net) => (
                      <button
                        key={net}
                        onClick={() => setNetwork(net)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          network === net
                            ? 'bg-[#1e80ff] text-white'
                            : 'bg-[#12171d] text-[#848e9c] hover:text-[#eaecef] border border-[#2a3139]'
                        }`}
                      >
                        {net}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm text-[#848e9c] mb-2">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-3 pr-20 rounded-lg bg-[#12171d] border border-[#2a3139] text-[#eaecef] placeholder-[#5e6673] focus:outline-none focus:border-[#0ecb81] transition-colors"
                    placeholder="0.00"
                    min="0"
                    step="any"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#848e9c]">
                    {selectedCurrency}
                  </span>
                </div>
                {activeTab === 'deposit' && (
                  <div className="mt-2 text-sm text-[#848e9c]">
                    Platform fee: 1% ({amount ? (parseFloat(amount) * 0.01).toFixed(4) : '0'} {selectedCurrency})
                  </div>
                )}
                {activeTab === 'withdraw' && currentWallet && (
                  <div className="mt-2 text-sm text-[#848e9c]">
                    Available: {currentWallet.balance.toFixed(6)} {selectedCurrency}
                  </div>
                )}
              </div>

              {activeTab === 'withdraw' && (
                <div>
                  <label className="block text-sm text-[#848e9c] mb-2">Wallet Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-[#12171d] border border-[#2a3139] text-[#eaecef] placeholder-[#5e6673] focus:outline-none focus:border-[#0ecb81] transition-colors font-mono text-sm"
                    placeholder="Enter destination wallet address"
                  />
                </div>
              )}

              {result && (
                <div className={`p-4 rounded-lg ${result.success ? 'bg-[#0ecb81]/10 border border-[#0ecb81]/30 text-[#0ecb81]' : 'bg-[#f6465d]/10 border border-[#f6465d]/30 text-[#f6465d]'}`}>
                  <p>{result.message}</p>
                  {result.url && (
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block px-4 py-2 bg-[#0ecb81] text-[#0b0e11] rounded-lg font-medium hover:bg-[#0ecb81]/90 transition-colors"
                    >
                      Complete Payment →
                    </a>
                  )}
                </div>
              )}

              <button
                onClick={activeTab === 'deposit' ? handleDeposit : handleWithdraw}
                disabled={loading}
                className={`w-full py-4 font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  activeTab === 'deposit'
                    ? 'bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-[#0b0e11]'
                    : 'bg-[#f6465d] hover:bg-[#f6465d]/90 text-white'
                }`}
              >
                {loading ? 'Processing...' : activeTab === 'deposit' ? 'Deposit' : 'Withdraw'}
              </button>
            </div>
          </div>

          <div className="glass-panel p-6">
            <h2 className="text-lg font-bold text-[#eaecef] mb-4">Recent Transactions</h2>
            {transactions.length === 0 ? (
              <p className="text-[#848e9c] text-center py-8">No transactions yet</p>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg bg-[#12171d] border border-[#2a3139]">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'DEPOSIT' ? 'bg-[#0ecb81]/10 text-[#0ecb81]' : 'bg-[#f6465d]/10 text-[#f6465d]'}`}>
                        {tx.type === 'DEPOSIT' ? '↓' : '↑'}
                      </div>
                      <div>
                        <div className="font-medium text-[#eaecef]">{tx.type}</div>
                        <div className="text-sm text-[#848e9c]">{tx.currency}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono ${tx.type === 'DEPOSIT' ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                        {tx.type === 'DEPOSIT' ? '+' : '-'}{tx.amount.toFixed(4)}
                      </div>
                      <div className={`text-xs px-2 py-0.5 rounded ${
                        tx.status === 'COMPLETED' ? 'bg-[#0ecb81]/10 text-[#0ecb81]' :
                        tx.status === 'PENDING' ? 'bg-[#f0b90b]/10 text-[#f0b90b]' :
                        'bg-[#f6465d]/10 text-[#f6465d]'
                      }`}>
                        {tx.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-6">
            <h2 className="text-lg font-bold text-[#eaecef] mb-4">Your Balances</h2>
            <div className="space-y-3">
              {wallets.map((wallet) => (
                <div key={wallet.id} className="flex items-center justify-between p-3 rounded-lg bg-[#12171d]">
                  <span className="font-medium text-[#eaecef]">{wallet.currency}</span>
                  <span className="font-mono text-[#848e9c]">
                    {wallet.balance.toFixed(wallet.currency === 'USDT' ? 2 : 6)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-6">
            <h2 className="text-lg font-bold text-[#eaecef] mb-4">Fee Structure</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between p-3 rounded-lg bg-[#12171d]">
                <span className="text-[#848e9c]">Deposit Fee</span>
                <span className="text-[#0ecb81] font-medium">1%</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-[#12171d]">
                <span className="text-[#848e9c]">Withdrawal Fee</span>
                <span className="text-[#f0b90b] font-medium">0.5%</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-[#12171d]">
                <span className="text-[#848e9c]">Min Deposit</span>
                <span className="text-[#eaecef]">$10</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-[#12171d]">
                <span className="text-[#848e9c]">Min Withdrawal</span>
                <span className="text-[#eaecef]">$20</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={<div className="text-[#848e9c]">Loading...</div>}>
      <WalletContent />
    </Suspense>
  );
}
