import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { cryptomus } from '@/lib/cryptomus';
import { v4 as uuidv4 } from 'uuid';

const WITHDRAWAL_FEE_PERCENT = 0.005;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, currency, address, network } = await request.json();

    if (!amount || !currency || !address || !network) {
      return NextResponse.json(
        { error: 'Amount, currency, address, and network are required' },
        { status: 400 }
      );
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const wallet = await prisma.wallet.findFirst({
      where: {
        userId: session.userId,
        currency: currency.toUpperCase(),
      },
    });

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const platformFee = numAmount * WITHDRAWAL_FEE_PERCENT;
    const totalDeduction = numAmount + platformFee;

    if (wallet.balance < totalDeduction) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      );
    }

    const orderId = uuidv4();

    const transaction = await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: totalDeduction },
          lockedBalance: { increment: totalDeduction },
        },
      });

      return tx.transaction.create({
        data: {
          userId: session.userId,
          type: 'WITHDRAWAL',
          currency: currency.toUpperCase(),
          amount: numAmount,
          fee: platformFee,
          status: 'PENDING',
          walletAddress: address,
          cryptomusId: orderId,
        },
      });
    });

    try {
      const payout = await cryptomus.createPayout({
        amount: numAmount.toString(),
        currency: currency.toUpperCase(),
        orderId: orderId,
        address: address,
        network: network,
        urlCallback: `${APP_URL}/api/webhook/cryptomus`,
      });

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { cryptomusId: payout.result?.uuid || orderId },
      });

      return NextResponse.json({
        success: true,
        transaction: {
          id: transaction.id,
          amount: numAmount,
          fee: platformFee,
          netAmount: numAmount,
          currency: currency.toUpperCase(),
          address: address,
        },
        payout: {
          uuid: payout.result?.uuid,
          status: payout.result?.status,
        },
      });
    } catch (payoutError) {
      await prisma.$transaction(async (tx) => {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: { increment: totalDeduction },
            lockedBalance: { decrement: totalDeduction },
          },
        });

        await tx.transaction.update({
          where: { id: transaction.id },
          data: { status: 'FAILED' },
        });
      });

      console.error('Payout error:', payoutError);
      return NextResponse.json(
        { error: 'Failed to process withdrawal' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Withdrawal error:', error);
    return NextResponse.json(
      { error: 'Failed to create withdrawal' },
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
        type: 'WITHDRAWAL',
        ...(currency && { currency: currency.toUpperCase() }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Get withdrawals error:', error);
    return NextResponse.json(
      { error: 'Failed to get withdrawals' },
      { status: 500 }
    );
  }
}
