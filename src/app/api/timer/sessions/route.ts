// Timer/Pomodoro API - Sessions and Timer Management
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId, isValidObjectId } from '@/lib/db/mongodb';
import { PomodoroSession } from '@/lib/db/models';
import { verifyToken } from '@/lib/auth/jwt';

// GET /api/timer/sessions - Get pomodoro sessions
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type'); // WORK, SHORT_BREAK, LONG_BREAK
    const taskId = searchParams.get('taskId');
    const planId = searchParams.get('planId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const completed = searchParams.get('completed');

    const db = await getDb();
    const sessionsCollection = db.collection<PomodoroSession>(COLLECTIONS.POMODORO_SESSIONS);
    const userId = toObjectId(payload.userId);

    // Build filter
    const filter: Record<string, unknown> = { userId };

    if (type && ['WORK', 'SHORT_BREAK', 'LONG_BREAK'].includes(type)) {
      filter.type = type;
    }

    if (taskId && isValidObjectId(taskId)) {
      filter.taskId = toObjectId(taskId);
    }

    if (planId && isValidObjectId(planId)) {
      filter.planId = toObjectId(planId);
    }

    if (completed !== null && completed !== undefined) {
      filter.completed = completed === 'true';
    }

    if (startDate || endDate) {
      filter.startedAt = {};
      if (startDate) {
        (filter.startedAt as Record<string, Date>).$gte = new Date(startDate);
      }
      if (endDate) {
        (filter.startedAt as Record<string, Date>).$lte = new Date(endDate);
      }
    }

    // Get paginated sessions
    const skip = (page - 1) * limit;
    const [sessions, total] = await Promise.all([
      sessionsCollection
        .find(filter)
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      sessionsCollection.countDocuments(filter),
    ]);

    // Get task and plan info
    const tasksCollection = db.collection(COLLECTIONS.TASKS);
    const plansCollection = db.collection(COLLECTIONS.STUDY_PLANS);

    interface SessionWithDetails extends PomodoroSession {
      id: string;
      task: { id: string; title: string; priority: string } | null;
      studyPlan: { id: string; title: string; color: string } | null;
    }

    const sessionsWithDetails: SessionWithDetails[] = await Promise.all(
      sessions.map(async (session): Promise<SessionWithDetails> => {
        let task = null;
        let studyPlan = null;

        if (session.taskId) {
          const taskDoc = await tasksCollection.findOne({ _id: session.taskId });
          if (taskDoc) {
            task = {
              id: taskDoc._id!.toString(),
              title: taskDoc.title as string,
              priority: taskDoc.priority as string,
            };
          }
        }

        if (session.planId) {
          const planDoc = await plansCollection.findOne({ _id: session.planId });
          if (planDoc) {
            studyPlan = {
              id: planDoc._id!.toString(),
              title: planDoc.title as string,
              color: planDoc.color as string,
            };
          }
        }

        return {
          ...session,
          id: session._id!.toString(),
          task,
          studyPlan,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: sessionsWithDetails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// POST /api/timer/sessions - Start new session
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
    const { type, duration, taskId, planId, notes, completed, actualDuration } = body;

    // Validate type
    if (!type || !['WORK', 'SHORT_BREAK', 'LONG_BREAK'].includes(type)) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL003', message: 'Invalid session type' } },
        { status: 400 }
      );
    }

    const db = await getDb();
    const sessionsCollection = db.collection<PomodoroSession>(COLLECTIONS.POMODORO_SESSIONS);
    const userId = toObjectId(payload.userId);

    // Create session
    const now = new Date();
    const newSession: PomodoroSession = {
      userId,
      taskId: taskId && isValidObjectId(taskId) ? toObjectId(taskId) : undefined,
      planId: planId && isValidObjectId(planId) ? toObjectId(planId) : undefined,
      type: type as PomodoroSession['type'],
      duration: duration || (type === 'WORK' ? 25 : type === 'SHORT_BREAK' ? 5 : 15),
      startedAt: now,
      completed: completed || false,
      completedAt: completed ? now : undefined,
      actualDuration: actualDuration || undefined,
      notes: notes || '',
    };

    const result = await sessionsCollection.insertOne(newSession);

    // Update streak if session was completed
    if (completed && type === 'WORK') {
      const streaksCollection = db.collection(COLLECTIONS.STUDY_STREAKS);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingStreak = await streaksCollection.findOne({ userId });
      
      if (existingStreak) {
        const lastStudyDate = existingStreak.lastStudyDate ? new Date(existingStreak.lastStudyDate as Date) : null;
        lastStudyDate?.setHours(0, 0, 0, 0);
        
        const isConsecutive = lastStudyDate && 
          (today.getTime() - lastStudyDate.getTime()) <= 24 * 60 * 60 * 1000;
        const isNewDay = !lastStudyDate || lastStudyDate.getTime() < today.getTime();

        if (isNewDay) {
          const currentStreak = (existingStreak.currentStreak as number) || 0;
          const longestStreak = (existingStreak.longestStreak as number) || 0;
          const totalStudyDays = (existingStreak.totalStudyDays as number) || 0;
          const newStreak = isConsecutive ? currentStreak + 1 : 1;
          await streaksCollection.updateOne(
            { userId },
            {
              $set: {
                currentStreak: newStreak,
                longestStreak: Math.max(newStreak, longestStreak),
                lastStudyDate: now,
                totalStudyDays: totalStudyDays + 1,
              },
            }
          );
        }
      } else {
        await streaksCollection.insertOne({
          userId,
          currentStreak: 1,
          longestStreak: 1,
          lastStudyDate: now,
          totalStudyDays: 1,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...newSession,
        id: result.insertedId.toString(),
        _id: result.insertedId,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
