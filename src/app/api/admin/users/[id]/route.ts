// Admin API - Individual User management
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId, isValidObjectId } from '@/lib/db/mongodb';
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

  return { user, payload, db };
}

// GET /api/admin/users/[id] - Get detailed user info
export async function GET(
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

    const { db } = adminCheck;
    const userId = toObjectId(id);

    const user = await db.collection<User>(COLLECTIONS.USERS).findOne({ _id: userId });
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'RES001', message: 'User not found' } },
        { status: 404 }
      );
    }

    // Get all user data
    const [tasks, plans, sessions, streak, timerSettings, dailyStats] = await Promise.all([
      db.collection(COLLECTIONS.TASKS).find({ userId }).toArray(),
      db.collection(COLLECTIONS.STUDY_PLANS).find({ userId }).toArray(),
      db.collection(COLLECTIONS.POMODORO_SESSIONS).find({ userId }).sort({ startedAt: -1 }).limit(50).toArray(),
      db.collection(COLLECTIONS.STUDY_STREAKS).findOne({ userId }),
      db.collection(COLLECTIONS.TIMER_SETTINGS).findOne({ userId }),
      db.collection(COLLECTIONS.DAILY_STATS).find({ userId }).sort({ date: -1 }).limit(30).toArray(),
    ]);

    // Calculate stats
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const completedSessions = sessions.filter(s => s.completed).length;
    const totalStudyMinutes = sessions.reduce((acc, s) => acc + (s.completed ? s.duration : 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user._id?.toString(),
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          plan: user.plan,
          role: user.role || 'USER',
          theme: user.theme,
          isActive: user.isActive !== false,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          lastLoginAt: user.lastLoginAt,
          preferences: user.preferences,
        },
        stats: {
          totalTasks: tasks.length,
          completedTasks,
          pendingTasks: tasks.length - completedTasks,
          taskCompletionRate: tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0,
          totalPlans: plans.length,
          activePlans: plans.filter(p => p.status === 'ACTIVE').length,
          totalSessions: sessions.length,
          completedSessions,
          totalStudyMinutes,
          totalStudyHours: Math.round(totalStudyMinutes / 60),
        },
        streak: streak ? {
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          lastStudyDate: streak.lastStudyDate,
        } : null,
        timerSettings,
        recentActivity: {
          tasks: tasks.slice(0, 10).map(t => ({
            id: t._id?.toString(),
            title: t.title,
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate,
            createdAt: t.createdAt,
          })),
          plans: plans.map(p => ({
            id: p._id?.toString(),
            title: p.title,
            subject: p.subject,
            status: p.status,
            progress: p.progress,
            createdAt: p.createdAt,
          })),
          dailyStats: dailyStats.map(ds => ({
            date: ds.date,
            totalMinutes: ds.totalMinutes,
            sessionsCompleted: ds.sessionsCompleted,
            tasksCompleted: ds.tasksCompleted,
            focusScore: ds.focusScore,
          })),
        },
      },
    });
  } catch (error) {
    console.error('Get user detail error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users/[id] - Update user (role, plan, status)
export async function PATCH(
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
    const { role, plan, isActive, name } = body;

    const { db } = adminCheck;
    const userId = toObjectId(id);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (role !== undefined) updateData.role = role;
    if (plan !== undefined) updateData.plan = plan;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (name !== undefined) updateData.name = name;

    const result = await db.collection(COLLECTIONS.USERS).updateOne(
      { _id: userId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'RES001', message: 'User not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: 'User updated successfully' },
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Delete user and all their data
export async function DELETE(
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

    // Prevent admin from deleting themselves
    if (id === adminCheck.payload.userId) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL003', message: 'Cannot delete your own account' } },
        { status: 400 }
      );
    }

    const { db } = adminCheck;
    const userId = toObjectId(id);

    // Delete all user data
    await Promise.all([
      db.collection(COLLECTIONS.USERS).deleteOne({ _id: userId }),
      db.collection(COLLECTIONS.TASKS).deleteMany({ userId }),
      db.collection(COLLECTIONS.STUDY_PLANS).deleteMany({ userId }),
      db.collection(COLLECTIONS.POMODORO_SESSIONS).deleteMany({ userId }),
      db.collection(COLLECTIONS.DAILY_STATS).deleteMany({ userId }),
      db.collection(COLLECTIONS.STUDY_STREAKS).deleteMany({ userId }),
      db.collection(COLLECTIONS.TIMER_SETTINGS).deleteMany({ userId }),
      db.collection(COLLECTIONS.REFRESH_TOKENS).deleteMany({ userId }),
      db.collection(COLLECTIONS.USER_ACHIEVEMENTS).deleteMany({ userId }),
    ]);

    return NextResponse.json({
      success: true,
      data: { message: 'User and all associated data deleted successfully' },
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
