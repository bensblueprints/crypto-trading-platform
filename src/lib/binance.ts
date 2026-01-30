import crypto from 'crypto';

interface BinanceConfig {
  apiKey: string;
  apiSecret: string;
  testnet?: boolean;
}

interface OrderParams {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: number;
  price?: number;
}

interface BinanceOrder {
  symbol: string;
  orderId: number;
  clientOrderId: string;
  transactTime: number;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  type: string;
  side: string;
  fills: Array<{
    price: string;
    qty: string;
    commission: string;
    commissionAsset: string;
  }>;
}

const BINANCE_API_URL = 'https://api.binance.com';
const BINANCE_TESTNET_URL = 'https://testnet.binance.vision';

function createSignature(queryString: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
}

export class BinanceClient {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor(config: BinanceConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.baseUrl = config.testnet ? BINANCE_TESTNET_URL : BINANCE_API_URL;
  }

  private async signedRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE',
    params: Record<string, string | number> = {}
  ) {
    const timestamp = Date.now();
    const queryParams = new URLSearchParams({
      ...Object.fromEntries(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ),
      timestamp: String(timestamp),
    });

    const signature = createSignature(queryParams.toString(), this.apiSecret);
    queryParams.append('signature', signature);

    const url = `${this.baseUrl}${endpoint}?${queryParams.toString()}`;

    const response = await fetch(url, {
      method,
      headers: {
        'X-MBX-APIKEY': this.apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Binance API Error: ${error.msg || response.statusText}`);
    }

    return response.json();
  }

  // Get account information
  async getAccountInfo() {
    return this.signedRequest('/api/v3/account', 'GET');
  }

  // Get current price for a symbol
  async getPrice(symbol: string): Promise<number> {
    const response = await fetch(
      `${this.baseUrl}/api/v3/ticker/price?symbol=${symbol}`
    );
    const data = await response.json();
    return parseFloat(data.price);
  }

  // Place a market order
  async placeMarketOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    quantity: number
  ): Promise<BinanceOrder> {
    return this.signedRequest('/api/v3/order', 'POST', {
      symbol,
      side,
      type: 'MARKET',
      quantity,
    });
  }

  // Place a limit order
  async placeLimitOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    quantity: number,
    price: number
  ): Promise<BinanceOrder> {
    return this.signedRequest('/api/v3/order', 'POST', {
      symbol,
      side,
      type: 'LIMIT',
      timeInForce: 'GTC',
      quantity,
      price,
    });
  }

  // Cancel an order
  async cancelOrder(symbol: string, orderId: number) {
    return this.signedRequest('/api/v3/order', 'DELETE', {
      symbol,
      orderId,
    });
  }

  // Get open orders
  async getOpenOrders(symbol?: string) {
    const params: Record<string, string> = {};
    if (symbol) params.symbol = symbol;
    return this.signedRequest('/api/v3/openOrders', 'GET', params);
  }

  // Get order status
  async getOrderStatus(symbol: string, orderId: number) {
    return this.signedRequest('/api/v3/order', 'GET', {
      symbol,
      orderId,
    });
  }

  // Get account balances
  async getBalances(): Promise<Record<string, { free: number; locked: number }>> {
    const account = await this.getAccountInfo();
    const balances: Record<string, { free: number; locked: number }> = {};

    for (const balance of account.balances) {
      const free = parseFloat(balance.free);
      const locked = parseFloat(balance.locked);
      if (free > 0 || locked > 0) {
        balances[balance.asset] = { free, locked };
      }
    }

    return balances;
  }

  // Test connectivity
  async ping(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v3/ping`);
      return response.ok;
    } catch {
      return false;
    }
  }

  // Validate API keys
  async validateKeys(): Promise<boolean> {
    try {
      await this.getAccountInfo();
      return true;
    } catch {
      return false;
    }
  }
}

// Execute a real trade on Binance
export async function executeRealTrade(
  config: BinanceConfig,
  params: OrderParams
): Promise<BinanceOrder> {
  const client = new BinanceClient(config);

  // Convert pair format: BTC/USDT -> BTCUSDT
  const symbol = params.symbol.replace('/', '');

  if (params.type === 'MARKET') {
    return client.placeMarketOrder(symbol, params.side, params.quantity);
  } else {
    if (!params.price) {
      throw new Error('Price is required for limit orders');
    }
    return client.placeLimitOrder(symbol, params.side, params.quantity, params.price);
  }
}

// Get minimum order quantities for Binance
export const BINANCE_MIN_QUANTITIES: Record<string, number> = {
  BTCUSDT: 0.00001,
  ETHUSDT: 0.0001,
  BNBUSDT: 0.001,
  SOLUSDT: 0.01,
  XRPUSDT: 0.1,
  DOGEUSDT: 1,
  ADAUSDT: 1,
  DOTUSDT: 0.1,
  MATICUSDT: 1,
  LTCUSDT: 0.001,
};

// Format quantity to Binance precision
export function formatQuantity(symbol: string, quantity: number): number {
  const minQty = BINANCE_MIN_QUANTITIES[symbol.replace('/', '')] || 0.00001;
  const precision = Math.ceil(-Math.log10(minQty));
  return Math.floor(quantity * Math.pow(10, precision)) / Math.pow(10, precision);
}
