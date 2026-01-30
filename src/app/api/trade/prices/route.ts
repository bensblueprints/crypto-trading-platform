import { NextResponse } from 'next/server';

const TRADING_PAIRS = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'SOLUSDT',
  'XRPUSDT',
  'ADAUSDT',
  'DOGEUSDT',
  'DOTUSDT',
  'MATICUSDT',
  'LTCUSDT',
];

interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
}

let priceCache: { data: any[]; timestamp: number } | null = null;
const CACHE_DURATION = 5000; // 5 seconds cache

export async function GET() {
  try {
    // Check cache
    if (priceCache && Date.now() - priceCache.timestamp < CACHE_DURATION) {
      return NextResponse.json({ prices: priceCache.data, cached: true });
    }

    // Fetch from Binance API
    const symbols = JSON.stringify(TRADING_PAIRS);
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbols)}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 5 },
      }
    );

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data: BinanceTicker[] = await response.json();

    const prices = data.map((ticker) => {
      const base = ticker.symbol.replace('USDT', '');
      return {
        pair: `${base}/USDT`,
        symbol: ticker.symbol,
        price: parseFloat(ticker.lastPrice),
        change24h: parseFloat(ticker.priceChangePercent),
        high24h: parseFloat(ticker.highPrice),
        low24h: parseFloat(ticker.lowPrice),
        volume24h: parseFloat(ticker.quoteVolume),
      };
    });

    // Sort by volume
    prices.sort((a, b) => b.volume24h - a.volume24h);

    // Update cache
    priceCache = { data: prices, timestamp: Date.now() };

    return NextResponse.json({ prices, cached: false });
  } catch (error) {
    console.error('Failed to fetch prices from Binance:', error);

    // Return cached data if available, even if stale
    if (priceCache) {
      return NextResponse.json({ prices: priceCache.data, cached: true, stale: true });
    }

    // Fallback to mock data if Binance fails
    const fallbackPrices = [
      { pair: 'BTC/USDT', symbol: 'BTCUSDT', price: 43250.50, change24h: 2.35, high24h: 44100, low24h: 42200, volume24h: 1250000000 },
      { pair: 'ETH/USDT', symbol: 'ETHUSDT', price: 2635.75, change24h: 1.82, high24h: 2700, low24h: 2580, volume24h: 850000000 },
      { pair: 'BNB/USDT', symbol: 'BNBUSDT', price: 318.20, change24h: -0.45, high24h: 325, low24h: 315, volume24h: 120000000 },
      { pair: 'SOL/USDT', symbol: 'SOLUSDT', price: 102.45, change24h: 5.67, high24h: 108, low24h: 96, volume24h: 450000000 },
      { pair: 'XRP/USDT', symbol: 'XRPUSDT', price: 0.5520, change24h: -1.23, high24h: 0.58, low24h: 0.54, volume24h: 180000000 },
      { pair: 'ADA/USDT', symbol: 'ADAUSDT', price: 0.5125, change24h: 3.21, high24h: 0.53, low24h: 0.49, volume24h: 95000000 },
      { pair: 'DOGE/USDT', symbol: 'DOGEUSDT', price: 0.0825, change24h: -2.15, high24h: 0.086, low24h: 0.080, volume24h: 75000000 },
      { pair: 'DOT/USDT', symbol: 'DOTUSDT', price: 7.45, change24h: 1.55, high24h: 7.65, low24h: 7.25, volume24h: 55000000 },
    ];

    return NextResponse.json({ prices: fallbackPrices, fallback: true });
  }
}
