// AI Suggestions API - Smart study suggestions with Gemini
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId } from '@/lib/db/mongodb';
import { Task, PomodoroSession, StudyPlan } from '@/lib/db/models';
import { verifyToken } from '@/lib/auth/jwt';

interface Suggestion {
  id: string;
  type: 'STUDY_TIP' | 'TASK_PRIORITY' | 'SCHEDULE' | 'BREAK' | 'REVIEW';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  relatedTaskId?: string;
  relatedPlanId?: string;
}

// Gemini API helper
async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// GET /api/ai/suggestions - Get AI-generated study suggestions
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

    const db = await getDb();
    const userId = toObjectId(payload.userId);

    // Get user's data for context
    const tasksCollection = db.collection<Task>(COLLECTIONS.TASKS);
    const sessionsCollection = db.collection<PomodoroSession>(COLLECTIONS.POMODORO_SESSIONS);
    const plansCollection = db.collection<StudyPlan>(COLLECTIONS.STUDY_PLANS);

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [pendingTasks, recentSessions, activePlans] = await Promise.all([
      tasksCollection.find({ 
        userId, 
        status: { $in: ['TODO', 'IN_PROGRESS'] } 
      }).sort({ priority: -1, dueDate: 1 }).limit(10).toArray(),
      sessionsCollection.find({ 
        userId, 
        completed: true,
        startedAt: { $gte: weekAgo } 
      }).toArray(),
      plansCollection.find({ 
        userId, 
        status: 'ACTIVE' 
      }).toArray(),
    ]);

    // Analyze user's study patterns
    const totalStudyMinutes = recentSessions.reduce((sum, s) => sum + (s.actualDuration || s.duration), 0);
    const avgMinutesPerDay = Math.round(totalStudyMinutes / 7);
    const studyDays = new Set(recentSessions.map(s => s.startedAt.toISOString().split('T')[0])).size;

    // Generate context for AI
    const context = {
      pendingTasksCount: pendingTasks.length,
      urgentTasks: pendingTasks.filter(t => t.priority === 'HIGH' || t.priority === 'URGENT').length,
      upcomingDeadlines: pendingTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)).length,
      avgStudyMinutesPerDay: avgMinutesPerDay,
      studyDaysThisWeek: studyDays,
      activePlansCount: activePlans.length,
    };

    // Generate suggestions based on data
    const suggestions: Suggestion[] = [];
    let suggestionId = 1;

    // Add data-driven suggestions
    if (context.urgentTasks > 0) {
      suggestions.push({
        id: `sugg-${suggestionId++}`,
        type: 'TASK_PRIORITY',
        title: 'Focus on urgent tasks',
        description: `You have ${context.urgentTasks} high-priority task${context.urgentTasks > 1 ? 's' : ''} that need attention.`,
        priority: 'high',
        actionable: true,
      });
    }

    if (context.upcomingDeadlines > 0) {
      suggestions.push({
        id: `sugg-${suggestionId++}`,
        type: 'SCHEDULE',
        title: 'Upcoming deadlines',
        description: `${context.upcomingDeadlines} task${context.upcomingDeadlines > 1 ? 's have' : ' has'} deadlines in the next 3 days.`,
        priority: 'high',
        actionable: true,
      });
    }

    if (avgMinutesPerDay < 60) {
      suggestions.push({
        id: `sugg-${suggestionId++}`,
        type: 'STUDY_TIP',
        title: 'Increase study time',
        description: 'Consider adding more study sessions to reach your goals faster.',
        priority: 'medium',
        actionable: false,
      });
    }

    if (studyDays < 5) {
      suggestions.push({
        id: `sugg-${suggestionId++}`,
        type: 'STUDY_TIP',
        title: 'Be more consistent',
        description: `You studied ${studyDays} day${studyDays !== 1 ? 's' : ''} this week. Aim for daily study sessions.`,
        priority: 'medium',
        actionable: false,
      });
    }

    // Try to get AI-powered suggestions
    try {
      const prompt = `As a study coach, provide 2 personalized study tips for a student with:
- ${context.pendingTasksCount} pending tasks
- ${context.urgentTasks} urgent tasks
- Average ${avgMinutesPerDay} minutes of study per day
- ${context.activePlansCount} active study plans

Return as JSON array with objects having: title (short), description (one sentence), priority (high/medium/low).
Keep tips specific and actionable.`;

      const aiResponse = await callGemini(prompt);
      const jsonMatch = aiResponse.match(/\[[\s\S]*?\]/);
      
      if (jsonMatch) {
        const aiSuggestions = JSON.parse(jsonMatch[0]);
        aiSuggestions.forEach((s: { title: string; description: string; priority: string }) => {
          suggestions.push({
            id: `sugg-${suggestionId++}`,
            type: 'STUDY_TIP',
            title: s.title,
            description: s.description,
            priority: (s.priority as 'high' | 'medium' | 'low') || 'medium',
            actionable: false,
          });
        });
      }
    } catch (e) {
      // AI suggestions are optional - continue with data-driven ones
      console.log('AI suggestions unavailable:', e);
    }

    // Always ensure we have some suggestions
    if (suggestions.length < 3) {
      const defaultSuggestions: Suggestion[] = [
        {
          id: `sugg-${suggestionId++}`,
          type: 'BREAK',
          title: 'Take regular breaks',
          description: 'Use the Pomodoro technique: 25 minutes of focus, then a 5-minute break.',
          priority: 'low',
          actionable: false,
        },
        {
          id: `sugg-${suggestionId++}`,
          type: 'REVIEW',
          title: 'Review before new material',
          description: 'Spend 10 minutes reviewing previous topics before starting new ones.',
          priority: 'low',
          actionable: false,
        },
      ];
      
      suggestions.push(...defaultSuggestions.slice(0, 3 - suggestions.length));
    }

    return NextResponse.json({
      success: true,
      data: {
        suggestions: suggestions.slice(0, 5),
        context: {
          pendingTasks: context.pendingTasksCount,
          avgStudyMinutes: avgMinutesPerDay,
          studyDaysThisWeek: studyDays,
          activePlans: context.activePlansCount,
        },
        generatedAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error('Get suggestions error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
