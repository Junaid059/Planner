// Analytics Weekly Report API
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId } from '@/lib/db/mongodb';
import { PomodoroSession, Task, StudyStreak, StudyPlan } from '@/lib/db/models';
import { verifyToken } from '@/lib/auth/jwt';

// GET /api/analytics/weekly - Get weekly report
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

    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    const previousWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14);

    const db = await getDb();
    const userId = toObjectId(payload.userId);

    // Get collections
    const sessionsCollection = db.collection<PomodoroSession>(COLLECTIONS.POMODORO_SESSIONS);
    const tasksCollection = db.collection<Task>(COLLECTIONS.TASKS);
    const streakCollection = db.collection<StudyStreak>(COLLECTIONS.STUDY_STREAKS);
    const plansCollection = db.collection<StudyPlan>(COLLECTIONS.STUDY_PLANS);

    // Fetch data in parallel
    const [
      currentSessions,
      previousSessions,
      completedTasks,
      totalTasks,
      streak,
      plans,
    ] = await Promise.all([
      sessionsCollection.find({
        userId,
        completed: true,
        type: 'WORK',
        startedAt: { $gte: weekStart },
      }).toArray(),
      sessionsCollection.find({
        userId,
        completed: true,
        type: 'WORK',
        startedAt: { $gte: previousWeekStart, $lt: weekStart },
      }).toArray(),
      tasksCollection.countDocuments({
        userId,
        status: 'COMPLETED',
        completedAt: { $gte: weekStart },
      }),
      tasksCollection.countDocuments({
        userId,
        createdAt: { $gte: weekStart },
      }),
      streakCollection.findOne({ userId }),
      plansCollection.find({ userId, status: 'ACTIVE' }).toArray(),
    ]);

    // Calculate current week metrics
    const currentMinutes = currentSessions.reduce((sum: number, s) => sum + (s.actualDuration || s.duration), 0);
    const currentHours = Math.round(currentMinutes / 60 * 10) / 10;
    const currentPomodoros = currentSessions.length;

    // Calculate previous week metrics for comparison
    const previousMinutes = previousSessions.reduce((sum: number, s) => sum + (s.actualDuration || s.duration), 0);
    const previousPomodoros = previousSessions.length;

    // Calculate trends
    const minutesTrend = previousMinutes > 0 
      ? Math.round(((currentMinutes - previousMinutes) / previousMinutes) * 100)
      : 100;
    const pomodorosTrend = previousPomodoros > 0
      ? Math.round(((currentPomodoros - previousPomodoros) / previousPomodoros) * 100)
      : 100;

    // Daily breakdown
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyBreakdown = daysOfWeek.map((day, index) => {
      const daySessions = currentSessions.filter(s => s.startedAt.getDay() === index);
      const minutes = daySessions.reduce((sum: number, s) => sum + (s.actualDuration || s.duration), 0);
      return {
        day,
        dayIndex: index,
        sessions: daySessions.length,
        minutes,
        hours: Math.round(minutes / 60 * 10) / 10,
      };
    });

    // Find peak study day
    const peakDay = dailyBreakdown.reduce((max, day) => 
      day.minutes > max.minutes ? day : max
    , dailyBreakdown[0]);

    // Study by plan breakdown
    const studyByPlan: Record<string, { planId: string; title: string; minutes: number; sessions: number }> = {};
    currentSessions.forEach(session => {
      const key = session.planId?.toString() || 'unassigned';
      if (!studyByPlan[key]) {
        const plan = plans.find(p => p._id?.toString() === key);
        studyByPlan[key] = {
          planId: key,
          title: plan?.title || 'Unassigned',
          minutes: 0,
          sessions: 0,
        };
      }
      studyByPlan[key].minutes += session.actualDuration || session.duration;
      studyByPlan[key].sessions++;
    });

    // Task completion rate
    const taskCompletionRate = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        period: {
          start: weekStart.toISOString(),
          end: now.toISOString(),
        },
        summary: {
          totalHours: currentHours,
          totalMinutes: currentMinutes,
          totalPomodoros: currentPomodoros,
          completedTasks,
          totalTasks,
          taskCompletionRate,
          avgMinutesPerDay: Math.round(currentMinutes / 7),
        },
        trends: {
          studyTime: minutesTrend,
          pomodoros: pomodorosTrend,
          direction: minutesTrend >= 0 ? 'up' : 'down',
        },
        streak: streak ? {
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          lastStudyDate: streak.lastStudyDate,
        } : {
          currentStreak: 0,
          longestStreak: 0,
          lastStudyDate: null,
        },
        dailyBreakdown,
        peakDay: {
          day: peakDay.day,
          hours: peakDay.hours,
          sessions: peakDay.sessions,
        },
        byPlan: Object.values(studyByPlan).map(p => ({
          ...p,
          hours: Math.round(p.minutes / 60 * 10) / 10,
        })),
        activePlans: plans.map(plan => ({
          id: plan._id?.toString(),
          title: plan.title,
          progress: plan.progress || 0,
          color: plan.color,
        })),
      },
    });
  } catch (error) {
    console.error('Get weekly report error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
