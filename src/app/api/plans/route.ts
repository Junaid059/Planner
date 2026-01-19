// Study Plans API - List and Create
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId } from '@/lib/db/mongodb';
import { StudyPlan } from '@/lib/db/models';
import { verifyToken } from '@/lib/auth/jwt';

// GET /api/plans - List all study plans for user
export async function GET(request: NextRequest) {
  try {
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

    // Get query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const db = await getDb();
    const plansCollection = db.collection<StudyPlan>(COLLECTIONS.STUDY_PLANS);
    const userId = toObjectId(payload.userId);

    // Build filter
    const filter: Record<string, unknown> = { userId };
    if (status) {
      filter.status = status.toUpperCase();
    }

    // Get plans with pagination
    const [plans, total] = await Promise.all([
      plansCollection
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      plansCollection.countDocuments(filter),
    ]);

    // Get task and session counts for each plan
    const tasksCollection = db.collection(COLLECTIONS.TASKS);
    const sessionsCollection = db.collection(COLLECTIONS.POMODORO_SESSIONS);

    const plansWithCounts = await Promise.all(
      plans.map(async (plan) => {
        const [tasksCount, sessionsCount] = await Promise.all([
          tasksCollection.countDocuments({ planId: plan._id }),
          sessionsCollection.countDocuments({ planId: plan._id }),
        ]);
        return {
          ...plan,
          id: plan._id!.toString(),
          _count: { tasks: tasksCount, sessions: sessionsCount },
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: plansWithCounts,
      meta: {
        page,
        limit,
        total,
        hasMore: skip + plans.length < total,
      },
    });
  } catch (error) {
    console.error('List plans error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// POST /api/plans - Create a new study plan
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const { title, description, subject, color, startDate, endDate, hoursPerWeek } = body;

    // Validation
    if (!title || !subject) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL002', message: 'Title and subject are required' } },
        { status: 400 }
      );
    }

    const db = await getDb();
    const plansCollection = db.collection<StudyPlan>(COLLECTIONS.STUDY_PLANS);
    const userId = toObjectId(payload.userId);

    // Check plan limit for free users
    if (payload.plan === 'FREE') {
      const planCount = await plansCollection.countDocuments({
        userId,
        status: { $ne: 'ARCHIVED' },
      });
      if (planCount >= 3) {
        return NextResponse.json(
          { success: false, error: { code: 'RATE002', message: 'Free plan limited to 3 active study plans. Upgrade to Pro for unlimited.' } },
          { status: 403 }
        );
      }
    }

    // Create plan
    const now = new Date();
    const newPlan: StudyPlan = {
      userId,
      title,
      description: description || '',
      subject,
      color: color || '#3B82F6',
      status: 'ACTIVE',
      progress: 0,
      hoursPerWeek: hoursPerWeek || 10,
      targetDate: endDate ? new Date(endDate) : undefined,
      createdAt: now,
      updatedAt: now,
    };

    const result = await plansCollection.insertOne(newPlan);

    return NextResponse.json({
      success: true,
      data: {
        ...newPlan,
        id: result.insertedId.toString(),
        _id: result.insertedId,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Create plan error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
