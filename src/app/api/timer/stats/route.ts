// Timer Stats API - Get daily/weekly timer statistics
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId } from '@/lib/db/mongodb';
import { PomodoroSession, DailyStats, StudyStreak } from '@/lib/db/models';
import { verifyToken } from '@/lib/auth/jwt';

// GET /api/timer/stats - Get timer statistics
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
    const period = searchParams.get('period') || 'today'; // today, week, month, all

    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'all':
        startDate = new Date(0);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    const db = await getDb();
    const sessionsCollection = db.collection<PomodoroSession>(COLLECTIONS.POMODORO_SESSIONS);
    const dailyStatsCollection = db.collection<DailyStats>(COLLECTIONS.DAILY_STATS);
    const streakCollection = db.collection<StudyStreak>(COLLECTIONS.STUDY_STREAKS);
    const userId = toObjectId(payload.userId);

    // Get completed work sessions in period
    const sessions = await sessionsCollection.find({
      userId,
      completed: true,
      type: 'WORK',
      startedAt: { $gte: startDate },
    }).toArray();

    // Calculate statistics
    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce((sum: number, s) => sum + (s.actualDuration || s.duration), 0);
    const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
    const interruptedSessions = sessions.filter(s => s.interrupted).length;
    const completionRate = totalSessions > 0 
      ? Math.round(((totalSessions - interruptedSessions) / totalSessions) * 100) 
      : 0;

    // Average sessions per day
    const daysDiff = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const averagePerDay = Math.round(totalSessions / daysDiff * 10) / 10;

    // Group by date for chart data
    const byDate: Record<string, { sessions: number; minutes: number }> = {};
    sessions.forEach(session => {
      const dateKey = session.startedAt.toISOString().split('T')[0];
      if (!byDate[dateKey]) {
        byDate[dateKey] = { sessions: 0, minutes: 0 };
      }
      byDate[dateKey].sessions++;
      byDate[dateKey].minutes += session.actualDuration || session.duration;
    });

    // Group by study plan
    const byPlan: Record<string, number> = {};
    sessions.forEach(session => {
      if (session.planId) {
        const planIdStr = session.planId.toString();
        byPlan[planIdStr] = (byPlan[planIdStr] || 0) + 1;
      }
    });

    // Get study streak
    const streak = await streakCollection.findOne({ userId });

    // Get today's stats
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayStats = await dailyStatsCollection.findOne({
      userId,
      date: todayStart,
    });

    return NextResponse.json({
      success: true,
      data: {
        period,
        summary: {
          totalSessions,
          totalMinutes,
          totalHours,
          averagePerDay,
          completionRate,
          interruptedSessions,
        },
        streak: streak ? {
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          lastStudyDate: streak.lastStudyDate,
          totalStudyDays: streak.totalStudyDays || 0,
        } : {
          currentStreak: 0,
          longestStreak: 0,
          lastStudyDate: null,
          totalStudyDays: 0,
        },
        today: todayStats ? {
          pomodorosCompleted: todayStats.focusSessions || todayStats.sessionsCompleted,
          totalStudyMinutes: todayStats.totalMinutes,
          tasksCompleted: todayStats.tasksCompleted,
        } : {
          pomodorosCompleted: 0,
          totalStudyMinutes: 0,
          tasksCompleted: 0,
        },
        chartData: Object.entries(byDate).map(([date, data]) => ({
          date,
          sessions: data.sessions,
          minutes: data.minutes,
        })).sort((a, b) => a.date.localeCompare(b.date)),
        byPlan,
      },
    });
  } catch (error) {
    console.error('Get timer stats error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
