// Admin API - Activity Logs
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId } from '@/lib/db/mongodb';
import { User, ActivityLog } from '@/lib/db/models';
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

// GET /api/admin/activity - Get activity logs
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
    const limit = parseInt(searchParams.get('limit') || '50');
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const { db } = adminCheck;

    // Build query
    const query: Record<string, unknown> = {};
    if (userId) query.userId = toObjectId(userId);
    if (action) query.action = { $regex: action, $options: 'i' };
    if (entityType) query.entityType = entityType;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) (query.createdAt as Record<string, unknown>).$gte = new Date(startDate);
      if (endDate) (query.createdAt as Record<string, unknown>).$lte = new Date(endDate);
    }

    // Get logs with user info
    const logs = await db
      .collection<ActivityLog>(COLLECTIONS.ACTIVITY_LOGS)
      .aggregate([
        { $match: query },
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $lookup: {
            from: COLLECTIONS.USERS,
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      ])
      .toArray();

    const total = await db.collection<ActivityLog>(COLLECTIONS.ACTIVITY_LOGS).countDocuments(query);

    // Get action type stats
    const actionStats = await db.collection<ActivityLog>(COLLECTIONS.ACTIVITY_LOGS).aggregate([
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]).toArray();

    return NextResponse.json({
      success: true,
      data: {
        logs: logs.map((log) => ({
          id: log._id?.toString(),
          userId: log.userId?.toString(),
          userName: (log as unknown as { user?: User }).user?.name || 'Unknown',
          userEmail: (log as unknown as { user?: User }).user?.email || 'Unknown',
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId?.toString(),
          details: log.details,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          createdAt: log.createdAt,
        })),
        actionStats: actionStats.map((s) => ({
          action: s._id,
          count: s.count,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
