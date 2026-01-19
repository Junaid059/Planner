// Tasks API - List and Create
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId, isValidObjectId } from '@/lib/db/mongodb';
import { Task, Subtask } from '@/lib/db/models';
import { verifyToken } from '@/lib/auth/jwt';

// GET /api/tasks - List all tasks for user
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
    const priority = searchParams.get('priority');
    const studyPlanId = searchParams.get('planId');
    const dueDate = searchParams.get('dueDate'); // YYYY-MM-DD format
    const overdue = searchParams.get('overdue') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const db = await getDb();
    const tasksCollection = db.collection<Task>(COLLECTIONS.TASKS);
    const userId = toObjectId(payload.userId);

    // Build filter
    const filter: Record<string, unknown> = { userId };
    
    if (status) {
      filter.status = status.toUpperCase();
    }
    if (priority) {
      filter.priority = priority.toUpperCase();
    }
    if (studyPlanId && isValidObjectId(studyPlanId)) {
      filter.planId = toObjectId(studyPlanId);
    }
    if (dueDate) {
      const date = new Date(dueDate);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      filter.dueDate = {
        $gte: date,
        $lt: nextDay,
      };
    }
    if (overdue) {
      filter.dueDate = { $lt: new Date() };
      filter.status = { $ne: 'COMPLETED' };
    }

    // Get tasks with pagination
    const [tasks, total] = await Promise.all([
      tasksCollection
        .find(filter)
        .sort({ dueDate: 1, priority: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      tasksCollection.countDocuments(filter),
    ]);

    // Get plan info and subtask counts
    const plansCollection = db.collection(COLLECTIONS.STUDY_PLANS);
    
    const tasksWithDetails = await Promise.all(
      tasks.map(async (task) => {
        let studyPlan = null;
        if (task.planId) {
          const plan = await plansCollection.findOne({ _id: task.planId });
          if (plan) {
            studyPlan = {
              id: plan._id!.toString(),
              title: plan.title,
              color: plan.color,
            };
          }
        }
        
        const subtaskCount = task.subtasks?.length || 0;
        
        return {
          ...task,
          id: task._id!.toString(),
          studyPlan,
          _count: {
            subtasks: subtaskCount,
          },
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: tasksWithDetails,
      meta: {
        page,
        limit,
        total,
        hasMore: skip + tasks.length < total,
      },
    });
  } catch (error) {
    console.error('List tasks error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create a new task
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
    const {
      title,
      description,
      subject,
      priority,
      dueDate,
      estimatedMinutes,
      subtasks,
      studyPlanId,
    } = body;

    // Validation
    if (!title) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL002', message: 'Title is required' } },
        { status: 400 }
      );
    }

    // Validate priority if provided
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    const taskPriority = priority ? priority.toUpperCase() : 'MEDIUM';
    if (!validPriorities.includes(taskPriority)) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL003', message: 'Invalid priority value' } },
        { status: 400 }
      );
    }

    const db = await getDb();
    const tasksCollection = db.collection<Task>(COLLECTIONS.TASKS);
    const userId = toObjectId(payload.userId);

    // Create task
    const now = new Date();
    const newTask: Task = {
      userId,
      planId: studyPlanId && isValidObjectId(studyPlanId) ? toObjectId(studyPlanId) : undefined,
      title,
      description: description || '',
      subject: subject || '',
      priority: taskPriority as Task['priority'],
      status: 'TODO',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      estimatedMinutes: estimatedMinutes || null,
      createdAt: now,
      updatedAt: now,
      subtasks: subtasks?.map((st: { title: string }) => ({
        _id: toObjectId(new Date().getTime().toString(16) + Math.random().toString(16).slice(2)),
        taskId: undefined as unknown as typeof userId, // Will be set after insert
        title: st.title,
        completed: false,
        createdAt: now,
      })) as Subtask[] || [],
    };

    const result = await tasksCollection.insertOne(newTask);

    return NextResponse.json({
      success: true,
      data: {
        ...newTask,
        id: result.insertedId.toString(),
        _id: result.insertedId,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
