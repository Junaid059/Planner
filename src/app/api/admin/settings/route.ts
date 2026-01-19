// Admin API - Settings Management
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId } from '@/lib/db/mongodb';
import { User, PLAN_PRICING, PLAN_LIMITS } from '@/lib/db/models';
import { verifyToken } from '@/lib/auth/jwt';

// System Settings Collection Name
const SYSTEM_SETTINGS_COLLECTION = 'system_settings';

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

// GET /api/admin/settings - Get system settings
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await verifyAdmin(request);
    if ('error' in adminCheck) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH001', message: adminCheck.error } },
        { status: adminCheck.status }
      );
    }

    const { db } = adminCheck;

    // Get system settings
    const settings = await db.collection(SYSTEM_SETTINGS_COLLECTION).findOne({ key: 'main' });

    // Get plan pricing and limits
    const planConfig = {
      pricing: PLAN_PRICING,
      limits: PLAN_LIMITS,
    };

    // Get Stripe configuration status
    const stripeConfig = {
      secretKeySet: !!process.env.STRIPE_SECRET_KEY,
      webhookSecretSet: !!process.env.STRIPE_WEBHOOK_SECRET,
      proPriceMonthlySet: !!process.env.STRIPE_PRICE_PRO_MONTHLY,
      proPriceYearlySet: !!process.env.STRIPE_PRICE_PRO_YEARLY,
      teamPriceMonthlySet: !!process.env.STRIPE_PRICE_TEAM_MONTHLY,
      teamPriceYearlySet: !!process.env.STRIPE_PRICE_TEAM_YEARLY,
    };

    // Get app stats
    const [totalUsers, totalTasks, totalPlans, totalSessions] = await Promise.all([
      db.collection(COLLECTIONS.USERS).countDocuments(),
      db.collection(COLLECTIONS.TASKS).countDocuments(),
      db.collection(COLLECTIONS.STUDY_PLANS).countDocuments(),
      db.collection(COLLECTIONS.POMODORO_SESSIONS).countDocuments(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        settings: settings || {
          maintenanceMode: false,
          allowNewRegistrations: true,
          requireEmailVerification: false,
          defaultUserPlan: 'FREE',
          maxLoginAttempts: 5,
          sessionTimeout: 24, // hours
          enableAI: true,
          enableTeams: true,
        },
        planConfig,
        stripeConfig,
        appStats: {
          totalUsers,
          totalTasks,
          totalPlans,
          totalSessions,
        },
        environment: {
          nodeEnv: process.env.NODE_ENV,
          appUrl: process.env.NEXT_PUBLIC_APP_URL,
        },
      },
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/settings - Update system settings
export async function PATCH(request: NextRequest) {
  try {
    const adminCheck = await verifyAdmin(request);
    if ('error' in adminCheck) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH001', message: adminCheck.error } },
        { status: adminCheck.status }
      );
    }

    const body = await request.json();
    const {
      maintenanceMode,
      allowNewRegistrations,
      requireEmailVerification,
      defaultUserPlan,
      maxLoginAttempts,
      sessionTimeout,
      enableAI,
      enableTeams,
    } = body;

    const { db } = adminCheck;

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: adminCheck.user._id,
    };

    if (maintenanceMode !== undefined) updateData.maintenanceMode = maintenanceMode;
    if (allowNewRegistrations !== undefined) updateData.allowNewRegistrations = allowNewRegistrations;
    if (requireEmailVerification !== undefined) updateData.requireEmailVerification = requireEmailVerification;
    if (defaultUserPlan !== undefined) updateData.defaultUserPlan = defaultUserPlan;
    if (maxLoginAttempts !== undefined) updateData.maxLoginAttempts = maxLoginAttempts;
    if (sessionTimeout !== undefined) updateData.sessionTimeout = sessionTimeout;
    if (enableAI !== undefined) updateData.enableAI = enableAI;
    if (enableTeams !== undefined) updateData.enableTeams = enableTeams;

    await db.collection(SYSTEM_SETTINGS_COLLECTION).updateOne(
      { key: 'main' },
      {
        $set: updateData,
        $setOnInsert: { key: 'main', createdAt: new Date() },
      },
      { upsert: true }
    );

    // Log activity
    await db.collection(COLLECTIONS.ACTIVITY_LOGS).insertOne({
      userId: adminCheck.user._id,
      action: 'settings_updated',
      entityType: 'settings',
      details: body,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Settings updated successfully' },
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
