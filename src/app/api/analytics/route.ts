// Analytics API - Comprehensive study analytics
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId, isValidObjectId } from '@/lib/db/mongodb';
import { PomodoroSession, Task, DailyStats, StudyStreak, UserAchievement } from '@/lib/db/models';
import { verifyToken } from '@/lib/auth/jwt';

// GET /api/analytics - Get comprehensive analytics
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
    const period = searchParams.get('period') || 'week'; // day, week, month, year
    const planId = searchParams.get('planId');

    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    }

    const db = await getDb();
    const userId = toObjectId(payload.userId);

    // Build filters
    const sessionFilter: Record<string, unknown> = {
      userId,
      completed: true,
      type: 'WORK',
      startedAt: { $gte: startDate },
    };

    const taskFilter: Record<string, unknown> = {
      userId,
      createdAt: { $gte: startDate },
    };

    if (planId && isValidObjectId(planId)) {
      sessionFilter.planId = toObjectId(planId);
      taskFilter.planId = toObjectId(planId);
    }

    // Get all data in parallel
    const sessionsCollection = db.collection<PomodoroSession>(COLLECTIONS.POMODORO_SESSIONS);
    const tasksCollection = db.collection<Task>(COLLECTIONS.TASKS);
    const dailyStatsCollection = db.collection<DailyStats>(COLLECTIONS.DAILY_STATS);
    const streaksCollection = db.collection<StudyStreak>(COLLECTIONS.STUDY_STREAKS);
    const achievementsCollection = db.collection<UserAchievement>(COLLECTIONS.USER_ACHIEVEMENTS);
    const plansCollection = db.collection(COLLECTIONS.STUDY_PLANS);

    const [
      sessions,
      completedTasks,
      totalTasks,
      dailyStats,
      streak,
      userAchievements,
      plans,
    ] = await Promise.all([
      sessionsCollection.find(sessionFilter).toArray(),
      tasksCollection.countDocuments({ ...taskFilter, status: 'COMPLETED' }),
      tasksCollection.countDocuments(taskFilter),
      dailyStatsCollection
        .find({ userId, date: { $gte: startDate } })
        .sort({ date: -1 })
        .toArray(),
      streaksCollection.findOne({ userId }),
      achievementsCollection.find({ userId }).toArray(),
      plansCollection.find({ userId, status: { $in: ['ACTIVE', 'COMPLETED'] } }).toArray(),
    ]);

    // Calculate metrics
    const totalMinutes = sessions.reduce((acc: number, s) => acc + (s.duration || 0), 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    const totalSessions = sessions.length;
    const avgSessionLength = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const interruptedSessions = sessions.filter((s) => s.interrupted).length;

    // Calculate daily breakdown
    const dailyBreakdown: Record<string, { minutes: number; sessions: number; tasks: number }> = {};
    
    sessions.forEach((session) => {
      const dateKey = session.startedAt.toISOString().split('T')[0];
      if (!dailyBreakdown[dateKey]) {
        dailyBreakdown[dateKey] = { minutes: 0, sessions: 0, tasks: 0 };
      }
      dailyBreakdown[dateKey].minutes += session.duration || 0;
      dailyBreakdown[dateKey].sessions += 1;
    });

    // Add task completion to daily breakdown
    const completedTasksList = await tasksCollection
      .find({ ...taskFilter, status: 'COMPLETED', completedAt: { $exists: true } })
      .toArray();

    completedTasksList.forEach((task) => {
      if (task.completedAt) {
        const dateKey = task.completedAt.toISOString().split('T')[0];
        if (!dailyBreakdown[dateKey]) {
          dailyBreakdown[dateKey] = { minutes: 0, sessions: 0, tasks: 0 };
        }
        dailyBreakdown[dateKey].tasks += 1;
      }
    });

    // Calculate hourly distribution (best study times)
    const hourlyDistribution: Record<number, number> = {};
    sessions.forEach((session) => {
      const hour = session.startedAt.getHours();
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + (session.duration || 0);
    });

    // Find peak hours
    const peakHours = Object.entries(hourlyDistribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    // Study time by day of week
    const studyByDayOfWeek: Record<number, number> = {};
    sessions.forEach((session) => {
      const dayOfWeek = session.startedAt.getDay();
      studyByDayOfWeek[dayOfWeek] = (studyByDayOfWeek[dayOfWeek] || 0) + (session.duration || 0);
    });

    // Calculate focus score (based on completion rate and consistency)
    const daysWithActivity = Object.keys(dailyBreakdown).length;
    const expectedDays = period === 'day' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 365;
    const consistencyScore = Math.min(100, Math.round((daysWithActivity / expectedDays) * 100));
    const focusScore = Math.round((taskCompletionRate * 0.4) + (consistencyScore * 0.6));

    // Calculate trends (compare to previous period)
    const previousPeriodStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
    const previousSessions = await sessionsCollection.find({
      userId,
      completed: true,
      type: 'WORK',
      startedAt: { $gte: previousPeriodStart, $lt: startDate },
    }).toArray();

    const previousMinutes = previousSessions.reduce((sum: number, s) => sum + (s.duration || 0), 0);
    const previousPomodoros = previousSessions.length;

    const studyTimeTrend = previousMinutes > 0 
      ? Math.round(((totalMinutes - previousMinutes) / previousMinutes) * 100) 
      : 100;
    const pomodorosTrend = previousPomodoros > 0 
      ? Math.round(((totalSessions - previousPomodoros) / previousPomodoros) * 100) 
      : 100;

    // Calculate averages
    const daysDiff = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const avgMinutesPerDay = Math.round(totalMinutes / daysDiff);
    const avgPomodorosPerDay = Math.round((totalSessions / daysDiff) * 10) / 10;

    return NextResponse.json({
      success: true,
      data: {
        period,
        overview: {
          totalStudyHours: totalHours,
          totalStudyMinutes: totalMinutes,
          totalHours,
          totalMinutes,
          totalSessions,
          totalPomodoros: totalSessions,
          avgSessionLength,
          completedTasks,
          totalTasks,
          taskCompletionRate,
          focusScore,
          avgMinutesPerDay,
          avgPomodorosPerDay,
          interruptedSessions,
          focusRate: totalSessions > 0 
            ? Math.round(((totalSessions - interruptedSessions) / totalSessions) * 100) 
            : 0,
        },
        trends: {
          studyTime: studyTimeTrend,
          pomodoros: pomodorosTrend,
        },
        streak: streak ? {
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          lastStudyDate: streak.lastStudyDate,
          totalStudyDays: streak.totalStudyDays,
        } : { currentStreak: 0, longestStreak: 0, lastStudyDate: null, totalStudyDays: 0 },
        dailyBreakdown: Object.entries(dailyBreakdown).map(([date, data]) => ({
          date,
          ...data,
          hours: Math.round((data.minutes / 60) * 10) / 10,
        })).sort((a, b) => a.date.localeCompare(b.date)),
        hourlyDistribution: Object.entries(hourlyDistribution).map(([hour, minutes]) => ({
          hour: parseInt(hour),
          minutes,
        })).sort((a, b) => a.hour - b.hour),
        distribution: {
          byHour: Object.entries(hourlyDistribution).map(([hour, minutes]) => ({
            hour: parseInt(hour),
            minutes,
          })).sort((a, b) => a.hour - b.hour),
          byDayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => ({
            day,
            dayIndex: index,
            minutes: studyByDayOfWeek[index] || 0,
          })),
        },
        insights: {
          mostProductiveHours: peakHours.map(h => 
            h < 12 ? `${h || 12}AM` : `${h === 12 ? 12 : h - 12}PM`
          ),
          mostProductiveDay: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
            parseInt(Object.entries(studyByDayOfWeek).sort((a, b) => b[1] - a[1])[0]?.[0] || '0')
          ],
          avgSessionLength,
        },
        peakHours,
        achievements: userAchievements.length,
        plans: plans.map(plan => ({
          id: plan._id?.toString(),
          title: plan.title,
          color: plan.color,
          progress: plan.progress || 0,
          status: plan.status,
        })),
        dailyStats: dailyStats.map((stat) => ({
          date: stat.date,
          totalMinutes: stat.totalMinutes,
          sessionsCompleted: stat.sessionsCompleted,
          tasksCompleted: stat.tasksCompleted,
          focusScore: stat.focusScore,
        })),
      },
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
