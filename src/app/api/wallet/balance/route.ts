import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const wallets = await prisma.wallet.findMany({
      where: { userId: session.userId },
      select: {
        id: true,
        currency: true,
        balance: true,
        lockedBalance: true,
        address: true,
      },
    });

    const totalUSD = wallets.reduce((acc, wallet) => {
      const prices: Record<string, number> = {
        USDT: 1,
        BTC: 43000,
        ETH: 2600,
        BNB: 320,
        SOL: 100,
        XRP: 0.55,
      };
      return acc + wallet.balance * (prices[wallet.currency] || 0);
    }, 0);

    return NextResponse.json({
      wallets,
      totalUSD,
    });
  } catch (error) {
    console.error('Get balance error:', error);
    return NextResponse.json(
      { error: 'Failed to get balance' },
      { status: 500 }
    );
  }
}
