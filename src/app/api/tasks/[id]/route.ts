// Tasks API - Get, Update, Delete single task
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId, isValidObjectId } from '@/lib/db/mongodb';
import { Task, DailyStats } from '@/lib/db/models';
import { verifyToken } from '@/lib/auth/jwt';

// GET /api/tasks/[id] - Get single task
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
        { success: false, error: { code: 'VAL001', message: 'Invalid task ID' } },
        { status: 400 }
      );
    }

    const db = await getDb();
    const tasksCollection = db.collection<Task>(COLLECTIONS.TASKS);
    const userId = toObjectId(payload.userId);

    const task = await tasksCollection.findOne({
      _id: toObjectId(id),
      userId,
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: { code: 'RES001', message: 'Task not found' } },
        { status: 404 }
      );
    }

    // Get related plan if exists
    let studyPlan = null;
    if (task.planId) {
      const plansCollection = db.collection(COLLECTIONS.STUDY_PLANS);
      const plan = await plansCollection.findOne({ _id: task.planId });
      if (plan) {
        studyPlan = {
          id: plan._id!.toString(),
          title: plan.title,
          color: plan.color,
          icon: plan.icon,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...task,
        id: task._id!.toString(),
        studyPlan,
      },
    });
  } catch (error) {
    console.error('Get task error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// PATCH /api/tasks/[id] - Update task
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
        { success: false, error: { code: 'VAL001', message: 'Invalid task ID' } },
        { status: 400 }
      );
    }

    const db = await getDb();
    const tasksCollection = db.collection<Task>(COLLECTIONS.TASKS);
    const userId = toObjectId(payload.userId);

    // Verify ownership
    const existingTask = await tasksCollection.findOne({
      _id: toObjectId(id),
      userId,
    });

    if (!existingTask) {
      return NextResponse.json(
        { success: false, error: { code: 'RES001', message: 'Task not found' } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      priority,
      status,
      dueDate,
      estimatedMinutes,
      actualMinutes,
      subject,
      studyPlanId,
    } = body;

    // Validate status if provided
    if (status && !['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL003', message: 'Invalid status value' } },
        { status: 400 }
      );
    }

    // Validate priority if provided
    if (priority && !['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL003', message: 'Invalid priority value' } },
        { status: 400 }
      );
    }

    // Check if task is being completed
    const isBeingCompleted = status === 'COMPLETED' && existingTask.status !== 'COMPLETED';

    // Build update object
    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;
    if (priority !== undefined) updateFields.priority = priority;
    if (status !== undefined) updateFields.status = status;
    if (dueDate !== undefined) updateFields.dueDate = dueDate ? new Date(dueDate) : null;
    if (estimatedMinutes !== undefined) updateFields.estimatedMinutes = estimatedMinutes;
    if (actualMinutes !== undefined) updateFields.actualMinutes = actualMinutes;
    if (subject !== undefined) updateFields.subject = subject;
    if (studyPlanId !== undefined) {
      updateFields.planId = studyPlanId && isValidObjectId(studyPlanId) 
        ? toObjectId(studyPlanId) 
        : null;
    }
    if (isBeingCompleted) {
      updateFields.completedAt = new Date();
    }

    await tasksCollection.updateOne(
      { _id: toObjectId(id) },
      { $set: updateFields }
    );

    // Get updated task
    const updatedTask = await tasksCollection.findOne({ _id: toObjectId(id) });

    // Update daily stats if task completed
    if (isBeingCompleted) {
      const dailyStatsCollection = db.collection<DailyStats>(COLLECTIONS.DAILY_STATS);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      await dailyStatsCollection.updateOne(
        { userId, date: today },
        {
          $inc: { tasksCompleted: 1 },
          $setOnInsert: {
            userId,
            date: today,
            totalMinutes: 0,
            focusSessions: 0,
          },
        },
        { upsert: true }
      );

      // Update study plan progress if linked
      if (updatedTask?.planId) {
        const planTasks = await tasksCollection.countDocuments({ planId: updatedTask.planId });
        const completedTasks = await tasksCollection.countDocuments({
          planId: updatedTask.planId,
          status: 'COMPLETED',
        });
        const progress = planTasks > 0 ? Math.round((completedTasks / planTasks) * 100) : 0;
        
        const plansCollection = db.collection(COLLECTIONS.STUDY_PLANS);
        await plansCollection.updateOne(
          { _id: updatedTask.planId },
          { $set: { progress, updatedAt: new Date() } }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...updatedTask,
        id: updatedTask?._id!.toString(),
      },
    });
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Delete task
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
        { success: false, error: { code: 'VAL001', message: 'Invalid task ID' } },
        { status: 400 }
      );
    }

    const db = await getDb();
    const tasksCollection = db.collection<Task>(COLLECTIONS.TASKS);
    const userId = toObjectId(payload.userId);

    // Verify ownership
    const existingTask = await tasksCollection.findOne({
      _id: toObjectId(id),
      userId,
    });

    if (!existingTask) {
      return NextResponse.json(
        { success: false, error: { code: 'RES001', message: 'Task not found' } },
        { status: 404 }
      );
    }

    // Delete task
    await tasksCollection.deleteOne({ _id: toObjectId(id) });

    return NextResponse.json({
      success: true,
      data: { message: 'Task deleted successfully' },
    });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
