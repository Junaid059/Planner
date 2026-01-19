// Auth API - Get current user (Me endpoint)
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId } from '@/lib/db/mongodb';
import { User, StudyStreak } from '@/lib/db/models';
import { verifyToken } from '@/lib/auth/jwt';
import { seedAdmin } from '@/lib/db/seed-admin';

// Seed admin on first request
let adminSeeded = false;
async function ensureAdminSeeded() {
  if (!adminSeeded) {
    await seedAdmin();
    adminSeeded = true;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Ensure admin is seeded
    await ensureAdminSeeded();
    
    // Get access token from Authorization header
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH003', message: 'Access token required' } },
        { status: 401 }
      );
    }

    // Verify token
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH002', message: 'Invalid or expired token' } },
        { status: 401 }
      );
    }

    const db = await getDb();
    const usersCollection = db.collection<User>(COLLECTIONS.USERS);
    const userId = toObjectId(payload.userId);

    // Get user
    const user = await usersCollection.findOne({ _id: userId });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'RES001', message: 'User not found' } },
        { status: 404 }
      );
    }

    // Get streak
    const streaksCollection = db.collection<StudyStreak>(COLLECTIONS.STUDY_STREAKS);
    const streak = await streaksCollection.findOne({ userId });

    // Get counts
    const plansCollection = db.collection(COLLECTIONS.STUDY_PLANS);
    const tasksCollection = db.collection(COLLECTIONS.TASKS);
    const sessionsCollection = db.collection(COLLECTIONS.POMODORO_SESSIONS);

    const [studyPlansCount, tasksCount, sessionsCount] = await Promise.all([
      plansCollection.countDocuments({ userId }),
      tasksCollection.countDocuments({ userId }),
      sessionsCollection.countDocuments({ userId }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        id: user._id!.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar || null,
        plan: user.plan,
        role: user.role || 'USER',
        createdAt: user.createdAt,
        preferences: user.preferences,
        streak: streak ? {
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          lastStudyDate: streak.lastStudyDate,
        } : null,
        _count: {
          studyPlans: studyPlansCount,
          tasks: tasksCount,
          pomodoroSessions: sessionsCount,
        },
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
