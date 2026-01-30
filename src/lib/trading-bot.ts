// Auto Trading Bot Strategies
// Generates trading fees for the platform while helping users automate trades

export interface BotConfig {
  userId: string;
  pair: string;
  strategy: 'DCA' | 'GRID' | 'SCALPER';
  enabled: boolean;
  investment: number; // Amount per trade in USDT
  interval: number; // Minutes between trades

  // DCA specific
  dcaBuyOnDip?: number; // Buy when price drops by this %

  // Grid specific
  gridLevels?: number;
  gridSpread?: number; // % spread between levels

  // Scalper specific
  scalperProfit?: number; // Target profit %
  scalperStopLoss?: number; // Stop loss %
}

export interface PriceData {
  pair: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
}

// Simple moving average calculation
export function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1];
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// Relative Strength Index
export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// DCA Strategy: Buy regularly, with extra buys on dips
export function dcaStrategy(
  currentPrice: number,
  previousPrice: number,
  config: BotConfig
): { action: 'BUY' | 'SELL' | 'HOLD'; reason: string } {
  const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;
  const dipThreshold = config.dcaBuyOnDip || 2;

  // Always buy on schedule (DCA)
  if (priceChange <= -dipThreshold) {
    return { action: 'BUY', reason: `Price dipped ${priceChange.toFixed(2)}% - buying the dip` };
  }

  // Regular DCA buy
  return { action: 'BUY', reason: 'Scheduled DCA purchase' };
}

// Grid Trading: Buy low, sell high within a range
export function gridStrategy(
  currentPrice: number,
  avgEntryPrice: number,
  holdings: number,
  config: BotConfig
): { action: 'BUY' | 'SELL' | 'HOLD'; reason: string } {
  const spread = config.gridSpread || 1; // 1% default spread

  if (holdings === 0) {
    return { action: 'BUY', reason: 'No holdings - opening grid position' };
  }

  const profitPercent = ((currentPrice - avgEntryPrice) / avgEntryPrice) * 100;

  if (profitPercent >= spread) {
    return { action: 'SELL', reason: `Grid profit target hit: +${profitPercent.toFixed(2)}%` };
  }

  if (profitPercent <= -spread) {
    return { action: 'BUY', reason: `Grid buy level hit: ${profitPercent.toFixed(2)}%` };
  }

  return { action: 'HOLD', reason: 'Within grid range - holding' };
}

// Scalper Strategy: Quick profits with tight stops
export function scalperStrategy(
  currentPrice: number,
  avgEntryPrice: number,
  holdings: number,
  rsi: number,
  config: BotConfig
): { action: 'BUY' | 'SELL' | 'HOLD'; reason: string } {
  const profitTarget = config.scalperProfit || 0.5; // 0.5% default
  const stopLoss = config.scalperStopLoss || 1; // 1% default

  if (holdings === 0) {
    // Buy on oversold RSI
    if (rsi < 30) {
      return { action: 'BUY', reason: `RSI oversold (${rsi.toFixed(0)}) - scalp entry` };
    }
    return { action: 'HOLD', reason: `Waiting for RSI oversold (current: ${rsi.toFixed(0)})` };
  }

  const profitPercent = ((currentPrice - avgEntryPrice) / avgEntryPrice) * 100;

  // Take profit
  if (profitPercent >= profitTarget) {
    return { action: 'SELL', reason: `Scalp profit: +${profitPercent.toFixed(2)}%` };
  }

  // Stop loss
  if (profitPercent <= -stopLoss) {
    return { action: 'SELL', reason: `Stop loss hit: ${profitPercent.toFixed(2)}%` };
  }

  // Sell on overbought
  if (rsi > 70 && profitPercent > 0) {
    return { action: 'SELL', reason: `RSI overbought (${rsi.toFixed(0)}) - taking profit` };
  }

  return { action: 'HOLD', reason: 'Waiting for profit target or stop loss' };
}

// Execute strategy based on config
export function executeStrategy(
  config: BotConfig,
  currentPrice: number,
  previousPrice: number,
  avgEntryPrice: number,
  holdings: number,
  priceHistory: number[]
): { action: 'BUY' | 'SELL' | 'HOLD'; reason: string } {
  switch (config.strategy) {
    case 'DCA':
      return dcaStrategy(currentPrice, previousPrice, config);

    case 'GRID':
      return gridStrategy(currentPrice, avgEntryPrice, holdings, config);

    case 'SCALPER':
      const rsi = calculateRSI(priceHistory);
      return scalperStrategy(currentPrice, avgEntryPrice, holdings, rsi, config);

    default:
      return { action: 'HOLD', reason: 'Unknown strategy' };
  }
}
