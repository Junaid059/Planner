// User Service API - CRUD operations
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId, isValidObjectId } from '@/lib/db/mongodb';
import { User, StudyStreak } from '@/lib/db/models';
import { verifyToken } from '@/lib/auth/jwt';

// GET /api/users/[id] - Get user profile
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Verify auth
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = token ? await verifyToken(token) : null;

    if (!payload) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH003', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Users can only access their own profile
    if (payload.userId !== id) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH004', message: 'Forbidden' } },
        { status: 403 }
      );
    }

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL001', message: 'Invalid user ID' } },
        { status: 400 }
      );
    }

    const db = await getDb();
    const usersCollection = db.collection<User>(COLLECTIONS.USERS);
    const streakCollection = db.collection<StudyStreak>(COLLECTIONS.STUDY_STREAKS);

    const user = await usersCollection.findOne(
      { _id: toObjectId(id) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'RES001', message: 'User not found' } },
        { status: 404 }
      );
    }

    const streak = await streakCollection.findOne({ userId: toObjectId(id) });

    return NextResponse.json({
      success: true,
      data: {
        id: user._id!.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        plan: user.plan,
        createdAt: user.createdAt,
        preferences: user.preferences,
        streak,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// PATCH /api/users/[id] - Update user profile
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Verify auth
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = token ? await verifyToken(token) : null;

    if (!payload || payload.userId !== id) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH003', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL001', message: 'Invalid user ID' } },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, avatar } = body;

    const db = await getDb();
    const usersCollection = db.collection<User>(COLLECTIONS.USERS);

    const updateFields: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updateFields.name = name;
    if (avatar !== undefined) updateFields.avatar = avatar;

    await usersCollection.updateOne(
      { _id: toObjectId(id) },
      { $set: updateFields }
    );

    const user = await usersCollection.findOne(
      { _id: toObjectId(id) },
      { projection: { password: 0 } }
    );

    return NextResponse.json({
      success: true,
      data: {
        id: user?._id!.toString(),
        email: user?.email,
        name: user?.name,
        avatar: user?.avatar,
        plan: user?.plan,
        createdAt: user?.createdAt,
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete user account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Verify auth
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = token ? await verifyToken(token) : null;

    if (!payload || payload.userId !== id) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH003', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL001', message: 'Invalid user ID' } },
        { status: 400 }
      );
    }

    const db = await getDb();
    const userId = toObjectId(id);

    // Delete user and all related data
    await Promise.all([
      db.collection(COLLECTIONS.USERS).deleteOne({ _id: userId }),
      db.collection(COLLECTIONS.STUDY_PLANS).deleteMany({ userId }),
      db.collection(COLLECTIONS.TASKS).deleteMany({ userId }),
      db.collection(COLLECTIONS.POMODORO_SESSIONS).deleteMany({ userId }),
      db.collection(COLLECTIONS.TIMER_SETTINGS).deleteMany({ userId }),
      db.collection(COLLECTIONS.DAILY_STATS).deleteMany({ userId }),
      db.collection(COLLECTIONS.STUDY_STREAKS).deleteMany({ userId }),
      db.collection(COLLECTIONS.REFRESH_TOKENS).deleteMany({ userId }),
    ]);

    const response = NextResponse.json({
      success: true,
      data: { message: 'Account deleted successfully' },
    });

    // Clear auth cookie
    response.cookies.delete('refreshToken');

    return response;
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
