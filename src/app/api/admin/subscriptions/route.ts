// Admin API - Subscriptions Management
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId } from '@/lib/db/mongodb';
import { User, Subscription, Payment } from '@/lib/db/models';
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

// GET /api/admin/subscriptions - Get all subscriptions with stats
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
    const status = searchParams.get('status') || '';
    const plan = searchParams.get('plan') || '';

    const { db } = adminCheck;

    // Build query
    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (plan) query.plan = plan;

    // Get subscriptions with user data
    const subscriptions = await db
      .collection<Subscription>(COLLECTIONS.SUBSCRIPTIONS)
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
        { $unwind: '$user' },
      ])
      .toArray();

    const total = await db.collection<Subscription>(COLLECTIONS.SUBSCRIPTIONS).countDocuments(query);

    // Get subscription stats
    const [
      totalSubscriptions,
      activeSubscriptions,
      trialingSubscriptions,
      canceledSubscriptions,
      proSubscriptions,
      teamSubscriptions,
    ] = await Promise.all([
      db.collection<Subscription>(COLLECTIONS.SUBSCRIPTIONS).countDocuments(),
      db.collection<Subscription>(COLLECTIONS.SUBSCRIPTIONS).countDocuments({ status: 'ACTIVE' }),
      db.collection<Subscription>(COLLECTIONS.SUBSCRIPTIONS).countDocuments({ status: 'TRIALING' }),
      db.collection<Subscription>(COLLECTIONS.SUBSCRIPTIONS).countDocuments({ status: 'CANCELED' }),
      db.collection<Subscription>(COLLECTIONS.SUBSCRIPTIONS).countDocuments({ plan: 'PRO', status: { $in: ['ACTIVE', 'TRIALING'] } }),
      db.collection<Subscription>(COLLECTIONS.SUBSCRIPTIONS).countDocuments({ plan: 'TEAM', status: { $in: ['ACTIVE', 'TRIALING'] } }),
    ]);

    // Get revenue stats
    const revenueStats = await db.collection<Payment>(COLLECTIONS.PAYMENTS).aggregate([
      { $match: { status: 'SUCCEEDED' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]).toArray();

    // Monthly revenue
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthlyRevenueStats = await db.collection<Payment>(COLLECTIONS.PAYMENTS).aggregate([
      { $match: { status: 'SUCCEEDED', createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: null,
          monthlyRevenue: { $sum: '$amount' },
        },
      },
    ]).toArray();

    return NextResponse.json({
      success: true,
      data: {
        subscriptions: subscriptions.map((sub) => ({
          id: sub._id?.toString(),
          userId: sub.userId.toString(),
          userName: (sub as unknown as { user: User }).user.name,
          userEmail: (sub as unknown as { user: User }).user.email,
          plan: sub.plan,
          status: sub.status,
          currentPeriodStart: sub.currentPeriodStart,
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          trialEnd: sub.trialEnd,
          createdAt: sub.createdAt,
        })),
        stats: {
          totalSubscriptions,
          activeSubscriptions,
          trialingSubscriptions,
          canceledSubscriptions,
          proSubscriptions,
          teamSubscriptions,
          totalRevenue: revenueStats[0]?.totalRevenue || 0,
          totalPayments: revenueStats[0]?.count || 0,
          monthlyRevenue: monthlyRevenueStats[0]?.monthlyRevenue || 0,
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// POST /api/admin/subscriptions - Manually create/update subscription (for admin comps, etc.)
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await verifyAdmin(request);
    if ('error' in adminCheck) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH001', message: adminCheck.error } },
        { status: adminCheck.status }
      );
    }

    const body = await request.json();
    const { userId, plan, status, durationMonths = 1, reason } = body;

    if (!userId || !plan) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL001', message: 'userId and plan are required' } },
        { status: 400 }
      );
    }

    const { db } = adminCheck;
    const userObjectId = toObjectId(userId);

    // Check user exists
    const user = await db.collection<User>(COLLECTIONS.USERS).findOne({ _id: userObjectId });
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'RES001', message: 'User not found' } },
        { status: 404 }
      );
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime() + durationMonths * 30 * 24 * 60 * 60 * 1000);

    // Create or update subscription
    await db.collection<Subscription>(COLLECTIONS.SUBSCRIPTIONS).updateOne(
      { userId: userObjectId },
      {
        $set: {
          plan,
          status: status || 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          updatedAt: now,
        },
        $setOnInsert: {
          userId: userObjectId,
          createdAt: now,
        },
      },
      { upsert: true }
    );

    // Update user's plan
    await db.collection<User>(COLLECTIONS.USERS).updateOne(
      { _id: userObjectId },
      { $set: { plan, updatedAt: now } }
    );

    // Log activity
    await db.collection(COLLECTIONS.ACTIVITY_LOGS).insertOne({
      userId: adminCheck.user._id,
      action: 'admin_subscription_grant',
      entityType: 'subscription',
      entityId: userObjectId,
      details: { 
        targetEmail: user.email,
        plan,
        durationMonths,
        reason,
      },
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      data: { 
        message: `Subscription granted: ${plan} plan for ${durationMonths} month(s)`,
      },
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
