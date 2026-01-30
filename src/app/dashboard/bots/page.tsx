'use client';

import { useEffect, useState } from 'react';

interface BotTrade {
  id: string;
  type: string;
  amount: number;
  price: number;
  total: number;
  fee: number;
  profit: number;
  reason: string;
  createdAt: string;
}

interface Bot {
  id: string;
  pair: string;
  strategy: string;
  enabled: boolean;
  investment: number;
  interval: number;
  settings: string;
  totalInvested: number;
  totalProfit: number;
  tradesCount: number;
  avgEntryPrice: number;
  holdings: number;
  lastTradeAt: string | null;
  botTrades: BotTrade[];
}

const PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT'];
const STRATEGIES = [
  { value: 'DCA', label: 'Dollar Cost Average', desc: 'Buy regularly, more on dips' },
  { value: 'GRID', label: 'Grid Trading', desc: 'Buy low, sell high in range' },
  { value: 'SCALPER', label: 'Scalper', desc: 'Quick profits with tight stops' },
];

export default function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [executing, setExecuting] = useState(false);

  // Create form
  const [newPair, setNewPair] = useState('BTC/USDT');
  const [newStrategy, setNewStrategy] = useState('DCA');
  const [newInvestment, setNewInvestment] = useState('10');
  const [newInterval, setNewInterval] = useState('60');

  const fetchBots = async () => {
    try {
      const res = await fetch('/api/bot');
      if (res.ok) {
        const data = await res.json();
        setBots(data.bots);
      }
    } catch (error) {
      console.error('Failed to fetch bots:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBots();
    const interval = setInterval(fetchBots, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-execute bots every minute
  useEffect(() => {
    const autoExecute = async () => {
      if (bots.some(b => b.enabled)) {
        try {
          await fetch('/api/bot/execute', { method: 'POST' });
          fetchBots();
        } catch (e) {
          console.error('Auto-execute error:', e);
        }
      }
    };

    // Run immediately if there are active bots
    if (bots.some(b => b.enabled)) {
      autoExecute();
    }

    // Then run every minute
    const interval = setInterval(autoExecute, 60000);
    return () => clearInterval(interval);
  }, [bots.length]);

  const createBot = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pair: newPair,
          strategy: newStrategy,
          investment: parseFloat(newInvestment),
          interval: parseInt(newInterval),
        }),
      });

      if (res.ok) {
        setShowCreate(false);
        fetchBots();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create bot');
      }
    } catch (error) {
      alert('Failed to create bot');
    } finally {
      setCreating(false);
    }
  };

  const toggleBot = async (botId: string, enabled: boolean) => {
    try {
      const res = await fetch('/api/bot', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId, enabled }),
      });

      if (res.ok) {
        fetchBots();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to toggle bot');
      }
    } catch (error) {
      alert('Failed to toggle bot');
    }
  };

  const deleteBot = async (botId: string) => {
    if (!confirm('Are you sure you want to delete this bot?')) return;

    try {
      const res = await fetch(`/api/bot?botId=${botId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchBots();
      }
    } catch (error) {
      alert('Failed to delete bot');
    }
  };

  const executeNow = async () => {
    setExecuting(true);
    try {
      const res = await fetch('/api/bot/execute', { method: 'POST' });
      const data = await res.json();
      alert(`Executed ${data.executed} trades out of ${data.total} active bots`);
      fetchBots();
    } catch (error) {
      alert('Failed to execute bots');
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[#848e9c]">Loading bots...</div>
      </div>
    );
  }

  const totalProfit = bots.reduce((sum, bot) => sum + bot.totalProfit, 0);
  const activeBots = bots.filter(b => b.enabled).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#eaecef]">Auto Trading Bots</h1>
        <div className="flex gap-3">
          <button
            onClick={executeNow}
            disabled={executing || activeBots === 0}
            className="px-4 py-2 bg-[#1e80ff] hover:bg-[#1e80ff]/80 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {executing ? 'Executing...' : 'Run Bots Now'}
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-[#0ecb81] hover:bg-[#0ecb81]/80 text-[#0b0e11] rounded-lg text-sm font-medium"
          >
            + Create Bot
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4">
          <div className="text-sm text-[#848e9c]">Active Bots</div>
          <div className="text-2xl font-bold text-[#0ecb81]">{activeBots}</div>
        </div>
        <div className="glass-panel p-4">
          <div className="text-sm text-[#848e9c]">Total Bots</div>
          <div className="text-2xl font-bold text-[#eaecef]">{bots.length}</div>
        </div>
        <div className="glass-panel p-4">
          <div className="text-sm text-[#848e9c]">Total Trades</div>
          <div className="text-2xl font-bold text-[#eaecef]">
            {bots.reduce((sum, bot) => sum + bot.tradesCount, 0)}
          </div>
        </div>
        <div className="glass-panel p-4">
          <div className="text-sm text-[#848e9c]">Total Profit</div>
          <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
            ${totalProfit.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Bot List */}
      {bots.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <div className="text-[#848e9c] mb-4">No trading bots yet</div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-6 py-2 bg-[#0ecb81] hover:bg-[#0ecb81]/80 text-[#0b0e11] rounded-lg font-medium"
          >
            Create Your First Bot
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {bots.map((bot) => (
            <div key={bot.id} className="glass-panel p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-[#eaecef]">{bot.pair}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      bot.strategy === 'DCA' ? 'bg-[#1e80ff]/20 text-[#1e80ff]' :
                      bot.strategy === 'GRID' ? 'bg-[#f0b90b]/20 text-[#f0b90b]' :
                      'bg-[#e040fb]/20 text-[#e040fb]'
                    }`}>
                      {bot.strategy}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      bot.enabled ? 'bg-[#0ecb81]/20 text-[#0ecb81]' : 'bg-[#848e9c]/20 text-[#848e9c]'
                    }`}>
                      {bot.enabled ? 'ACTIVE' : 'PAUSED'}
                    </span>
                  </div>
                  <div className="text-sm text-[#848e9c] mt-1">
                    ${bot.investment} per trade | Every {bot.interval} min
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleBot(bot.id, !bot.enabled)}
                    className={`px-3 py-1.5 rounded text-sm font-medium ${
                      bot.enabled
                        ? 'bg-[#f6465d]/10 text-[#f6465d] hover:bg-[#f6465d]/20'
                        : 'bg-[#0ecb81]/10 text-[#0ecb81] hover:bg-[#0ecb81]/20'
                    }`}
                  >
                    {bot.enabled ? 'Pause' : 'Start'}
                  </button>
                  <button
                    onClick={() => deleteBot(bot.id)}
                    className="px-3 py-1.5 rounded text-sm text-[#848e9c] hover:text-[#f6465d] hover:bg-[#f6465d]/10"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <div className="text-[#848e9c]">Holdings</div>
                  <div className="text-[#eaecef] font-medium">
                    {bot.holdings.toFixed(6)} {bot.pair.split('/')[0]}
                  </div>
                </div>
                <div>
                  <div className="text-[#848e9c]">Avg Entry</div>
                  <div className="text-[#eaecef] font-medium">
                    ${bot.avgEntryPrice.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-[#848e9c]">Invested</div>
                  <div className="text-[#eaecef] font-medium">
                    ${bot.totalInvested.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-[#848e9c]">Trades</div>
                  <div className="text-[#eaecef] font-medium">{bot.tradesCount}</div>
                </div>
                <div>
                  <div className="text-[#848e9c]">Profit</div>
                  <div className={`font-medium ${bot.totalProfit >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                    ${bot.totalProfit.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Recent Trades */}
              {bot.botTrades.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#2a3139]">
                  <div className="text-xs text-[#848e9c] mb-2">Recent Trades</div>
                  <div className="space-y-1">
                    {bot.botTrades.slice(0, 3).map((trade) => (
                      <div key={trade.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={trade.type === 'BUY' ? 'text-[#0ecb81]' : 'text-[#f6465d]'}>
                            {trade.type}
                          </span>
                          <span className="text-[#848e9c]">
                            {trade.amount.toFixed(6)} @ ${trade.price.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`${trade.profit >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                            {trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}
                          </span>
                          <span className="text-[#848e9c]">
                            {new Date(trade.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Bot Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-panel p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-[#eaecef] mb-4">Create Trading Bot</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#848e9c] mb-1">Trading Pair</label>
                <select
                  value={newPair}
                  onChange={(e) => setNewPair(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[#12171d] border border-[#2a3139] text-[#eaecef]"
                >
                  {PAIRS.map((pair) => (
                    <option key={pair} value={pair}>{pair}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-[#848e9c] mb-1">Strategy</label>
                <div className="space-y-2">
                  {STRATEGIES.map((s) => (
                    <label
                      key={s.value}
                      className={`block p-3 rounded border cursor-pointer ${
                        newStrategy === s.value
                          ? 'border-[#0ecb81] bg-[#0ecb81]/10'
                          : 'border-[#2a3139] hover:border-[#848e9c]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="strategy"
                        value={s.value}
                        checked={newStrategy === s.value}
                        onChange={(e) => setNewStrategy(e.target.value)}
                        className="hidden"
                      />
                      <div className="font-medium text-[#eaecef]">{s.label}</div>
                      <div className="text-xs text-[#848e9c]">{s.desc}</div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#848e9c] mb-1">Investment per Trade (USDT)</label>
                <input
                  type="number"
                  value={newInvestment}
                  onChange={(e) => setNewInvestment(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[#12171d] border border-[#2a3139] text-[#eaecef]"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm text-[#848e9c] mb-1">Trade Interval (minutes)</label>
                <select
                  value={newInterval}
                  onChange={(e) => setNewInterval(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[#12171d] border border-[#2a3139] text-[#eaecef]"
                >
                  <option value="5">Every 5 minutes</option>
                  <option value="15">Every 15 minutes</option>
                  <option value="30">Every 30 minutes</option>
                  <option value="60">Every 1 hour</option>
                  <option value="240">Every 4 hours</option>
                  <option value="1440">Every 24 hours</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 px-4 py-2 border border-[#2a3139] text-[#848e9c] rounded-lg hover:bg-[#12171d]"
              >
                Cancel
              </button>
              <button
                onClick={createBot}
                disabled={creating}
                className="flex-1 px-4 py-2 bg-[#0ecb81] text-[#0b0e11] rounded-lg font-medium hover:bg-[#0ecb81]/80 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Bot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
