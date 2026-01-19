// Auth API - Logout endpoint
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId } from '@/lib/db/mongodb';
import { verifyToken } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie
    const refreshToken = request.cookies.get('refreshToken')?.value;
    const authHeader = request.headers.get('Authorization');
    const accessToken = authHeader?.replace('Bearer ', '');

    const db = await getDb();
    const refreshCollection = db.collection(COLLECTIONS.REFRESH_TOKENS);

    // Delete refresh token from DB if exists
    if (refreshToken) {
      await refreshCollection.deleteOne({ token: refreshToken });
    }

    // If we have an access token, invalidate all user's refresh tokens
    if (accessToken) {
      const payload = await verifyToken(accessToken);
      if (payload) {
        await refreshCollection.deleteMany({ userId: toObjectId(payload.userId) });
      }
    }

    const response = NextResponse.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });

    // Clear refresh token cookie
    response.cookies.delete('refreshToken');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
