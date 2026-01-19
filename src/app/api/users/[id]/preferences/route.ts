// User Preferences API
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId, isValidObjectId } from '@/lib/db/mongodb';
import { User, DEFAULT_USER_PREFERENCES } from '@/lib/db/models';
import { verifyToken } from '@/lib/auth/jwt';

// GET /api/users/[id]/preferences - Get user preferences
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
    const usersCollection = db.collection<User>(COLLECTIONS.USERS);

    const user = await usersCollection.findOne({ _id: toObjectId(id) });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'RES001', message: 'User not found' } },
        { status: 404 }
      );
    }

    // Return user preferences or defaults
    const preferences = user.preferences || DEFAULT_USER_PREFERENCES;

    return NextResponse.json({ success: true, data: preferences });
  } catch (error) {
    console.error('Get preferences error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// PATCH /api/users/[id]/preferences - Update user preferences
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
    
    // Validate theme if provided
    if (body.theme && !['LIGHT', 'DARK', 'SYSTEM'].includes(body.theme)) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL003', message: 'Invalid theme value' } },
        { status: 400 }
      );
    }

    const db = await getDb();
    const usersCollection = db.collection<User>(COLLECTIONS.USERS);

    // Get current user to merge preferences
    const user = await usersCollection.findOne({ _id: toObjectId(id) });
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'RES001', message: 'User not found' } },
        { status: 404 }
      );
    }

    // Merge with existing preferences
    const currentPrefs = user.preferences || DEFAULT_USER_PREFERENCES;
    const updatedPrefs = {
      ...currentPrefs,
      ...(body.theme !== undefined && { theme: body.theme }),
      ...(body.timezone !== undefined && { timezone: body.timezone }),
      ...(body.language !== undefined && { language: body.language }),
      ...(body.emailNotifications !== undefined && { emailNotifications: body.emailNotifications }),
      ...(body.pushNotifications !== undefined && { pushNotifications: body.pushNotifications }),
      ...(body.taskReminders !== undefined && { taskReminders: body.taskReminders }),
      ...(body.studyReminders !== undefined && { studyReminders: body.studyReminders }),
      ...(body.weeklyReport !== undefined && { weeklyReport: body.weeklyReport }),
    };

    await usersCollection.updateOne(
      { _id: toObjectId(id) },
      { $set: { preferences: updatedPrefs, updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true, data: updatedPrefs });
  } catch (error) {
    console.error('Update preferences error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
