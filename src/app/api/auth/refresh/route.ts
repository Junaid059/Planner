// Auth API - Refresh Token endpoint
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId } from '@/lib/db/mongodb';
import { User } from '@/lib/db/models';
import { verifyRefreshToken, generateTokens } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie
    const refreshToken = request.cookies.get('refreshToken')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH002', message: 'Refresh token not found' } },
        { status: 401 }
      );
    }

    // Verify refresh token
    const payload = await verifyRefreshToken(refreshToken);

    if (!payload) {
      const response = NextResponse.json(
        { success: false, error: { code: 'AUTH002', message: 'Invalid or expired refresh token' } },
        { status: 401 }
      );
      response.cookies.delete('refreshToken');
      return response;
    }

    const db = await getDb();
    const usersCollection = db.collection<User>(COLLECTIONS.USERS);

    // Verify user still exists
    const user = await usersCollection.findOne({ _id: toObjectId(payload.userId) });

    if (!user) {
      const response = NextResponse.json(
        { success: false, error: { code: 'AUTH003', message: 'User not found' } },
        { status: 401 }
      );
      response.cookies.delete('refreshToken');
      return response;
    }

    const userId = user._id!.toString();

    // Delete old refresh token
    const refreshCollection = db.collection(COLLECTIONS.REFRESH_TOKENS);
    await refreshCollection.deleteOne({ token: refreshToken });

    // Generate new tokens
    const tokens = await generateTokens({
      userId,
      email: user.email,
      plan: user.plan,
    });

    // Store new refresh token
    await refreshCollection.insertOne({
      userId: toObjectId(userId),
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    });

    // Set new refresh token
    const response = NextResponse.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      },
    });

    response.cookies.set('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
