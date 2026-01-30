'use client';

import { useEffect, useState } from 'react';

interface Trade {
  id: string;
  pair: string;
  type: 'BUY' | 'SELL';
  orderType: string;
  amount: number;
  price: number;
  total: number;
  fee: number;
  status: string;
  createdAt: string;
  filledAt?: string;
}

interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  currency: string;
  amount: number;
  fee: number;
  status: string;
  txHash?: string;
  createdAt: string;
}

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState<'trades' | 'transactions'>('trades');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tradesRes, depositsRes, withdrawalsRes] = await Promise.all([
          fetch('/api/trade'),
          fetch('/api/wallet/deposit'),
          fetch('/api/wallet/withdraw'),
        ]);

        if (tradesRes.ok) {
          const data = await tradesRes.json();
          setTrades(data.trades || []);
        }

        const deposits = depositsRes.ok ? (await depositsRes.json()).transactions || [] : [];
        const withdrawals = withdrawalsRes.ok ? (await withdrawalsRes.json()).transactions || [] : [];

        const allTransactions = [...deposits, ...withdrawals];
        allTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTransactions(allTransactions);
      } catch (error) {
        console.error('Failed to fetch history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#0ecb81] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#eaecef]">History</h1>
        <p className="text-[#848e9c]">View your trading and transaction history</p>
      </div>

      <div className="glass-panel">
        <div className="flex border-b border-[#2a3139]">
          <button
            onClick={() => setActiveTab('trades')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'trades'
                ? 'text-[#0ecb81] border-[#0ecb81]'
                : 'text-[#848e9c] border-transparent hover:text-[#eaecef]'
            }`}
          >
            Trade History ({trades.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'transactions'
                ? 'text-[#1e80ff] border-[#1e80ff]'
                : 'text-[#848e9c] border-transparent hover:text-[#eaecef]'
            }`}
          >
            Transactions ({transactions.length})
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'trades' ? (
            trades.length === 0 ? (
              <div className="text-center py-12 text-[#848e9c]">
                <div className="text-4xl mb-4">📈</div>
                <p>No trades yet. Start trading to see your history here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-[#848e9c] border-b border-[#2a3139]">
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Pair</th>
                      <th className="pb-3 font-medium">Type</th>
                      <th className="pb-3 font-medium text-right">Price</th>
                      <th className="pb-3 font-medium text-right">Amount</th>
                      <th className="pb-3 font-medium text-right">Total</th>
                      <th className="pb-3 font-medium text-right">Fee</th>
                      <th className="pb-3 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade) => (
                      <tr key={trade.id} className="border-b border-[#2a3139]/50 hover:bg-[#12171d]">
                        <td className="py-4 text-sm text-[#848e9c]">{formatDate(trade.createdAt)}</td>
                        <td className="py-4 font-medium text-[#eaecef]">{trade.pair}</td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            trade.type === 'BUY' ? 'bg-[#0ecb81]/10 text-[#0ecb81]' : 'bg-[#f6465d]/10 text-[#f6465d]'
                          }`}>
                            {trade.type}
                          </span>
                        </td>
                        <td className="py-4 text-right font-mono text-[#eaecef]">
                          ${trade.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: trade.price < 1 ? 4 : 2 })}
                        </td>
                        <td className="py-4 text-right font-mono text-[#848e9c]">{trade.amount.toFixed(6)}</td>
                        <td className="py-4 text-right font-mono text-[#eaecef]">${trade.total.toFixed(2)}</td>
                        <td className="py-4 text-right font-mono text-[#f0b90b]">${trade.fee.toFixed(4)}</td>
                        <td className="py-4 text-right">
                          <span className={`px-2 py-1 rounded text-xs ${
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
              </div>
            )
          ) : (
            transactions.length === 0 ? (
              <div className="text-center py-12 text-[#848e9c]">
                <div className="text-4xl mb-4">💰</div>
                <p>No transactions yet. Make a deposit to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-[#848e9c] border-b border-[#2a3139]">
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Type</th>
                      <th className="pb-3 font-medium">Currency</th>
                      <th className="pb-3 font-medium text-right">Amount</th>
                      <th className="pb-3 font-medium text-right">Fee</th>
                      <th className="pb-3 font-medium text-right">Status</th>
                      <th className="pb-3 font-medium text-right">TX Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-[#2a3139]/50 hover:bg-[#12171d]">
                        <td className="py-4 text-sm text-[#848e9c]">{formatDate(tx.createdAt)}</td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            tx.type === 'DEPOSIT' ? 'bg-[#0ecb81]/10 text-[#0ecb81]' : 'bg-[#f6465d]/10 text-[#f6465d]'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-4 font-medium text-[#eaecef]">{tx.currency}</td>
                        <td className="py-4 text-right font-mono text-[#eaecef]">
                          <span className={tx.type === 'DEPOSIT' ? 'text-[#0ecb81]' : 'text-[#f6465d]'}>
                            {tx.type === 'DEPOSIT' ? '+' : '-'}{tx.amount.toFixed(4)}
                          </span>
                        </td>
                        <td className="py-4 text-right font-mono text-[#f0b90b]">{tx.fee.toFixed(4)}</td>
                        <td className="py-4 text-right">
                          <span className={`px-2 py-1 rounded text-xs ${
                            tx.status === 'COMPLETED' ? 'bg-[#0ecb81]/10 text-[#0ecb81]' :
                            tx.status === 'PENDING' ? 'bg-[#f0b90b]/10 text-[#f0b90b]' :
                            'bg-[#f6465d]/10 text-[#f6465d]'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          {tx.txHash ? (
                            <span className="font-mono text-xs text-[#848e9c]">
                              {tx.txHash.slice(0, 8)}...{tx.txHash.slice(-6)}
                            </span>
                          ) : (
                            <span className="text-[#5e6673]">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
