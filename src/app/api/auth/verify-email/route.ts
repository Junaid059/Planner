// Verify Email API endpoint
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId } from '@/lib/db/mongodb';
import { User } from '@/lib/db/models';
import { generateTokens } from '@/lib/auth/jwt';
import { verifyToken, deleteToken, sendWelcomeEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL002', message: 'Verification token is required' } },
        { status: 400 }
      );
    }

    // Verify the token
    const tokenResult = await verifyToken(token, 'email_verification');

    if (!tokenResult.valid || !tokenResult.userId) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH006', message: 'Invalid or expired verification link' } },
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

    if (user.emailVerified) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH007', message: 'Email already verified' } },
        { status: 400 }
      );
    }

    const now = new Date();

    // Activate the user account
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          emailVerified: true,
          emailVerifiedAt: now,
          isActive: true,
          updatedAt: now,
        },
      }
    );

    // Initialize study streak
    const streaksCollection = db.collection(COLLECTIONS.STUDY_STREAKS);
    const existingStreak = await streaksCollection.findOne({ userId: user._id });
    if (!existingStreak) {
      await streaksCollection.insertOne({
        userId: user._id,
        currentStreak: 0,
        longestStreak: 0,
        lastStudyDate: null,
        streakStartDate: null,
      });
    }

    // Initialize timer settings
    const timerCollection = db.collection(COLLECTIONS.TIMER_SETTINGS);
    const existingTimer = await timerCollection.findOne({ userId: user._id });
    if (!existingTimer) {
      await timerCollection.insertOne({
        userId: user._id,
        workDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        sessionsUntilLongBreak: 4,
        autoStartBreaks: false,
        autoStartWork: false,
        soundEnabled: true,
        volume: 80,
      });
    }

    // Delete the verification token
    await deleteToken(token);

    // Send welcome email
    await sendWelcomeEmail(user.email, user.name);

    // Log activity
    await db.collection(COLLECTIONS.ACTIVITY_LOGS).insertOne({
      userId: user._id,
      action: 'email_verified',
      entityType: 'user',
      details: { email: user.email },
      createdAt: now,
    });

    // Generate tokens for auto-login
    const tokens = await generateTokens({
      userId: user._id!.toString(),
      email: user.email,
      plan: user.plan,
    });

    // Set refresh token in database
    const refreshCollection = db.collection(COLLECTIONS.REFRESH_TOKENS);
    await refreshCollection.insertOne({
      userId: user._id,
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: now,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Email verified successfully! Welcome to StudyPlanner.',
      data: {
        user: {
          id: user._id!.toString(),
          email: user.email,
          name: user.name,
          plan: user.plan,
          role: user.role,
          avatar: user.avatar || null,
          createdAt: user.createdAt,
        },
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      },
    });

    response.cookies.set('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// Resend verification email
export async function PUT(request: NextRequest) {
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

    if (!user) {
      // Don't reveal if user exists
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a verification link has been sent.',
      });
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH007', message: 'Email already verified' } },
        { status: 400 }
      );
    }

    // Import here to avoid circular dependency
    const { generateToken, sendVerificationEmail, storeVerificationToken } = await import('@/lib/email');

    // Generate new verification token
    const verificationToken = generateToken();
    await storeVerificationToken(user._id!.toString(), verificationToken);

    // Send verification email
    await sendVerificationEmail(user.email, user.name, verificationToken);

    return NextResponse.json({
      success: true,
      message: 'Verification email sent! Please check your inbox.',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
