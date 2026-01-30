'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';
import type { IChartApi, Time, CandlestickData } from 'lightweight-charts';

interface Price {
  pair: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

function TradeContent() {
  const searchParams = useSearchParams();
  const { wallets, setWallets } = useStore();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const [selectedPair, setSelectedPair] = useState(searchParams.get('pair') || 'BTC/USDT');
  const [prices, setPrices] = useState<Price[]>([]);
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [amount, setAmount] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const pairs = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT', 'ADA/USDT', 'DOGE/USDT', 'DOT/USDT'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [balanceRes, pricesRes] = await Promise.all([
          fetch('/api/wallet/balance'),
          fetch('/api/trade/prices'),
        ]);

        if (balanceRes.ok) {
          const data = await balanceRes.json();
          setWallets(data.wallets);
        }

        if (pricesRes.ok) {
          const data = await pricesRes.json();
          setPrices(data.prices);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [setWallets]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#12171d' },
        textColor: '#848e9c',
      },
      grid: {
        vertLines: { color: '#2a3139' },
        horzLines: { color: '#2a3139' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      crosshair: {
        mode: 1,
      },
      timeScale: {
        borderColor: '#2a3139',
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: '#2a3139',
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#0ecb81',
      downColor: '#f6465d',
      borderDownColor: '#f6465d',
      borderUpColor: '#0ecb81',
      wickDownColor: '#f6465d',
      wickUpColor: '#0ecb81',
    });

    const now = Math.floor(Date.now() / 1000);
    const data: CandlestickData<Time>[] = [];
    let basePrice = selectedPair.includes('BTC') ? 43000 : selectedPair.includes('ETH') ? 2600 : 100;

    for (let i = 100; i >= 0; i--) {
      const time = (now - i * 3600) as Time;
      const volatility = basePrice * 0.02;
      const open = basePrice + (Math.random() - 0.5) * volatility;
      const close = open + (Math.random() - 0.5) * volatility;
      const high = Math.max(open, close) + Math.random() * volatility * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * 0.5;

      data.push({ time, open, high, low, close });
      basePrice = close;
    }

    candlestickSeries.setData(data);
    chart.timeScale().fitContent();
    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [selectedPair]);

  const currentPrice = prices.find(p => p.pair === selectedPair);
  const [baseCurrency, quoteCurrency] = selectedPair.split('/');
  const baseWallet = wallets.find(w => w.currency === baseCurrency);
  const quoteWallet = wallets.find(w => w.currency === quoteCurrency);

  const handleTrade = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setResult({ success: false, message: 'Please enter a valid amount' });
      return;
    }

    if (orderType === 'LIMIT' && (!limitPrice || parseFloat(limitPrice) <= 0)) {
      setResult({ success: false, message: 'Please enter a valid limit price' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pair: selectedPair,
          type: tradeType,
          orderType,
          amount,
          price: orderType === 'LIMIT' ? limitPrice : undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({
          success: true,
          message: `${tradeType} order ${data.trade.status === 'FILLED' ? 'executed' : 'placed'}! ${amount} ${baseCurrency} @ $${data.trade.price.toLocaleString()}`,
        });
        setAmount('');
        setLimitPrice('');

        const balanceRes = await fetch('/api/wallet/balance');
        if (balanceRes.ok) {
          const balanceData = await balanceRes.json();
          setWallets(balanceData.wallets);
        }
      } else {
        setResult({ success: false, message: data.error || 'Trade failed' });
      }
    } catch {
      setResult({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    const qty = parseFloat(amount) || 0;
    const price = orderType === 'LIMIT' ? parseFloat(limitPrice) : (currentPrice?.price || 0);
    return (qty * price).toFixed(2);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-48 flex-shrink-0">
          <div className="glass-panel p-4">
            <h3 className="text-sm font-medium text-[#848e9c] mb-3">Markets</h3>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {pairs.map((pair) => {
                const priceData = prices.find(p => p.pair === pair);
                return (
                  <button
                    key={pair}
                    onClick={() => setSelectedPair(pair)}
                    className={`w-full flex items-center justify-between p-2 rounded text-left transition-colors ${
                      selectedPair === pair
                        ? 'bg-[#1a1f27] border border-[#0ecb81]'
                        : 'hover:bg-[#12171d]'
                    }`}
                  >
                    <span className="text-sm font-medium text-[#eaecef]">{pair}</span>
                    {priceData && (
                      <span className={`text-xs ${priceData.change24h >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                        {priceData.change24h >= 0 ? '+' : ''}{priceData.change24h.toFixed(1)}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-6">
          <div className="glass-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-[#eaecef]">{selectedPair}</h2>
                {currentPrice && (
                  <>
                    <span className="text-2xl font-bold text-[#eaecef]">
                      ${currentPrice.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: currentPrice.price < 1 ? 4 : 2 })}
                    </span>
                    <span className={`px-2 py-1 rounded text-sm ${currentPrice.change24h >= 0 ? 'bg-[#0ecb81]/10 text-[#0ecb81]' : 'bg-[#f6465d]/10 text-[#f6465d]'}`}>
                      {currentPrice.change24h >= 0 ? '+' : ''}{currentPrice.change24h.toFixed(2)}%
                    </span>
                  </>
                )}
              </div>
              {currentPrice && (
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-[#848e9c]">24h High: </span>
                    <span className="text-[#0ecb81]">${currentPrice.high24h.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[#848e9c]">24h Low: </span>
                    <span className="text-[#f6465d]">${currentPrice.low24h.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
            <div ref={chartContainerRef} className="rounded-lg overflow-hidden" />
          </div>
        </div>

        <div className="lg:w-80 flex-shrink-0">
          <div className="glass-panel p-4 space-y-4">
            <div className="flex rounded-lg overflow-hidden border border-[#2a3139]">
              <button
                onClick={() => setTradeType('BUY')}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${
                  tradeType === 'BUY'
                    ? 'bg-[#0ecb81] text-[#0b0e11]'
                    : 'bg-[#12171d] text-[#848e9c] hover:text-[#eaecef]'
                }`}
              >
                BUY
              </button>
              <button
                onClick={() => setTradeType('SELL')}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${
                  tradeType === 'SELL'
                    ? 'bg-[#f6465d] text-white'
                    : 'bg-[#12171d] text-[#848e9c] hover:text-[#eaecef]'
                }`}
              >
                SELL
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setOrderType('MARKET')}
                className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${
                  orderType === 'MARKET'
                    ? 'bg-[#1a1f27] text-[#eaecef] border border-[#2a3139]'
                    : 'text-[#848e9c] hover:text-[#eaecef]'
                }`}
              >
                Market
              </button>
              <button
                onClick={() => setOrderType('LIMIT')}
                className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${
                  orderType === 'LIMIT'
                    ? 'bg-[#1a1f27] text-[#eaecef] border border-[#2a3139]'
                    : 'text-[#848e9c] hover:text-[#eaecef]'
                }`}
              >
                Limit
              </button>
            </div>

            <div className="space-y-3">
              {orderType === 'LIMIT' && (
                <div>
                  <label className="block text-xs text-[#848e9c] mb-1">Price ({quoteCurrency})</label>
                  <input
                    type="number"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[#12171d] border border-[#2a3139] text-[#eaecef] text-sm focus:outline-none focus:border-[#0ecb81]"
                    placeholder="0.00"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs text-[#848e9c] mb-1">Amount ({baseCurrency})</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[#12171d] border border-[#2a3139] text-[#eaecef] text-sm focus:outline-none focus:border-[#0ecb81]"
                  placeholder="0.00"
                />
              </div>

              <div className="flex gap-2">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => {
                      const balance = tradeType === 'BUY' ? (quoteWallet?.balance || 0) : (baseWallet?.balance || 0);
                      const price = currentPrice?.price || 0;
                      if (tradeType === 'BUY' && price > 0) {
                        setAmount(((balance * pct / 100) / price).toFixed(6));
                      } else {
                        setAmount((balance * pct / 100).toFixed(6));
                      }
                    }}
                    className="flex-1 py-1 text-xs bg-[#12171d] text-[#848e9c] rounded hover:text-[#eaecef] border border-[#2a3139]"
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs text-[#848e9c] mb-1">Total ({quoteCurrency})</label>
                <div className="px-3 py-2 rounded bg-[#12171d] border border-[#2a3139] text-[#eaecef] text-sm">
                  {calculateTotal()}
                </div>
              </div>

              <div className="pt-2 text-xs text-[#848e9c] space-y-1">
                <div className="flex justify-between">
                  <span>Available {tradeType === 'BUY' ? quoteCurrency : baseCurrency}:</span>
                  <span>
                    {(tradeType === 'BUY' ? quoteWallet?.balance : baseWallet?.balance)?.toFixed(4) || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Trading Fee:</span>
                  <span>0.1%</span>
                </div>
              </div>

              {result && (
                <div className={`p-3 rounded text-sm ${result.success ? 'bg-[#0ecb81]/10 text-[#0ecb81]' : 'bg-[#f6465d]/10 text-[#f6465d]'}`}>
                  {result.message}
                </div>
              )}

              <button
                onClick={handleTrade}
                disabled={loading}
                className={`w-full py-3 font-bold rounded transition-colors disabled:opacity-50 ${
                  tradeType === 'BUY'
                    ? 'bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-[#0b0e11]'
                    : 'bg-[#f6465d] hover:bg-[#f6465d]/90 text-white'
                }`}
              >
                {loading ? 'Processing...' : `${tradeType} ${baseCurrency}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TradePage() {
  return (
    <Suspense fallback={<div className="text-[#848e9c]">Loading...</div>}>
      <TradeContent />
    </Suspense>
  );
}
