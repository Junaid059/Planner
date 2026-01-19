// Auth API - Register endpoint with Email Verification
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId } from '@/lib/db/mongodb';
import { User, DEFAULT_USER_PREFERENCES } from '@/lib/db/models';
import { hashPassword } from '@/lib/auth/jwt';
import { 
  generateToken, 
  sendVerificationEmail, 
  storeVerificationToken 
} from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL002', message: 'Missing required fields' } },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL003', message: 'Invalid email format' } },
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

    const db = await getDb();
    const usersCollection = db.collection<User>(COLLECTIONS.USERS);

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      // If user exists but not verified, allow re-registration
      if (!existingUser.emailVerified) {
        // Delete the old unverified user
        await usersCollection.deleteOne({ _id: existingUser._id });
        await db.collection(COLLECTIONS.VERIFICATION_TOKENS).deleteMany({ 
          userId: existingUser._id?.toString() 
        });
      } else {
        return NextResponse.json(
          { success: false, error: { code: 'RES002', message: 'Email already registered' } },
          { status: 409 }
        );
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user (not verified yet)
    const now = new Date();
    const newUser: User = {
      email: email.toLowerCase(),
      name,
      password: hashedPassword,
      role: 'USER',
      plan: 'FREE',
      theme: 'SYSTEM',
      isActive: false, // Account not active until verified
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
      preferences: DEFAULT_USER_PREFERENCES,
    };

    const result = await usersCollection.insertOne(newUser);
    const userId = result.insertedId.toString();

    // Generate verification token
    const verificationToken = generateToken();
    await storeVerificationToken(userId, verificationToken);

    // Send verification email
    const emailSent = await sendVerificationEmail(email.toLowerCase(), name, verificationToken);

    if (!emailSent) {
      // If email fails, still create the account but warn the user
      console.error('Failed to send verification email to:', email);
    }

    // Log activity
    await db.collection(COLLECTIONS.ACTIVITY_LOGS).insertOne({
      userId: toObjectId(userId),
      action: 'user_registered',
      entityType: 'user',
      details: { email: email.toLowerCase(), name },
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      data: {
        email: email.toLowerCase(),
        requiresVerification: true,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
