// Admin API - Users management
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId } from '@/lib/db/mongodb';
import { User } from '@/lib/db/models';
import { verifyToken } from '@/lib/auth/jwt';

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

  return { user, payload };
}

// GET /api/admin/users - Get all users with pagination
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await verifyAdmin(request);
    if ('error' in adminCheck) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH001', message: adminCheck.error } },
        { status: adminCheck.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const plan = searchParams.get('plan') || '';
    const role = searchParams.get('role') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const db = await getDb();
    const usersCollection = db.collection<User>(COLLECTIONS.USERS);

    // Build query
    const query: Record<string, unknown> = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (plan) {
      query.plan = plan;
    }
    if (role) {
      query.role = role;
    }

    // Get total count
    const total = await usersCollection.countDocuments(query);

    // Get users
    const users = await usersCollection
      .find(query)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    // Get additional stats for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const userId = user._id!;
        const [tasksCount, plansCount, sessionsCount] = await Promise.all([
          db.collection(COLLECTIONS.TASKS).countDocuments({ userId }),
          db.collection(COLLECTIONS.STUDY_PLANS).countDocuments({ userId }),
          db.collection(COLLECTIONS.POMODORO_SESSIONS).countDocuments({ userId }),
        ]);

        // Get total study time
        const studyTime = await db.collection(COLLECTIONS.POMODORO_SESSIONS).aggregate([
          { $match: { userId, completed: true } },
          { $group: { _id: null, total: { $sum: '$duration' } } }
        ]).toArray();

        return {
          id: userId.toString(),
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          plan: user.plan,
          role: user.role || 'USER',
          isActive: user.isActive !== false,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          lastLoginAt: user.lastLoginAt,
          stats: {
            tasks: tasksCount,
            plans: plansCount,
            sessions: sessionsCount,
            studyMinutes: studyTime[0]?.total || 0,
          }
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: usersWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
