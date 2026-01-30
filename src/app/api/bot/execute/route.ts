import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { executeStrategy } from '@/lib/trading-bot';

const TRADING_FEE_PERCENT = 0.001; // 0.1%

// Price history cache for RSI calculation
const priceHistoryCache: Record<string, number[]> = {};

async function fetchCurrentPrice(pair: string): Promise<number | null> {
  try {
    const symbol = pair.replace('/', '');
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
      { cache: 'no-store' }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return parseFloat(data.price);
  } catch {
    return null;
  }
}

// Execute a single bot
async function executeBotTrade(bot: any, currentPrice: number) {
  const [baseCurrency, quoteCurrency] = bot.pair.split('/');
  const settings = JSON.parse(bot.settings || '{}');

  // Get price history for this pair
  if (!priceHistoryCache[bot.pair]) {
    priceHistoryCache[bot.pair] = [];
  }
  priceHistoryCache[bot.pair].push(currentPrice);
  if (priceHistoryCache[bot.pair].length > 100) {
    priceHistoryCache[bot.pair].shift();
  }

  const previousPrice = priceHistoryCache[bot.pair].length > 1
    ? priceHistoryCache[bot.pair][priceHistoryCache[bot.pair].length - 2]
    : currentPrice;

  // Execute strategy
  const config = {
    userId: bot.userId,
    pair: bot.pair,
    strategy: bot.strategy,
    enabled: bot.enabled,
    investment: bot.investment,
    interval: bot.interval,
    dcaBuyOnDip: settings.dcaBuyOnDip || 2,
    gridLevels: settings.gridLevels || 5,
    gridSpread: settings.gridSpread || 1,
    scalperProfit: settings.scalperProfit || 0.5,
    scalperStopLoss: settings.scalperStopLoss || 1,
  };

  const decision = executeStrategy(
    config,
    currentPrice,
    previousPrice,
    bot.avgEntryPrice || currentPrice,
    bot.holdings,
    priceHistoryCache[bot.pair]
  );

  if (decision.action === 'HOLD') {
    return { action: 'HOLD', reason: decision.reason };
  }

  // Get user's wallets
  const usdtWallet = await prisma.wallet.findFirst({
    where: { userId: bot.userId, currency: quoteCurrency },
  });

  const cryptoWallet = await prisma.wallet.findFirst({
    where: { userId: bot.userId, currency: baseCurrency },
  });

  if (decision.action === 'BUY') {
    // Check if user has enough USDT
    if (!usdtWallet || usdtWallet.balance < bot.investment) {
      return { action: 'SKIP', reason: 'Insufficient USDT balance' };
    }

    const amount = bot.investment / currentPrice;
    const total = bot.investment;
    const fee = total * TRADING_FEE_PERCENT;

    // Execute buy trade
    await prisma.$transaction(async (tx) => {
      // Deduct USDT
      await tx.wallet.update({
        where: { id: usdtWallet.id },
        data: { balance: { decrement: total + fee } },
      });

      // Add crypto
      if (cryptoWallet) {
        await tx.wallet.update({
          where: { id: cryptoWallet.id },
          data: { balance: { increment: amount } },
        });
      } else {
        await tx.wallet.create({
          data: {
            userId: bot.userId,
            currency: baseCurrency,
            balance: amount,
          },
        });
      }

      // Record trade in main trades table (for fee tracking)
      await tx.trade.create({
        data: {
          userId: bot.userId,
          pair: bot.pair,
          type: 'BUY',
          orderType: 'MARKET',
          amount,
          price: currentPrice,
          total,
          fee,
          status: 'FILLED',
          filledAt: new Date(),
        },
      });

      // Record bot trade
      await tx.botTrade.create({
        data: {
          botId: bot.id,
          type: 'BUY',
          amount,
          price: currentPrice,
          total,
          fee,
          profit: 0,
          reason: decision.reason,
        },
      });

      // Update bot stats
      const newTotalInvested = bot.totalInvested + total;
      const newHoldings = bot.holdings + amount;
      const newAvgEntry = newTotalInvested / newHoldings;

      await tx.tradingBot.update({
        where: { id: bot.id },
        data: {
          totalInvested: newTotalInvested,
          holdings: newHoldings,
          avgEntryPrice: newAvgEntry,
          tradesCount: { increment: 1 },
          lastTradeAt: new Date(),
        },
      });
    });

    return {
      action: 'BUY',
      amount,
      price: currentPrice,
      total,
      fee,
      reason: decision.reason,
    };
  }

  if (decision.action === 'SELL') {
    // Check if bot has holdings to sell
    if (bot.holdings <= 0) {
      return { action: 'SKIP', reason: 'No holdings to sell' };
    }

    // Sell all holdings
    const amount = bot.holdings;
    const total = amount * currentPrice;
    const fee = total * TRADING_FEE_PERCENT;
    const netProceeds = total - fee;
    const profit = netProceeds - bot.totalInvested;

    await prisma.$transaction(async (tx) => {
      // Deduct crypto
      if (cryptoWallet) {
        await tx.wallet.update({
          where: { id: cryptoWallet.id },
          data: { balance: { decrement: amount } },
        });
      }

      // Add USDT
      if (usdtWallet) {
        await tx.wallet.update({
          where: { id: usdtWallet.id },
          data: { balance: { increment: netProceeds } },
        });
      } else {
        await tx.wallet.create({
          data: {
            userId: bot.userId,
            currency: quoteCurrency,
            balance: netProceeds,
          },
        });
      }

      // Record trade in main trades table
      await tx.trade.create({
        data: {
          userId: bot.userId,
          pair: bot.pair,
          type: 'SELL',
          orderType: 'MARKET',
          amount,
          price: currentPrice,
          total,
          fee,
          status: 'FILLED',
          filledAt: new Date(),
        },
      });

      // Record bot trade
      await tx.botTrade.create({
        data: {
          botId: bot.id,
          type: 'SELL',
          amount,
          price: currentPrice,
          total,
          fee,
          profit,
          reason: decision.reason,
        },
      });

      // Update bot stats
      await tx.tradingBot.update({
        where: { id: bot.id },
        data: {
          totalInvested: 0,
          holdings: 0,
          avgEntryPrice: 0,
          totalProfit: { increment: profit },
          tradesCount: { increment: 1 },
          lastTradeAt: new Date(),
        },
      });
    });

    return {
      action: 'SELL',
      amount,
      price: currentPrice,
      total,
      fee,
      profit,
      reason: decision.reason,
    };
  }

  return { action: 'HOLD', reason: 'No action taken' };
}

// POST - Execute all active bots (called by cron or manually)
export async function POST() {
  try {
    const results: any[] = [];

    // Get all enabled bots that are due for execution
    const bots = await prisma.tradingBot.findMany({
      where: { enabled: true },
    });

    for (const bot of bots) {
      // Check if enough time has passed since last trade
      if (bot.lastTradeAt) {
        const minutesSinceLastTrade = (Date.now() - bot.lastTradeAt.getTime()) / 60000;
        if (minutesSinceLastTrade < bot.interval) {
          results.push({
            botId: bot.id,
            pair: bot.pair,
            strategy: bot.strategy,
            action: 'SKIP',
            reason: `Next trade in ${Math.ceil(bot.interval - minutesSinceLastTrade)} minutes`,
          });
          continue;
        }
      }

      // Get current price
      const currentPrice = await fetchCurrentPrice(bot.pair);
      if (!currentPrice) {
        results.push({
          botId: bot.id,
          pair: bot.pair,
          strategy: bot.strategy,
          action: 'ERROR',
          reason: 'Failed to fetch price',
        });
        continue;
      }

      try {
        const result = await executeBotTrade(bot, currentPrice);
        results.push({
          botId: bot.id,
          pair: bot.pair,
          strategy: bot.strategy,
          ...result,
        });
      } catch (error) {
        console.error(`Bot ${bot.id} error:`, error);
        results.push({
          botId: bot.id,
          pair: bot.pair,
          strategy: bot.strategy,
          action: 'ERROR',
          reason: 'Trade execution failed',
        });
      }
    }

    return NextResponse.json({
      success: true,
      executed: results.filter(r => r.action === 'BUY' || r.action === 'SELL').length,
      total: bots.length,
      results,
    });
  } catch (error) {
    console.error('Bot execution error:', error);
    return NextResponse.json({ error: 'Failed to execute bots' }, { status: 500 });
  }
}

// GET - Get execution status
export async function GET() {
  try {
    const activeBots = await prisma.tradingBot.count({ where: { enabled: true } });
    const totalBots = await prisma.tradingBot.count();
    const totalBotTrades = await prisma.botTrade.count();

    const profitStats = await prisma.botTrade.aggregate({
      _sum: { profit: true, fee: true },
    });

    return NextResponse.json({
      activeBots,
      totalBots,
      totalBotTrades,
      totalProfit: profitStats._sum.profit || 0,
      totalFees: profitStats._sum.fee || 0,
    });
  } catch (error) {
    console.error('Bot status error:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}
