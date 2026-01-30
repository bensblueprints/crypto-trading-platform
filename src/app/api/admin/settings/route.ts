import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { BinanceClient } from '@/lib/binance';

const ADMIN_EMAILS = ['admin@cryptotrade.com', 'ben@justfeatured.com'];

async function isAdmin(request: NextRequest) {
  const session = await getSession();
  if (!session) return false;
  return ADMIN_EMAILS.includes(session.email.toLowerCase());
}

// GET - Get platform settings
export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let settings = await prisma.platformSettings.findUnique({
      where: { id: 'settings' },
    });

    if (!settings) {
      settings = await prisma.platformSettings.create({
        data: { id: 'settings' },
      });
    }

    // Don't expose API secret in response
    return NextResponse.json({
      ...settings,
      binanceSecret: settings.binanceSecret ? '********' : null,
      binanceConfigured: !!(settings.binanceApiKey && settings.binanceSecret),
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json({ error: 'Failed to get settings' }, { status: 500 });
  }
}

// PATCH - Update platform settings
export async function PATCH(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      tradingMode,
      binanceApiKey,
      binanceSecret,
      depositFee,
      withdrawalFee,
      tradingFee,
    } = body;

    // Validate trading mode
    if (tradingMode && !['SIMULATED', 'REAL'].includes(tradingMode)) {
      return NextResponse.json(
        { error: 'Invalid trading mode. Must be SIMULATED or REAL' },
        { status: 400 }
      );
    }

    // If switching to REAL mode, validate Binance credentials
    if (tradingMode === 'REAL') {
      const currentSettings = await prisma.platformSettings.findUnique({
        where: { id: 'settings' },
      });

      const apiKey = binanceApiKey || currentSettings?.binanceApiKey;
      const secret = binanceSecret || currentSettings?.binanceSecret;

      if (!apiKey || !secret) {
        return NextResponse.json(
          { error: 'Binance API credentials required for REAL trading mode' },
          { status: 400 }
        );
      }

      // Test Binance API connection
      const client = new BinanceClient({ apiKey, apiSecret: secret });
      const isValid = await client.validateKeys();

      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid Binance API credentials. Please check your API key and secret.' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (tradingMode) updateData.tradingMode = tradingMode;
    if (binanceApiKey) updateData.binanceApiKey = binanceApiKey;
    if (binanceSecret) updateData.binanceSecret = binanceSecret;
    if (typeof depositFee === 'number') updateData.depositFee = depositFee;
    if (typeof withdrawalFee === 'number') updateData.withdrawalFee = withdrawalFee;
    if (typeof tradingFee === 'number') updateData.tradingFee = tradingFee;

    const settings = await prisma.platformSettings.upsert({
      where: { id: 'settings' },
      update: updateData,
      create: {
        id: 'settings',
        ...updateData,
      },
    });

    return NextResponse.json({
      success: true,
      settings: {
        ...settings,
        binanceSecret: settings.binanceSecret ? '********' : null,
        binanceConfigured: !!(settings.binanceApiKey && settings.binanceSecret),
      },
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

// POST - Test Binance API connection
export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { binanceApiKey, binanceSecret } = await request.json();

    if (!binanceApiKey || !binanceSecret) {
      return NextResponse.json(
        { error: 'API key and secret are required' },
        { status: 400 }
      );
    }

    const client = new BinanceClient({
      apiKey: binanceApiKey,
      apiSecret: binanceSecret,
    });

    // Test connection
    const pingOk = await client.ping();
    if (!pingOk) {
      return NextResponse.json({
        success: false,
        error: 'Cannot connect to Binance API',
      });
    }

    // Validate API keys
    const isValid = await client.validateKeys();
    if (!isValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API credentials',
      });
    }

    // Get account info
    const balances = await client.getBalances();

    return NextResponse.json({
      success: true,
      message: 'Binance API connection successful',
      balances,
    });
  } catch (error) {
    console.error('Test Binance connection error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    });
  }
}
