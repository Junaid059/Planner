// Admin API - User Password Management
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId, isValidObjectId } from '@/lib/db/mongodb';
import { User } from '@/lib/db/models';
import { verifyToken } from '@/lib/auth/jwt';
import bcrypt from 'bcryptjs';

// Middleware to check admin role
async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return { error: 'Access token required', status: 401 };
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return { error: 'Invalid or expired token', status: 401 };
  }

  const db = await getDb();
  const usersCollection = db.collection<User>(COLLECTIONS.USERS);
  const user = await usersCollection.findOne({ _id: toObjectId(payload.userId) });

  if (!user || user.role !== 'ADMIN') {
    return { error: 'Admin access required', status: 403 };
  }

  return { user, payload, db };
}

// POST /api/admin/users/[id]/password - Reset user password
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await verifyAdmin(request);
    if ('error' in adminCheck) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH001', message: adminCheck.error } },
        { status: adminCheck.status }
      );
    }

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL001', message: 'Invalid user ID' } },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { newPassword, generateRandom } = body;

    let password: string;
    
    if (generateRandom) {
      // Generate a random password
      password = generateRandomPassword(12);
    } else if (newPassword) {
      // Validate password
      if (newPassword.length < 8) {
        return NextResponse.json(
          { success: false, error: { code: 'VAL002', message: 'Password must be at least 8 characters' } },
          { status: 400 }
        );
      }
      password = newPassword;
    } else {
      return NextResponse.json(
        { success: false, error: { code: 'VAL003', message: 'Password or generateRandom flag required' } },
        { status: 400 }
      );
    }

    const { db } = adminCheck;
    const userId = toObjectId(id);

    // Check if user exists
    const user = await db.collection<User>(COLLECTIONS.USERS).findOne({ _id: userId });
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'RES001', message: 'User not found' } },
        { status: 404 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user password
    await db.collection(COLLECTIONS.USERS).updateOne(
      { _id: userId },
      { 
        $set: { 
          password: hashedPassword,
          updatedAt: new Date(),
        } 
      }
    );

    // Invalidate all refresh tokens for this user (force re-login)
    await db.collection(COLLECTIONS.REFRESH_TOKENS).deleteMany({ userId });

    // Log activity
    await db.collection(COLLECTIONS.ACTIVITY_LOGS).insertOne({
      userId: adminCheck.user._id,
      action: 'admin_password_reset',
      entityType: 'user',
      entityId: userId,
      details: { 
        targetEmail: user.email,
        generatedRandom: !!generateRandom,
      },
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: { 
        message: 'Password reset successfully',
        ...(generateRandom && { temporaryPassword: password }),
      },
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// Generate random password
function generateRandomPassword(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
