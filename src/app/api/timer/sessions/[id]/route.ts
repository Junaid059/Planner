// Timer Session API - Complete, update, or delete session
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId, isValidObjectId } from '@/lib/db/mongodb';
import { PomodoroSession, Task, DailyStats, StudyStreak } from '@/lib/db/models';
import { verifyToken } from '@/lib/auth/jwt';

// GET /api/timer/sessions/[id] - Get single session
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
        { success: false, error: { code: 'VAL001', message: 'Invalid session ID' } },
        { status: 400 }
      );
    }

    const db = await getDb();
    const sessionsCollection = db.collection<PomodoroSession>(COLLECTIONS.POMODORO_SESSIONS);
    const userId = toObjectId(payload.userId);

    const session = await sessionsCollection.findOne({
      _id: toObjectId(id),
      userId,
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'RES001', message: 'Session not found' } },
        { status: 404 }
      );
    }

    // Get related task and plan info
    let task = null;
    let studyPlan = null;
    
    if (session.taskId) {
      const tasksCollection = db.collection<Task>(COLLECTIONS.TASKS);
      const taskDoc = await tasksCollection.findOne({ _id: session.taskId });
      if (taskDoc) {
        task = {
          id: taskDoc._id!.toString(),
          title: taskDoc.title,
          priority: taskDoc.priority,
          status: taskDoc.status,
        };
      }
    }
    
    if (session.planId) {
      const plansCollection = db.collection(COLLECTIONS.STUDY_PLANS);
      const planDoc = await plansCollection.findOne({ _id: session.planId });
      if (planDoc) {
        studyPlan = {
          id: planDoc._id!.toString(),
          title: planDoc.title,
          color: planDoc.color,
          icon: planDoc.icon,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...session,
        id: session._id!.toString(),
        task,
        studyPlan,
      },
    });
  } catch (error) {
    console.error('Get session error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// PATCH /api/timer/sessions/[id] - Update/complete session
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
        { success: false, error: { code: 'VAL001', message: 'Invalid session ID' } },
        { status: 400 }
      );
    }

    const db = await getDb();
    const sessionsCollection = db.collection<PomodoroSession>(COLLECTIONS.POMODORO_SESSIONS);
    const userId = toObjectId(payload.userId);

    // Verify ownership
    const existingSession = await sessionsCollection.findOne({
      _id: toObjectId(id),
      userId,
    });

    if (!existingSession) {
      return NextResponse.json(
        { success: false, error: { code: 'RES001', message: 'Session not found' } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { completed, notes, label, actualDuration, interrupted } = body;

    // Check if session is being completed
    const isBeingCompleted = completed === true && !existingSession.completed;

    // Build update
    const updateFields: Record<string, unknown> = {};
    if (completed !== undefined) updateFields.completed = completed;
    if (notes !== undefined) updateFields.notes = notes;
    if (label !== undefined) updateFields.label = label;
    if (actualDuration !== undefined) updateFields.actualDuration = actualDuration;
    if (interrupted !== undefined) updateFields.interrupted = interrupted;
    if (isBeingCompleted) updateFields.endTime = new Date();

    await sessionsCollection.updateOne(
      { _id: toObjectId(id) },
      { $set: updateFields }
    );

    const session = await sessionsCollection.findOne({ _id: toObjectId(id) });

    // Update daily stats if work session completed
    if (isBeingCompleted && session?.type === 'WORK') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const studyMinutes = actualDuration || session.duration;
      
      const dailyStatsCollection = db.collection<DailyStats>(COLLECTIONS.DAILY_STATS);
      await dailyStatsCollection.updateOne(
        { userId, date: today },
        {
          $inc: { focusSessions: 1, totalMinutes: studyMinutes },
          $setOnInsert: {
            userId,
            date: today,
            tasksCompleted: 0,
          },
        },
        { upsert: true }
      );

      // Update task actual minutes if linked
      if (session.taskId) {
        const tasksCollection = db.collection<Task>(COLLECTIONS.TASKS);
        await tasksCollection.updateOne(
          { _id: session.taskId },
          { $inc: { actualMinutes: studyMinutes } }
        );

        // Update task to in_progress if still todo
        const task = await tasksCollection.findOne({ _id: session.taskId });
        if (task && task.status === 'TODO') {
          await tasksCollection.updateOne(
            { _id: session.taskId },
            { $set: { status: 'IN_PROGRESS' } }
          );
        }
      }

      // Update study streak
      const streakCollection = db.collection<StudyStreak>(COLLECTIONS.STUDY_STREAKS);
      const streak = await streakCollection.findOne({ userId });

      if (streak) {
        const lastStudyDate = streak.lastStudyDate;
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let newCurrentStreak = streak.currentStreak;
        let incrementTotalDays = 0;
        
        // If last study was yesterday, increment streak
        if (lastStudyDate && lastStudyDate.toDateString() === yesterday.toDateString()) {
          newCurrentStreak = streak.currentStreak + 1;
          incrementTotalDays = 1;
        } 
        // If last study was today, keep same streak
        else if (lastStudyDate && lastStudyDate.toDateString() === today.toDateString()) {
          // Do nothing, already counted today
        } 
        // Otherwise, reset to 1
        else {
          newCurrentStreak = 1;
          incrementTotalDays = 1;
        }

        await streakCollection.updateOne(
          { userId },
          {
            $set: {
              currentStreak: newCurrentStreak,
              longestStreak: Math.max(newCurrentStreak, streak.longestStreak),
              lastStudyDate: today,
            },
            $inc: { totalStudyDays: incrementTotalDays },
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...session,
        id: session?._id!.toString(),
      },
    });
  } catch (error) {
    console.error('Update session error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// DELETE /api/timer/sessions/[id] - Delete session
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
        { success: false, error: { code: 'VAL001', message: 'Invalid session ID' } },
        { status: 400 }
      );
    }

    const db = await getDb();
    const sessionsCollection = db.collection<PomodoroSession>(COLLECTIONS.POMODORO_SESSIONS);
    const userId = toObjectId(payload.userId);

    // Verify ownership
    const existingSession = await sessionsCollection.findOne({
      _id: toObjectId(id),
      userId,
    });

    if (!existingSession) {
      return NextResponse.json(
        { success: false, error: { code: 'RES001', message: 'Session not found' } },
        { status: 404 }
      );
    }

    await sessionsCollection.deleteOne({ _id: toObjectId(id) });

    return NextResponse.json({
      success: true,
      data: { message: 'Session deleted successfully' },
    });
  } catch (error) {
    console.error('Delete session error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
