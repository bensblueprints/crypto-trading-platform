import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, setSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password, username } = await request.json();

    if (!email || !password || !username) {
      return NextResponse.json(
        { error: 'Email, password, and username are required' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email or username already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username,
        wallets: {
          create: [
            { currency: 'USDT', balance: 0 },
            { currency: 'BTC', balance: 0 },
            { currency: 'ETH', balance: 0 },
          ],
        },
      },
      select: {
        id: true,
        email: true,
        username: true,
      },
    });

    await setSession({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
