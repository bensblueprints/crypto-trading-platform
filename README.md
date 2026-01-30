# Crypto Trading Platform

A cryptocurrency trading platform with integrated Cryptomus payments, real-time Binance prices, and automatic fee collection.

## Revenue Model - How You Make Money

### Fee Structure (Your Profit)

| Transaction Type | Platform Fee | Your Revenue Per $1,000 |
|-----------------|--------------|-------------------------|
| **Deposits**    | 1.0%         | $10.00                  |
| **Withdrawals** | 0.5%         | $5.00                   |
| **Trading**     | 0.1%         | $1.00                   |

### Revenue Example

For a user who:
- Deposits $10,000 USDT
- Makes 20 trades totaling $50,000 volume
- Withdraws $9,000

**Your earnings:**
```
Deposit fee:    $10,000 x 1.0%  = $100.00
Trading fees:   $50,000 x 0.1%  = $50.00
Withdrawal fee: $9,000  x 0.5%  = $45.00
----------------------------------------
TOTAL PROFIT:                    $195.00
```

### Monthly Revenue Projections

| Active Users | Avg Deposit | Trades/User | Monthly Revenue |
|--------------|-------------|-------------|-----------------|
| 100          | $1,000      | $5,000      | $2,000+         |
| 500          | $2,000      | $10,000     | $15,000+        |
| 1,000        | $5,000      | $25,000     | $50,000+        |

---

## How The Platform Works

### User Flow

```
1. REGISTER         2. DEPOSIT          3. TRADE
   Email/Password ->   Crypto via    ->   Buy/Sell
   Create account      Cryptomus         Real-time prices
                       (You get 1%)      (You get 0.1%)

4. PROFIT           5. WITHDRAW
   User trades  ->     Crypto payout
   and profits         via Cryptomus
                       (You get 0.5%)
```

### Money Flow

```
USER (deposits) --> CRYPTOMUS (gateway) --> YOUR WALLET (platform)
                          |
                          v
                    BLOCKCHAIN (settlement)
```

---

## Where Fees Are Collected

### 1. Deposit Fee (1%)
**File:** `src/app/api/wallet/deposit/route.ts`

```typescript
const PLATFORM_FEE_PERCENT = parseFloat(process.env.PLATFORM_FEE_PERCENT || '1') / 100;
const platformFee = numAmount * PLATFORM_FEE_PERCENT;
```

When user deposits $1,000:
- Fee collected: $10
- User receives: $990 in their wallet

### 2. Withdrawal Fee (0.5%)
**File:** `src/app/api/wallet/withdraw/route.ts`

```typescript
const WITHDRAWAL_FEE_PERCENT = 0.005; // 0.5%
const platformFee = numAmount * WITHDRAWAL_FEE_PERCENT;
```

When user withdraws $1,000:
- Fee collected: $5
- User's balance deducted: $1,005

### 3. Trading Fee (0.1%)
**File:** `src/app/api/trade/route.ts`

```typescript
const TRADING_FEE_PERCENT = 0.001; // 0.1%
const fee = total * TRADING_FEE_PERCENT;
```

When user makes $1,000 trade:
- Fee collected: $1
- Deducted from trade amount

---

## Database Schema

**File:** `prisma/schema.prisma`

### Key Tables

| Table | Purpose |
|-------|---------|
| `User` | User accounts (email, password, username) |
| `Wallet` | User balances per currency (BTC, ETH, USDT, etc.) |
| `Transaction` | Deposit/withdrawal records with fees |
| `Trade` | Buy/sell orders with fees |
| `PlatformSettings` | Configurable fee percentages |

### Fee Tracking

All fees are stored in the database:
- `Transaction.fee` - Deposit/withdrawal platform fee
- `Transaction.cryptomusFee` - Network fees (Cryptomus)
- `Trade.fee` - Trading fee

---

## Cryptomus Integration

### How Payments Work

1. **User initiates deposit**
2. **Platform creates Cryptomus invoice**
3. **User pays to Cryptomus wallet**
4. **Cryptomus sends webhook on payment**
5. **Platform credits user (minus 1% fee)**

### Webhook Handler
**File:** `src/app/api/webhook/cryptomus/route.ts`

Automatically processes:
- Deposit confirmations
- Withdrawal completions
- Failed transaction handling

### API Keys (in .env)

```env
CRYPTOMUS_MERCHANT_ID=your-merchant-id
CRYPTOMUS_PAYMENT_API_KEY=your-payment-key
CRYPTOMUS_PAYOUT_API_KEY=your-payout-key
```

---

## Real-Time Prices

### Binance Integration

**File:** `src/app/api/trade/prices/route.ts`

- Fetches live prices from Binance public API
- Updates every 5 seconds
- 10 trading pairs supported

### Supported Pairs

| Pair | Description |
|------|-------------|
| BTC/USDT | Bitcoin |
| ETH/USDT | Ethereum |
| BNB/USDT | Binance Coin |
| SOL/USDT | Solana |
| XRP/USDT | Ripple |
| ADA/USDT | Cardano |
| DOGE/USDT | Dogecoin |
| DOT/USDT | Polkadot |
| MATIC/USDT | Polygon |
| LTC/USDT | Litecoin |

---

## Setup & Deployment

### Local Development

```bash
# Install dependencies
npm install

# Setup database
npx prisma db push

# Create test users (optional)
npx prisma db seed

# Run development server
npm run dev -- -p 3001
```

### Environment Variables

Create `.env` file:

```env
# Database
DATABASE_URL="file:./dev.db"

# Cryptomus API (from cryptomus.com dashboard)
CRYPTOMUS_MERCHANT_ID="your-merchant-id"
CRYPTOMUS_PAYMENT_API_KEY="your-payment-api-key"
CRYPTOMUS_PAYOUT_API_KEY="your-payout-api-key"

# Security
JWT_SECRET="generate-a-secure-random-string"

# Platform Settings
PLATFORM_FEE_PERCENT=1
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

### Production Deployment

1. **Set up PostgreSQL** (replace SQLite)
2. **Configure Cryptomus webhooks** to `https://your-domain.com/api/webhook/cryptomus`
3. **Update .env** with production values
4. **Deploy to Vercel/Railway/VPS**

---

## Admin Operations

### View All Fees Collected

Query the database:

```sql
-- Total deposit fees
SELECT SUM(fee) as total_deposit_fees
FROM Transaction
WHERE type = 'DEPOSIT' AND status = 'COMPLETED';

-- Total withdrawal fees
SELECT SUM(fee) as total_withdrawal_fees
FROM Transaction
WHERE type = 'WITHDRAWAL' AND status = 'COMPLETED';

-- Total trading fees
SELECT SUM(fee) as total_trading_fees
FROM Trade
WHERE status = 'FILLED';
```

### Adjust Fees

Modify in code:
- **Deposit fee:** `.env` -> `PLATFORM_FEE_PERCENT=1`
- **Withdrawal fee:** `src/app/api/wallet/withdraw/route.ts` -> `WITHDRAWAL_FEE_PERCENT`
- **Trading fee:** `src/app/api/trade/route.ts` -> `TRADING_FEE_PERCENT`

Or use `PlatformSettings` table for dynamic configuration.

---

## Test Accounts

| Role | Email | Password | Balance |
|------|-------|----------|---------|
| User | test@example.com | testuser123 | $1,000 USDT, 0.05 BTC, 0.5 ETH |
| Admin | admin@cryptotrade.com | admin123 | $100,000 USDT, 10 BTC, 100 ETH |

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user |

### Wallet
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wallet/balance` | Get all balances |
| POST | `/api/wallet/deposit` | Create deposit |
| POST | `/api/wallet/withdraw` | Create withdrawal |

### Trading
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trade/prices` | Live prices (Binance) |
| POST | `/api/trade` | Execute trade |
| GET | `/api/trade` | Trade history |

### Webhooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhook/cryptomus` | Cryptomus callbacks |

---

## Security Considerations

1. **Change JWT_SECRET** in production
2. **Use HTTPS** for all traffic
3. **Enable rate limiting** for API endpoints
4. **Implement 2FA** for user accounts
5. **Regular security audits**

---

## Tech Stack

- **Frontend:** Next.js 16, React, TailwindCSS
- **Backend:** Next.js API Routes
- **Database:** SQLite (dev) / PostgreSQL (prod)
- **ORM:** Prisma 5
- **Auth:** JWT with HTTP-only cookies
- **Payments:** Cryptomus
- **Prices:** Binance API
- **Charts:** lightweight-charts
- **State:** Zustand

---

## File Structure

```
trading-bot/
├── prisma/
│   └── schema.prisma          # Database models
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/          # Login, register, logout
│   │   │   ├── trade/         # Trading + prices
│   │   │   ├── wallet/        # Deposit, withdraw, balance
│   │   │   └── webhook/       # Cryptomus webhooks
│   │   ├── dashboard/         # User dashboard pages
│   │   ├── login/             # Login page
│   │   └── register/          # Register page
│   ├── lib/
│   │   ├── auth.ts            # JWT utilities
│   │   ├── cryptomus.ts       # Cryptomus API wrapper
│   │   └── db.ts              # Prisma client
│   └── store/
│       └── useStore.ts        # Zustand state
└── .env                       # Environment variables
```

---

## Support

For issues or questions:
- GitHub: github.com/bensblueprints/crypto-trading-platform
- Email: Ben@JustFeatured.com
