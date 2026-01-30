import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cryptomus } from '@/lib/cryptomus';

const PLATFORM_FEE_PERCENT = parseFloat(process.env.PLATFORM_FEE_PERCENT || '1') / 100;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const sign = request.headers.get('sign') || '';

    if (!cryptomus.verifyWebhook(body, sign)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const data = JSON.parse(body);
    const {
      uuid,
      order_id,
      status,
      amount,
      currency,
      txid,
      type,
    } = data;

    console.log('Cryptomus webhook received:', { uuid, order_id, status, type });

    const transaction = await prisma.transaction.findFirst({
      where: {
        OR: [
          { cryptomusId: uuid },
          { cryptomusId: order_id },
        ],
      },
    });

    if (!transaction) {
      console.error('Transaction not found:', { uuid, order_id });
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (transaction.status === 'COMPLETED') {
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    if (status === 'paid' || status === 'paid_over') {
      if (transaction.type === 'DEPOSIT') {
        const numAmount = parseFloat(amount);
        const platformFee = numAmount * PLATFORM_FEE_PERCENT;
        const netAmount = numAmount - platformFee;

        await prisma.$transaction(async (tx) => {
          const wallet = await tx.wallet.findFirst({
            where: {
              userId: transaction.userId,
              currency: currency.toUpperCase(),
            },
          });

          if (wallet) {
            await tx.wallet.update({
              where: { id: wallet.id },
              data: { balance: { increment: netAmount } },
            });
          } else {
            await tx.wallet.create({
              data: {
                userId: transaction.userId,
                currency: currency.toUpperCase(),
                balance: netAmount,
              },
            });
          }

          await tx.transaction.update({
            where: { id: transaction.id },
            data: {
              status: 'COMPLETED',
              amount: numAmount,
              fee: platformFee,
              txHash: txid,
            },
          });
        });
      } else if (transaction.type === 'WITHDRAWAL') {
        const wallet = await prisma.wallet.findFirst({
          where: {
            userId: transaction.userId,
            currency: transaction.currency,
          },
        });

        if (wallet) {
          await prisma.$transaction(async (tx) => {
            await tx.wallet.update({
              where: { id: wallet.id },
              data: {
                lockedBalance: { decrement: transaction.amount + transaction.fee },
              },
            });

            await tx.transaction.update({
              where: { id: transaction.id },
              data: {
                status: 'COMPLETED',
                txHash: txid,
              },
            });
          });
        }
      }
    } else if (status === 'cancel' || status === 'fail' || status === 'wrong_amount') {
      if (transaction.type === 'WITHDRAWAL') {
        const wallet = await prisma.wallet.findFirst({
          where: {
            userId: transaction.userId,
            currency: transaction.currency,
          },
        });

        if (wallet) {
          await prisma.$transaction(async (tx) => {
            const totalAmount = transaction.amount + transaction.fee;
            await tx.wallet.update({
              where: { id: wallet.id },
              data: {
                balance: { increment: totalAmount },
                lockedBalance: { decrement: totalAmount },
              },
            });

            await tx.transaction.update({
              where: { id: transaction.id },
              data: { status: 'FAILED' },
            });
          });
        }
      } else {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: 'FAILED' },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
