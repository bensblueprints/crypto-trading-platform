import { NextResponse } from 'next/server';

const MOCK_PRICES: Record<string, { price: number; change24h: number; high24h: number; low24h: number; volume24h: number }> = {
  'BTC/USDT': { price: 43250.50, change24h: 2.35, high24h: 44100, low24h: 42200, volume24h: 1250000000 },
  'ETH/USDT': { price: 2635.75, change24h: 1.82, high24h: 2700, low24h: 2580, volume24h: 850000000 },
  'BNB/USDT': { price: 318.20, change24h: -0.45, high24h: 325, low24h: 315, volume24h: 120000000 },
  'SOL/USDT': { price: 102.45, change24h: 5.67, high24h: 108, low24h: 96, volume24h: 450000000 },
  'XRP/USDT': { price: 0.5520, change24h: -1.23, high24h: 0.58, low24h: 0.54, volume24h: 180000000 },
  'ADA/USDT': { price: 0.5125, change24h: 3.21, high24h: 0.53, low24h: 0.49, volume24h: 95000000 },
  'DOGE/USDT': { price: 0.0825, change24h: -2.15, high24h: 0.086, low24h: 0.080, volume24h: 75000000 },
  'DOT/USDT': { price: 7.45, change24h: 1.55, high24h: 7.65, low24h: 7.25, volume24h: 55000000 },
};

export async function GET() {
  const prices = Object.entries(MOCK_PRICES).map(([pair, data]) => ({
    pair,
    ...data,
  }));

  return NextResponse.json({ prices });
}
