// Forgot Password API endpoint
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/db/mongodb';
import { User } from '@/lib/db/models';
import { 
  generateToken, 
  sendPasswordResetEmail, 
  storePasswordResetToken 
} from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL002', message: 'Email is required' } },
        { status: 400 }
      );
    }

    const db = await getDb();
    const usersCollection = db.collection<User>(COLLECTIONS.USERS);

    // Find the user
    const user = await usersCollection.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    }

    // Check if account is verified
    if (!user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    }

    // Generate reset token
    const resetToken = generateToken();
    await storePasswordResetToken(user._id!.toString(), resetToken);

    // Send password reset email
    await sendPasswordResetEmail(user.email, user.name, resetToken);

    // Log activity
    await db.collection(COLLECTIONS.ACTIVITY_LOGS).insertOne({
      userId: user._id,
      action: 'password_reset_requested',
      entityType: 'user',
      details: { email: user.email },
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
