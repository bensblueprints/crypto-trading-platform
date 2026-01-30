import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { BinanceClient, formatQuantity, BINANCE_MIN_QUANTITIES } from '@/lib/binance';

const TRADING_FEE_PERCENT = 0.001;

interface PlatformSettings {
  tradingMode: string;
  binanceApiKey: string | null;
  binanceSecret: string | null;
}

async function getPlatformSettings(): Promise<PlatformSettings | null> {
  try {
    const settings = await prisma.platformSettings.findUnique({
      where: { id: 'settings' },
    });
    return settings;
  } catch {
    return null;
  }
}

async function fetchCurrentPrice(pair: string): Promise<number | null> {
  try {
    const symbol = pair.replace('/', '');
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
      { next: { revalidate: 1 } }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return parseFloat(data.price);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pair, type, orderType, amount, price: limitPrice } = await request.json();

    if (!pair || !type || !orderType || !amount) {
      return NextResponse.json(
        { error: 'Pair, type, orderType, and amount are required' },
        { status: 400 }
      );
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Get platform settings to check trading mode
    const settings = await getPlatformSettings();
    const isRealTrading = settings?.tradingMode === 'REAL' && settings?.binanceApiKey && settings?.binanceSecret;

    const [baseCurrency, quoteCurrency] = pair.split('/');
    const binanceSymbol = pair.replace('/', '');

    // Check minimum quantity for real trading
    if (isRealTrading) {
      const minQty = BINANCE_MIN_QUANTITIES[binanceSymbol] || 0.00001;
      if (numAmount < minQty) {
        return NextResponse.json(
          { error: `Minimum order quantity for ${pair} is ${minQty}` },
          { status: 400 }
        );
      }
    }

    let currentPrice: number;
    let binanceOrderId: string | null = null;
    let realExecutionPrice: number | null = null;
    if (orderType === 'MARKET') {
      const livePrice = await fetchCurrentPrice(pair);
      if (!livePrice) {
        return NextResponse.json({ error: 'Unable to fetch current price' }, { status: 500 });
      }
      currentPrice = livePrice;

      // Execute real trade on Binance if in REAL mode
      if (isRealTrading && settings?.binanceApiKey && settings?.binanceSecret) {
        try {
          const client = new BinanceClient({
            apiKey: settings.binanceApiKey,
            apiSecret: settings.binanceSecret,
          });

          // Format quantity to Binance precision
          const formattedQty = formatQuantity(binanceSymbol, numAmount);

          // Execute market order on Binance
          const binanceOrder = await client.placeMarketOrder(binanceSymbol, type, formattedQty);

          binanceOrderId = String(binanceOrder.orderId);

          // Calculate actual execution price from fills
          if (binanceOrder.fills && binanceOrder.fills.length > 0) {
            let totalQty = 0;
            let totalValue = 0;
            for (const fill of binanceOrder.fills) {
              const fillQty = parseFloat(fill.qty);
              const fillPrice = parseFloat(fill.price);
              totalQty += fillQty;
              totalValue += fillQty * fillPrice;
            }
            realExecutionPrice = totalValue / totalQty;
            currentPrice = realExecutionPrice;
          }

          console.log(`Binance order executed: ${binanceOrderId} at ${currentPrice}`);
        } catch (binanceError) {
          console.error('Binance trade error:', binanceError);
          return NextResponse.json(
            { error: `Failed to execute trade on Binance: ${binanceError instanceof Error ? binanceError.message : 'Unknown error'}` },
            { status: 500 }
          );
        }
      }
    } else {
      currentPrice = parseFloat(limitPrice);
      if (!currentPrice || currentPrice <= 0) {
        return NextResponse.json({ error: 'Invalid limit price' }, { status: 400 });
      }
      // Note: Limit orders in REAL mode would need additional handling (place order and wait for fill)
      // For now, limit orders remain simulated even in REAL mode
    }

    const total = numAmount * currentPrice;
    const fee = total * TRADING_FEE_PERCENT;

    if (type === 'BUY') {
      const quoteWallet = await prisma.wallet.findFirst({
        where: { userId: session.userId, currency: quoteCurrency },
      });

      if (!quoteWallet || quoteWallet.balance < total + fee) {
        return NextResponse.json(
          { error: 'Insufficient balance' },
          { status: 400 }
        );
      }

      const trade = await prisma.$transaction(async (tx) => {
        await tx.wallet.update({
          where: { id: quoteWallet.id },
          data: { balance: { decrement: total + fee } },
        });

        let baseWallet = await tx.wallet.findFirst({
          where: { userId: session.userId, currency: baseCurrency },
        });

        if (baseWallet) {
          await tx.wallet.update({
            where: { id: baseWallet.id },
            data: { balance: { increment: numAmount } },
          });
        } else {
          await tx.wallet.create({
            data: {
              userId: session.userId,
              currency: baseCurrency,
              balance: numAmount,
            },
          });
        }

        return tx.trade.create({
          data: {
            userId: session.userId,
            pair,
            type: 'BUY',
            orderType,
            amount: numAmount,
            price: currentPrice,
            total,
            fee,
            status: orderType === 'MARKET' ? 'FILLED' : 'PENDING',
            filledAt: orderType === 'MARKET' ? new Date() : null,
          },
        });
      });

      return NextResponse.json({
        success: true,
        trade: {
          id: trade.id,
          pair: trade.pair,
          type: trade.type,
          amount: trade.amount,
          price: trade.price,
          total: trade.total,
          fee: trade.fee,
          status: trade.status,
        },
      });
    } else {
      const baseWallet = await prisma.wallet.findFirst({
        where: { userId: session.userId, currency: baseCurrency },
      });

      if (!baseWallet || baseWallet.balance < numAmount) {
        return NextResponse.json(
          { error: 'Insufficient balance' },
          { status: 400 }
        );
      }

      const trade = await prisma.$transaction(async (tx) => {
        await tx.wallet.update({
          where: { id: baseWallet.id },
          data: { balance: { decrement: numAmount } },
        });

        let quoteWallet = await tx.wallet.findFirst({
          where: { userId: session.userId, currency: quoteCurrency },
        });

        const netProceeds = total - fee;

        if (quoteWallet) {
          await tx.wallet.update({
            where: { id: quoteWallet.id },
            data: { balance: { increment: netProceeds } },
          });
        } else {
          await tx.wallet.create({
            data: {
              userId: session.userId,
              currency: quoteCurrency,
              balance: netProceeds,
            },
          });
        }

        return tx.trade.create({
          data: {
            userId: session.userId,
            pair,
            type: 'SELL',
            orderType,
            amount: numAmount,
            price: currentPrice,
            total,
            fee,
            status: orderType === 'MARKET' ? 'FILLED' : 'PENDING',
            filledAt: orderType === 'MARKET' ? new Date() : null,
          },
        });
      });

      return NextResponse.json({
        success: true,
        trade: {
          id: trade.id,
          pair: trade.pair,
          type: trade.type,
          amount: trade.amount,
          price: trade.price,
          total: trade.total,
          fee: trade.fee,
          status: trade.status,
        },
      });
    }
  } catch (error) {
    console.error('Trade error:', error);
    return NextResponse.json(
      { error: 'Failed to execute trade' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pair = searchParams.get('pair');
    const status = searchParams.get('status');

    const trades = await prisma.trade.findMany({
      where: {
        userId: session.userId,
        ...(pair && { pair }),
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ trades });
  } catch (error) {
    console.error('Get trades error:', error);
    return NextResponse.json(
      { error: 'Failed to get trades' },
      { status: 500 }
    );
  }
}
