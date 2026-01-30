import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

// Admin emails that can access stats
const ADMIN_EMAILS = ['admin@cryptotrade.com', 'ben@justfeatured.com'];

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get deposit fee totals
    const depositStats = await prisma.transaction.aggregate({
      where: {
        type: 'DEPOSIT',
        status: 'COMPLETED',
      },
      _sum: {
        amount: true,
        fee: true,
      },
      _count: true,
    });

    // Get withdrawal fee totals
    const withdrawalStats = await prisma.transaction.aggregate({
      where: {
        type: 'WITHDRAWAL',
        status: 'COMPLETED',
      },
      _sum: {
        amount: true,
        fee: true,
      },
      _count: true,
    });

    // Get trading fee totals
    const tradingStats = await prisma.trade.aggregate({
      where: {
        status: 'FILLED',
      },
      _sum: {
        total: true,
        fee: true,
      },
      _count: true,
    });

    // Get pending transactions
    const pendingDeposits = await prisma.transaction.count({
      where: { type: 'DEPOSIT', status: 'PENDING' },
    });

    const pendingWithdrawals = await prisma.transaction.count({
      where: { type: 'WITHDRAWAL', status: 'PENDING' },
    });

    // Get user stats
    const totalUsers = await prisma.user.count();
    const usersWithBalance = await prisma.wallet.groupBy({
      by: ['userId'],
      where: { balance: { gt: 0 } },
    });

    // Get recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: { email: true, username: true },
        },
      },
    });

    // Get recent trades
    const recentTrades = await prisma.trade.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: { email: true, username: true },
        },
      },
    });

    const totalFees =
      (depositStats._sum.fee || 0) +
      (withdrawalStats._sum.fee || 0) +
      (tradingStats._sum.fee || 0);

    return NextResponse.json({
      revenue: {
        totalFees,
        depositFees: depositStats._sum.fee || 0,
        withdrawalFees: withdrawalStats._sum.fee || 0,
        tradingFees: tradingStats._sum.fee || 0,
      },
      volume: {
        totalDeposits: depositStats._sum.amount || 0,
        totalWithdrawals: withdrawalStats._sum.amount || 0,
        totalTradeVolume: tradingStats._sum.total || 0,
      },
      counts: {
        deposits: depositStats._count,
        withdrawals: withdrawalStats._count,
        trades: tradingStats._count,
        pendingDeposits,
        pendingWithdrawals,
      },
      users: {
        total: totalUsers,
        withBalance: usersWithBalance.length,
      },
      recent: {
        transactions: recentTransactions.map(t => ({
          id: t.id,
          type: t.type,
          currency: t.currency,
          amount: t.amount,
          fee: t.fee,
          status: t.status,
          user: t.user.email,
          createdAt: t.createdAt,
        })),
        trades: recentTrades.map(t => ({
          id: t.id,
          pair: t.pair,
          type: t.type,
          amount: t.amount,
          price: t.price,
          total: t.total,
          fee: t.fee,
          status: t.status,
          user: t.user.email,
          createdAt: t.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get admin stats' },
      { status: 500 }
    );
  }
}
