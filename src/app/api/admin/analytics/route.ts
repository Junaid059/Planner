// Admin API - Analytics
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

  return { user, payload, db };
}

// GET /api/admin/analytics - Get detailed analytics
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
    const range = searchParams.get('range') || '7'; // days
    const rangeInDays = parseInt(range);

    const { db } = adminCheck;
    const startDate = new Date(Date.now() - rangeInDays * 24 * 60 * 60 * 1000);

    // User registration over time
    const userRegistrations = await db.collection(COLLECTIONS.USERS).aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    // Tasks created over time
    const tasksCreated = await db.collection(COLLECTIONS.TASKS).aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          created: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    // Study sessions over time
    const studySessions = await db.collection(COLLECTIONS.POMODORO_SESSIONS).aggregate([
      { $match: { startedAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$startedAt" } },
          sessions: { $sum: 1 },
          completedSessions: { $sum: { $cond: ["$completed", 1, 0] } },
          totalMinutes: { $sum: "$duration" }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    // Most active users
    const mostActiveUsers = await db.collection(COLLECTIONS.POMODORO_SESSIONS).aggregate([
      { $match: { startedAt: { $gte: startDate }, completed: true } },
      {
        $group: {
          _id: "$userId",
          totalSessions: { $sum: 1 },
          totalMinutes: { $sum: "$duration" }
        }
      },
      { $sort: { totalMinutes: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: COLLECTIONS.USERS,
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $project: {
          userId: "$_id",
          name: "$user.name",
          email: "$user.email",
          totalSessions: 1,
          totalMinutes: 1
        }
      }
    ]).toArray();

    // Task priority distribution
    const taskPriorityDist = await db.collection(COLLECTIONS.TASKS).aggregate([
      { $group: { _id: "$priority", count: { $sum: 1 } } }
    ]).toArray();

    // Task status distribution
    const taskStatusDist = await db.collection(COLLECTIONS.TASKS).aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]).toArray();

    // Plan status distribution
    const planStatusDist = await db.collection(COLLECTIONS.STUDY_PLANS).aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]).toArray();

    // Average study time per user
    const avgStudyTime = await db.collection(COLLECTIONS.POMODORO_SESSIONS).aggregate([
      { $match: { completed: true } },
      {
        $group: {
          _id: "$userId",
          totalMinutes: { $sum: "$duration" }
        }
      },
      {
        $group: {
          _id: null,
          avgMinutes: { $avg: "$totalMinutes" }
        }
      }
    ]).toArray();

    // Peak study hours
    const peakHours = await db.collection(COLLECTIONS.POMODORO_SESSIONS).aggregate([
      { $match: { completed: true } },
      {
        $group: {
          _id: { $hour: "$startedAt" },
          sessions: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    return NextResponse.json({
      success: true,
      data: {
        userRegistrations: userRegistrations.map(r => ({ date: r._id, count: r.count })),
        tasksActivity: tasksCreated.map(t => ({ 
          date: t._id, 
          created: t.created, 
          completed: t.completed 
        })),
        studyActivity: studySessions.map(s => ({
          date: s._id,
          sessions: s.sessions,
          completedSessions: s.completedSessions,
          totalMinutes: s.totalMinutes
        })),
        mostActiveUsers: mostActiveUsers.map(u => ({
          userId: u.userId.toString(),
          name: u.name,
          email: u.email,
          totalSessions: u.totalSessions,
          totalMinutes: u.totalMinutes,
          totalHours: Math.round(u.totalMinutes / 60 * 10) / 10
        })),
        distributions: {
          taskPriority: taskPriorityDist.map(p => ({ priority: p._id, count: p.count })),
          taskStatus: taskStatusDist.map(s => ({ status: s._id, count: s.count })),
          planStatus: planStatusDist.map(s => ({ status: s._id, count: s.count })),
        },
        averageStudyMinutesPerUser: Math.round(avgStudyTime[0]?.avgMinutes || 0),
        peakStudyHours: peakHours.map(h => ({ hour: h._id, sessions: h.sessions })),
      },
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
