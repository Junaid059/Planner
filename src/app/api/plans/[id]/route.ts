// Study Plans API - Get, Update, Delete single plan
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId, isValidObjectId } from '@/lib/db/mongodb';
import { StudyPlan, Task, PomodoroSession } from '@/lib/db/models';
import { verifyToken } from '@/lib/auth/jwt';

// GET /api/plans/[id] - Get single study plan
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

    if (!payload) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH003', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL001', message: 'Invalid plan ID' } },
        { status: 400 }
      );
    }

    const db = await getDb();
    const plansCollection = db.collection<StudyPlan>(COLLECTIONS.STUDY_PLANS);
    const tasksCollection = db.collection<Task>(COLLECTIONS.TASKS);
    const sessionsCollection = db.collection<PomodoroSession>(COLLECTIONS.POMODORO_SESSIONS);
    const userId = toObjectId(payload.userId);
    const planId = toObjectId(id);

    const plan = await plansCollection.findOne({ _id: planId, userId });

    if (!plan) {
      return NextResponse.json(
        { success: false, error: { code: 'RES001', message: 'Study plan not found' } },
        { status: 404 }
      );
    }

    // Get related data
    const [tasks, sessions, taskCount, sessionCount] = await Promise.all([
      tasksCollection.find({ planId }).sort({ dueDate: 1 }).limit(10).toArray(),
      sessionsCollection.find({ planId }).sort({ startTime: -1 }).limit(10).toArray(),
      tasksCollection.countDocuments({ planId }),
      sessionsCollection.countDocuments({ planId }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...plan,
        id: plan._id!.toString(),
        goals: plan.goals || [],
        tasks: tasks.map(t => ({ ...t, id: t._id!.toString() })),
        sessions: sessions.map(s => ({ ...s, id: s._id!.toString() })),
        _count: {
          tasks: taskCount,
          sessions: sessionCount,
        },
      },
    });
  } catch (error) {
    console.error('Get plan error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// PATCH /api/plans/[id] - Update study plan
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

    if (!payload) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH003', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL001', message: 'Invalid plan ID' } },
        { status: 400 }
      );
    }

    const db = await getDb();
    const plansCollection = db.collection<StudyPlan>(COLLECTIONS.STUDY_PLANS);
    const userId = toObjectId(payload.userId);
    const planId = toObjectId(id);

    // Verify ownership
    const existingPlan = await plansCollection.findOne({ _id: planId, userId });

    if (!existingPlan) {
      return NextResponse.json(
        { success: false, error: { code: 'RES001', message: 'Study plan not found' } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { title, description, subject, color, icon, startDate, endDate, status, progress } = body;

    // Validate status if provided
    if (status && !['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'].includes(status)) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL003', message: 'Invalid status value' } },
        { status: 400 }
      );
    }

    // Build update object
    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;
    if (subject !== undefined) updateFields.subject = subject;
    if (color !== undefined) updateFields.color = color;
    if (icon !== undefined) updateFields.icon = icon;
    if (startDate !== undefined) updateFields.startDate = new Date(startDate);
    if (endDate !== undefined) updateFields.endDate = endDate ? new Date(endDate) : null;
    if (status !== undefined) updateFields.status = status;
    if (progress !== undefined) updateFields.progress = progress;

    await plansCollection.updateOne({ _id: planId }, { $set: updateFields });

    const updatedPlan = await plansCollection.findOne({ _id: planId });

    return NextResponse.json({
      success: true,
      data: {
        ...updatedPlan,
        id: updatedPlan?._id!.toString(),
      },
    });
  } catch (error) {
    console.error('Update plan error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// DELETE /api/plans/[id] - Delete study plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL001', message: 'Invalid plan ID' } },
        { status: 400 }
      );
    }

    const db = await getDb();
    const plansCollection = db.collection<StudyPlan>(COLLECTIONS.STUDY_PLANS);
    const tasksCollection = db.collection<Task>(COLLECTIONS.TASKS);
    const sessionsCollection = db.collection<PomodoroSession>(COLLECTIONS.POMODORO_SESSIONS);
    const userId = toObjectId(payload.userId);
    const planId = toObjectId(id);

    // Verify ownership
    const existingPlan = await plansCollection.findOne({ _id: planId, userId });

    if (!existingPlan) {
      return NextResponse.json(
        { success: false, error: { code: 'RES001', message: 'Study plan not found' } },
        { status: 404 }
      );
    }

    // Delete plan and related data
    await Promise.all([
      plansCollection.deleteOne({ _id: planId }),
      tasksCollection.deleteMany({ planId }),
      sessionsCollection.deleteMany({ planId }),
    ]);

    return NextResponse.json({
      success: true,
      data: { message: 'Study plan deleted successfully' },
    });
  } catch (error) {
    console.error('Delete plan error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
