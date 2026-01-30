import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET - List user's bots
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bots = await prisma.tradingBot.findMany({
      where: { userId: session.userId },
      include: {
        botTrades: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ bots });
  } catch (error) {
    console.error('Get bots error:', error);
    return NextResponse.json({ error: 'Failed to get bots' }, { status: 500 });
  }
}

// POST - Create a new bot
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pair, strategy, investment, interval, settings } = await request.json();

    if (!pair || !strategy) {
      return NextResponse.json(
        { error: 'Pair and strategy are required' },
        { status: 400 }
      );
    }

    const validStrategies = ['DCA', 'GRID', 'SCALPER'];
    if (!validStrategies.includes(strategy)) {
      return NextResponse.json(
        { error: 'Invalid strategy. Use DCA, GRID, or SCALPER' },
        { status: 400 }
      );
    }

    // Check if bot already exists for this pair/strategy
    const existing = await prisma.tradingBot.findFirst({
      where: {
        userId: session.userId,
        pair,
        strategy,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Bot already exists for this pair and strategy' },
        { status: 400 }
      );
    }

    const bot = await prisma.tradingBot.create({
      data: {
        userId: session.userId,
        pair,
        strategy,
        investment: investment || 10,
        interval: interval || 60,
        settings: JSON.stringify(settings || {}),
        enabled: false,
      },
    });

    return NextResponse.json({ success: true, bot });
  } catch (error) {
    console.error('Create bot error:', error);
    return NextResponse.json({ error: 'Failed to create bot' }, { status: 500 });
  }
}

// PATCH - Update bot settings or toggle enabled
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { botId, enabled, investment, interval, settings } = await request.json();

    if (!botId) {
      return NextResponse.json({ error: 'Bot ID required' }, { status: 400 });
    }

    const bot = await prisma.tradingBot.findFirst({
      where: { id: botId, userId: session.userId },
    });

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    // If enabling, check user has sufficient balance
    if (enabled && !bot.enabled) {
      const wallet = await prisma.wallet.findFirst({
        where: { userId: session.userId, currency: 'USDT' },
      });

      const requiredBalance = investment || bot.investment;
      if (!wallet || wallet.balance < requiredBalance) {
        return NextResponse.json(
          { error: `Insufficient USDT balance. Need at least $${requiredBalance}` },
          { status: 400 }
        );
      }
    }

    const updatedBot = await prisma.tradingBot.update({
      where: { id: botId },
      data: {
        ...(enabled !== undefined && { enabled }),
        ...(investment && { investment }),
        ...(interval && { interval }),
        ...(settings && { settings: JSON.stringify(settings) }),
      },
    });

    return NextResponse.json({ success: true, bot: updatedBot });
  } catch (error) {
    console.error('Update bot error:', error);
    return NextResponse.json({ error: 'Failed to update bot' }, { status: 500 });
  }
}

// DELETE - Delete a bot
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const botId = searchParams.get('botId');

    if (!botId) {
      return NextResponse.json({ error: 'Bot ID required' }, { status: 400 });
    }

    const bot = await prisma.tradingBot.findFirst({
      where: { id: botId, userId: session.userId },
    });

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    // Delete associated trades first
    await prisma.botTrade.deleteMany({ where: { botId } });
    await prisma.tradingBot.delete({ where: { id: botId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete bot error:', error);
    return NextResponse.json({ error: 'Failed to delete bot' }, { status: 500 });
  }
}
