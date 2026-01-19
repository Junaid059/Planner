// Auth API - Login endpoint
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId } from '@/lib/db/mongodb';
import { User } from '@/lib/db/models';
import { verifyPassword, generateTokens, TOKEN_EXPIRY } from '@/lib/auth/jwt';
import { seedAdmin } from '@/lib/db/seed-admin';

// Seed admin on first request
let adminSeeded = false;
async function ensureAdminSeeded() {
  if (!adminSeeded) {
    await seedAdmin();
    adminSeeded = true;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Ensure admin is seeded
    await ensureAdminSeeded();
    
    const body = await request.json();
    const { email, password, rememberMe = false } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL002', message: 'Email and password are required' } },
        { status: 400 }
      );
    }

    const db = await getDb();
    const usersCollection = db.collection<User>(COLLECTIONS.USERS);

    // Find user
    const user = await usersCollection.findOne({ email: email.toLowerCase() });

    if (!user || !user.password) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH001', message: 'Invalid email or password' } },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH001', message: 'Invalid email or password' } },
        { status: 401 }
      );
    }

    // Check if email is verified
    if (user.emailVerified === false) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH003', message: 'Please verify your email address before logging in. Check your inbox for the verification link.' } },
        { status: 403 }
      );
    }

    // Check if account is active
    if (user.isActive === false) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH004', message: 'Your account has been deactivated. Please contact support.' } },
        { status: 403 }
      );
    }

    const userId = user._id!.toString();

    // Generate tokens (with remember me support)
    const tokens = await generateTokens({
      userId,
      email: user.email,
      plan: user.plan,
    }, rememberMe);

    // Store refresh token with appropriate expiration
    const refreshCollection = db.collection(COLLECTIONS.REFRESH_TOKENS);
    await refreshCollection.insertOne({
      userId: toObjectId(userId),
      token: tokens.refreshToken,
      rememberMe,
      expiresAt: new Date(Date.now() + tokens.refreshExpiresIn * 1000),
      createdAt: new Date(),
    });

    // Update last login
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { updatedAt: new Date(), lastLoginAt: new Date() } }
    );

    // Return user without password
    const userResponse = {
      id: userId,
      email: user.email,
      name: user.name,
      plan: user.plan,
      role: user.role || 'USER',
      avatar: user.avatar || null,
      createdAt: user.createdAt,
    };

    // Set refresh token as HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      data: {
        user: userResponse,
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      },
    });

    // Set cookie with appropriate expiration based on remember me
    const cookieMaxAge = rememberMe 
      ? TOKEN_EXPIRY.REFRESH_TOKEN_REMEMBER_SECONDS 
      : TOKEN_EXPIRY.REFRESH_TOKEN_SECONDS;

    response.cookies.set('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieMaxAge,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
