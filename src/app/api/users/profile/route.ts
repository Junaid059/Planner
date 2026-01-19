// User Profile API
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId } from '@/lib/db/mongodb';
import { User } from '@/lib/db/models';
import { verifyToken } from '@/lib/auth/jwt';

// GET /api/users/profile - Get current user profile
export async function GET(request: NextRequest) {
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

    const db = await getDb();
    const user = await db.collection<User>(COLLECTIONS.USERS).findOne(
      { _id: toObjectId(payload.userId) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'RES001', message: 'User not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user._id?.toString(),
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        plan: user.plan,
        role: user.role,
        theme: user.theme,
        emailVerified: user.emailVerified || false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        preferences: user.preferences || {
          emailNotifications: true,
          pushNotifications: true,
          weeklyReport: true,
        },
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// PUT /api/users/profile - Update current user profile
export async function PUT(request: NextRequest) {
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
    const { name, avatar, theme, preferences } = body;

    const db = await getDb();
    const updateData: Partial<User> = {
      updatedAt: new Date(),
    };

    if (name) updateData.name = name;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (theme) updateData.theme = theme;
    if (preferences) updateData.preferences = preferences;

    const result = await db.collection<User>(COLLECTIONS.USERS).findOneAndUpdate(
      { _id: toObjectId(payload.userId) },
      { $set: updateData },
      { returnDocument: 'after', projection: { password: 0 } }
    );

    if (!result) {
      return NextResponse.json(
        { success: false, error: { code: 'RES001', message: 'User not found' } },
        { status: 404 }
      );
    }

    // Log activity
    await db.collection(COLLECTIONS.ACTIVITY_LOGS).insertOne({
      userId: toObjectId(payload.userId),
      action: 'profile_updated',
      entityType: 'user',
      details: { updated: Object.keys(updateData).filter(k => k !== 'updatedAt') },
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: {
        id: result._id?.toString(),
        name: result.name,
        email: result.email,
        avatar: result.avatar,
        plan: result.plan,
        role: result.role,
        theme: result.theme,
        preferences: result.preferences,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
