// Admin API - Dashboard Stats
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

// GET /api/admin - Get admin dashboard stats
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await verifyAdmin(request);
    if ('error' in adminCheck) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH001', message: adminCheck.error } },
        { status: adminCheck.status }
      );
    }

    const db = await getDb();

    // Get collection counts
    const [
      totalUsers,
      totalPlans,
      totalTasks,
      totalSessions,
      recentUsers,
      activeUsersToday,
      proUsers,
      completedTasks,
    ] = await Promise.all([
      db.collection(COLLECTIONS.USERS).countDocuments(),
      db.collection(COLLECTIONS.STUDY_PLANS).countDocuments(),
      db.collection(COLLECTIONS.TASKS).countDocuments(),
      db.collection(COLLECTIONS.POMODORO_SESSIONS).countDocuments(),
      db.collection(COLLECTIONS.USERS)
        .find()
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray(),
      db.collection(COLLECTIONS.USERS).countDocuments({
        lastLoginAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }),
      db.collection(COLLECTIONS.USERS).countDocuments({ plan: 'PRO' }),
      db.collection(COLLECTIONS.TASKS).countDocuments({ status: 'COMPLETED' }),
    ]);

    // Get user growth (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const userGrowth = await db.collection(COLLECTIONS.USERS).aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    // Get task completion rate
    const pendingTasks = await db.collection(COLLECTIONS.TASKS).countDocuments({
      status: { $in: ['TODO', 'IN_PROGRESS'] }
    });
    const taskCompletionRate = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100) 
      : 0;

    // Get total study minutes
    const studyStats = await db.collection(COLLECTIONS.POMODORO_SESSIONS).aggregate([
      { $match: { completed: true } },
      { $group: { _id: null, totalMinutes: { $sum: "$duration" } } }
    ]).toArray();
    const totalStudyMinutes = studyStats[0]?.totalMinutes || 0;

    // Get plan distribution
    const planDistribution = await db.collection(COLLECTIONS.USERS).aggregate([
      { $group: { _id: "$plan", count: { $sum: 1 } } }
    ]).toArray();

    // Get team users count
    const teamUsers = await db.collection(COLLECTIONS.USERS).countDocuments({ plan: 'TEAM' });
    const freeUsers = await db.collection(COLLECTIONS.USERS).countDocuments({ plan: 'FREE' });

    // Get revenue stats
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const revenueStats = await db.collection(COLLECTIONS.PAYMENTS).aggregate([
      { $match: { status: 'SUCCEEDED' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).toArray();
    const totalRevenue = revenueStats[0]?.total || 0;

    const monthlyRevenueStats = await db.collection(COLLECTIONS.PAYMENTS).aggregate([
      { $match: { status: 'SUCCEEDED', createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).toArray();
    const monthlyRevenue = monthlyRevenueStats[0]?.total || 0;

    // Get new users this month and last month
    const firstDayThisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const firstDayLastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
    
    const newUsersThisMonth = await db.collection(COLLECTIONS.USERS).countDocuments({
      createdAt: { $gte: firstDayThisMonth }
    });
    const newUsersLastMonth = await db.collection(COLLECTIONS.USERS).countDocuments({
      createdAt: { $gte: firstDayLastMonth, $lt: firstDayThisMonth }
    });

    // Get revenue growth data
    const revenueGrowth = await db.collection(COLLECTIONS.PAYMENTS).aggregate([
      { $match: { status: 'SUCCEEDED', createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          amount: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    // Get recent payments
    const recentPayments = await db.collection(COLLECTIONS.PAYMENTS)
      .aggregate([
        { $match: { status: 'SUCCEEDED' } },
        { $sort: { createdAt: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: COLLECTIONS.USERS,
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }
      ]).toArray();

    const formattedPayments = recentPayments.map(p => ({
      id: p._id?.toString(),
      amount: p.amount,
      status: p.status,
      userName: p.user?.name || 'Unknown',
      createdAt: p.createdAt,
    }));

    // Format recent users for response
    const formattedRecentUsers = recentUsers.map(user => ({
      id: user._id?.toString(),
      name: user.name,
      email: user.email,
      plan: user.plan,
      role: user.role || 'USER',
      isActive: user.isActive !== false,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalPlans,
          totalTasks,
          totalSessions,
          activeUsersToday,
          proUsers,
          teamUsers,
          freeUsers,
          completedTasks,
          pendingTasks,
          taskCompletionRate,
          totalStudyMinutes,
          totalStudyHours: Math.round(totalStudyMinutes / 60),
          totalRevenue,
          monthlyRevenue,
          newUsersThisMonth,
          newUsersLastMonth,
        },
        userGrowth,
        revenueGrowth,
        planDistribution: planDistribution.map(p => ({
          plan: p._id || 'FREE',
          count: p.count
        })),
        recentUsers: formattedRecentUsers,
        recentPayments: formattedPayments,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
