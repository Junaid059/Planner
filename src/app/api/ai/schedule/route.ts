// AI Scheduling API - Smart study schedule generation with Gemini
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId, isValidObjectId } from '@/lib/db/mongodb';
import { Task, StudyPlan, User } from '@/lib/db/models';
import { verifyToken } from '@/lib/auth/jwt';

interface TimeSlot {
  startTime: string;
  endTime: string;
  duration: number;
  taskId?: string;
  planId?: string;
  type: 'STUDY' | 'BREAK' | 'REVIEW';
  priority: number;
  subject?: string;
}

interface DaySchedule {
  date: string;
  dayName: string;
  slots: TimeSlot[];
  totalStudyMinutes: number;
  breakMinutes: number;
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
          maxOutputTokens: 2048,
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

// Helper to format time
function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Helper to parse time
function parseTime(timeStr: string): number {
  const [hours, mins] = timeStr.split(':').map(Number);
  return hours * 60 + mins;
}

// POST /api/ai/schedule - Generate AI-optimized schedule
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
      startDate,
      endDate,
      dailyStudyHours = 4,
      preferredStartTime = '09:00',
      preferredEndTime = '21:00',
      breakBetweenSessions = 10,
      focusSessionLength = 25,
      includeWeekends = true,
      planIds,
    } = body;

    // Validate dates
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (end <= start) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL003', message: 'End date must be after start date' } },
        { status: 400 }
      );
    }

    const db = await getDb();
    const userId = toObjectId(payload.userId);

    // Get user's tasks and study plans
    const tasksCollection = db.collection<Task>(COLLECTIONS.TASKS);
    const plansCollection = db.collection<StudyPlan>(COLLECTIONS.STUDY_PLANS);
    const usersCollection = db.collection<User>(COLLECTIONS.USERS);

    const taskFilter: Record<string, unknown> = {
      userId,
      status: { $in: ['TODO', 'IN_PROGRESS'] },
    };

    if (planIds && planIds.length > 0) {
      taskFilter.planId = { $in: planIds.filter(isValidObjectId).map(toObjectId) };
    }

    const planFilter: Record<string, unknown> = {
      userId,
      status: 'ACTIVE',
    };

    if (planIds && planIds.length > 0) {
      planFilter._id = { $in: planIds.filter(isValidObjectId).map(toObjectId) };
    }

    const [tasks, plans, user] = await Promise.all([
      tasksCollection.find(taskFilter).sort({ priority: -1, dueDate: 1 }).toArray(),
      plansCollection.find(planFilter).toArray(),
      usersCollection.findOne({ _id: userId }),
    ]);

    // Build schedule
    const schedule: DaySchedule[] = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayMillis = 24 * 60 * 60 * 1000;
    
    // Get time boundaries
    const startMinutes = parseTime(preferredStartTime);
    const endMinutes = parseTime(preferredEndTime);
    const dailyMinutes = dailyStudyHours * 60;
    
    let taskIndex = 0;
    
    for (let currentDate = new Date(start); currentDate < end; currentDate.setDate(currentDate.getDate() + 1)) {
      const dayOfWeek = currentDate.getDay();
      
      // Skip weekends if not included
      if (!includeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
        continue;
      }

      const slots: TimeSlot[] = [];
      let currentTime = startMinutes;
      let scheduledMinutes = 0;
      
      // Schedule study sessions for the day
      while (scheduledMinutes < dailyMinutes && currentTime < endMinutes - focusSessionLength) {
        const task = tasks[taskIndex % Math.max(tasks.length, 1)];
        
        slots.push({
          startTime: formatTime(currentTime),
          endTime: formatTime(currentTime + focusSessionLength),
          duration: focusSessionLength,
          taskId: task?._id?.toString(),
          planId: task?.planId?.toString(),
          type: 'STUDY',
          priority: task?.priority === 'HIGH' || task?.priority === 'URGENT' ? 1 : 2,
          subject: task?.subject,
        });
        
        scheduledMinutes += focusSessionLength;
        currentTime += focusSessionLength;
        
        // Add break if not done yet
        if (scheduledMinutes < dailyMinutes && currentTime < endMinutes - breakBetweenSessions) {
          slots.push({
            startTime: formatTime(currentTime),
            endTime: formatTime(currentTime + breakBetweenSessions),
            duration: breakBetweenSessions,
            type: 'BREAK',
            priority: 0,
          });
          currentTime += breakBetweenSessions;
        }
        
        taskIndex++;
      }

      schedule.push({
        date: currentDate.toISOString().split('T')[0],
        dayName: dayNames[dayOfWeek],
        slots,
        totalStudyMinutes: scheduledMinutes,
        breakMinutes: slots.filter(s => s.type === 'BREAK').reduce((sum, s) => sum + s.duration, 0),
      });
    }

    // Generate AI tips if we have Gemini API key
    let aiTips: string[] = [];
    try {
      const prompt = `Based on a student with ${tasks.length} pending tasks and ${plans.length} active study plans, 
provide 3 brief study tips to maximize productivity. Keep each tip under 100 characters.
Format as JSON array of strings.`;
      
      const aiResponse = await callGemini(prompt);
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        aiTips = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // AI tips are optional
      aiTips = [
        "Break tasks into smaller chunks for better focus",
        "Take short breaks to maintain concentration",
        "Review completed material before starting new topics"
      ];
    }

    return NextResponse.json({
      success: true,
      data: {
        schedule,
        summary: {
          totalDays: schedule.length,
          totalStudyHours: Math.round(schedule.reduce((sum, d) => sum + d.totalStudyMinutes, 0) / 60 * 10) / 10,
          totalSessions: schedule.reduce((sum, d) => sum + d.slots.filter(s => s.type === 'STUDY').length, 0),
          tasksIncluded: Math.min(tasks.length, taskIndex),
        },
        tips: aiTips,
        preferences: {
          dailyStudyHours,
          preferredStartTime,
          preferredEndTime,
          focusSessionLength,
          breakBetweenSessions,
          includeWeekends,
        },
      },
    });
  } catch (error) {
    console.error('Generate schedule error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
