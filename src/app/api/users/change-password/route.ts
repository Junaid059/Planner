// Change Password API
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId } from '@/lib/db/mongodb';
import { User } from '@/lib/db/models';
import { verifyToken, hashPassword, verifyPassword } from '@/lib/auth/jwt';
import { sendPasswordChangedEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH001', message: 'Access token required' } },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH001', message: 'Invalid or expired token' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL002', message: 'Current and new password required' } },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL003', message: 'Password must be at least 8 characters' } },
        { status: 400 }
      );
    }

    const db = await getDb();
    const user = await db.collection<User>(COLLECTIONS.USERS).findOne(
      { _id: toObjectId(payload.userId) }
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'RES001', message: 'User not found' } },
        { status: 404 }
      );
    }

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH002', message: 'Current password is incorrect' } },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await db.collection<User>(COLLECTIONS.USERS).updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
      }
    );

    // Invalidate all existing refresh tokens for security
    await db.collection(COLLECTIONS.REFRESH_TOKENS).deleteMany({ userId: user._id });

    // Send password changed confirmation email
    await sendPasswordChangedEmail(user.email, user.name);

    // Log activity
    await db.collection(COLLECTIONS.ACTIVITY_LOGS).insertOne({
      userId: user._id,
      action: 'password_changed',
      entityType: 'user',
      details: { method: 'self' },
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
