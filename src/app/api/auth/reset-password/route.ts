// Reset Password API endpoint
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId } from '@/lib/db/mongodb';
import { User } from '@/lib/db/models';
import { hashPassword } from '@/lib/auth/jwt';
import { verifyToken, deleteToken, sendPasswordChangedEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL002', message: 'Token and password are required' } },
        { status: 400 }
      );
    }

    // Password validation (min 8 chars)
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL003', message: 'Password must be at least 8 characters' } },
        { status: 400 }
      );
    }

    // Verify the token
    const tokenResult = await verifyToken(token, 'password_reset');

    if (!tokenResult.valid || !tokenResult.userId) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH006', message: 'Invalid or expired reset link' } },
        { status: 400 }
      );
    }

    const db = await getDb();
    const usersCollection = db.collection<User>(COLLECTIONS.USERS);

    // Find the user
    const user = await usersCollection.findOne({ _id: toObjectId(tokenResult.userId) });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'RES001', message: 'User not found' } },
        { status: 404 }
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update password
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
      }
    );

    // Delete the reset token
    await deleteToken(token);

    // Invalidate all existing refresh tokens for security
    await db.collection(COLLECTIONS.REFRESH_TOKENS).deleteMany({ userId: user._id });

    // Send password changed confirmation email
    await sendPasswordChangedEmail(user.email, user.name);

    // Log activity
    await db.collection(COLLECTIONS.ACTIVITY_LOGS).insertOne({
      userId: user._id,
      action: 'password_reset_completed',
      entityType: 'user',
      details: { email: user.email },
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// Validate reset token (for frontend to check before showing form)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL002', message: 'Token is required' } },
        { status: 400 }
      );
    }

    const tokenResult = await verifyToken(token, 'password_reset');

    return NextResponse.json({
      success: true,
      data: {
        valid: tokenResult.valid,
      },
    });
  } catch (error) {
    console.error('Validate token error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
