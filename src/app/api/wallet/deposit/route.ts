import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { cryptomus } from '@/lib/cryptomus';
import { v4 as uuidv4 } from 'uuid';

const PLATFORM_FEE_PERCENT = parseFloat(process.env.PLATFORM_FEE_PERCENT || '1') / 100;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, currency } = await request.json();

    if (!amount || !currency) {
      return NextResponse.json(
        { error: 'Amount and currency are required' },
        { status: 400 }
      );
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    const orderId = uuidv4();
    const platformFee = numAmount * PLATFORM_FEE_PERCENT;

    const transaction = await prisma.transaction.create({
      data: {
        userId: session.userId,
        type: 'DEPOSIT',
        currency: currency.toUpperCase(),
        amount: numAmount,
        fee: platformFee,
        status: 'PENDING',
        cryptomusId: orderId,
      },
    });

    const invoice = await cryptomus.createInvoice({
      amount: amount.toString(),
      currency: 'USD',
      orderId: orderId,
      urlCallback: `${APP_URL}/api/webhook/cryptomus`,
      urlReturn: `${APP_URL}/dashboard/wallet`,
      urlSuccess: `${APP_URL}/dashboard/wallet?success=true`,
      toCurrency: currency.toUpperCase(),
    });

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { cryptomusId: invoice.result?.uuid || orderId },
    });

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        amount: numAmount,
        fee: platformFee,
        netAmount: numAmount - platformFee,
        currency: currency.toUpperCase(),
      },
      payment: {
        url: invoice.result?.url,
        address: invoice.result?.address,
        uuid: invoice.result?.uuid,
      },
    });
  } catch (error) {
    console.error('Deposit error:', error);
    return NextResponse.json(
      { error: 'Failed to create deposit' },
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
    const currency = searchParams.get('currency');

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.userId,
        type: 'DEPOSIT',
        ...(currency && { currency: currency.toUpperCase() }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Get deposits error:', error);
    return NextResponse.json(
      { error: 'Failed to get deposits' },
      { status: 500 }
    );
  }
}
