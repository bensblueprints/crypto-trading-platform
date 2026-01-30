import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

const TRADING_FEE_PERCENT = 0.001;

const MOCK_PRICES: Record<string, number> = {
  'BTC/USDT': 43250.50,
  'ETH/USDT': 2635.75,
  'BNB/USDT': 318.20,
  'SOL/USDT': 102.45,
  'XRP/USDT': 0.5520,
};

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

    const [baseCurrency, quoteCurrency] = pair.split('/');
    const currentPrice = orderType === 'MARKET'
      ? MOCK_PRICES[pair] || 0
      : parseFloat(limitPrice);

    if (!currentPrice) {
      return NextResponse.json({ error: 'Invalid trading pair' }, { status: 400 });
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
