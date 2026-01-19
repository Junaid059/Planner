// Timer Settings API - Get user's pomodoro preferences
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId } from '@/lib/db/mongodb';
import { TimerSettings, DEFAULT_TIMER_SETTINGS } from '@/lib/db/models';
import { verifyToken } from '@/lib/auth/jwt';

// GET /api/timer/settings - Get timer settings
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
    const settingsCollection = db.collection<TimerSettings>(COLLECTIONS.TIMER_SETTINGS);
    const userId = toObjectId(payload.userId);

    const settings = await settingsCollection.findOne({ userId });

    if (!settings) {
      // Return defaults if no settings found
      return NextResponse.json({
        success: true,
        data: {
          workDuration: DEFAULT_TIMER_SETTINGS.workDuration,
          shortBreakDuration: DEFAULT_TIMER_SETTINGS.shortBreakDuration,
          longBreakDuration: DEFAULT_TIMER_SETTINGS.longBreakDuration,
          sessionsUntilLongBreak: DEFAULT_TIMER_SETTINGS.sessionsUntilLongBreak,
          autoStartBreaks: DEFAULT_TIMER_SETTINGS.autoStartBreaks,
          autoStartWork: DEFAULT_TIMER_SETTINGS.autoStartWork,
          soundEnabled: DEFAULT_TIMER_SETTINGS.soundEnabled,
          volume: DEFAULT_TIMER_SETTINGS.volume,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        workDuration: settings.workDuration,
        shortBreakDuration: settings.shortBreakDuration,
        longBreakDuration: settings.longBreakDuration,
        sessionsUntilLongBreak: settings.sessionsUntilLongBreak,
        autoStartBreaks: settings.autoStartBreaks,
        autoStartWork: settings.autoStartWork,
        soundEnabled: settings.soundEnabled,
        volume: settings.volume,
      },
    });
  } catch (error) {
    console.error('Get timer settings error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// PATCH /api/timer/settings - Update timer settings
export async function PATCH(request: NextRequest) {
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
      workDuration,
      shortBreakDuration,
      longBreakDuration,
      sessionsUntilLongBreak,
      autoStartBreaks,
      autoStartWork,
      soundEnabled,
      volume,
    } = body;

    // Validate durations
    if (workDuration !== undefined && (workDuration < 1 || workDuration > 120)) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL003', message: 'Work duration must be between 1 and 120 minutes' } },
        { status: 400 }
      );
    }

    if (shortBreakDuration !== undefined && (shortBreakDuration < 1 || shortBreakDuration > 30)) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL003', message: 'Short break must be between 1 and 30 minutes' } },
        { status: 400 }
      );
    }

    if (longBreakDuration !== undefined && (longBreakDuration < 1 || longBreakDuration > 60)) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL003', message: 'Long break must be between 1 and 60 minutes' } },
        { status: 400 }
      );
    }

    const db = await getDb();
    const settingsCollection = db.collection<TimerSettings>(COLLECTIONS.TIMER_SETTINGS);
    const userId = toObjectId(payload.userId);

    // Build update object
    const update: Partial<TimerSettings> = {};
    if (workDuration !== undefined) update.workDuration = workDuration;
    if (shortBreakDuration !== undefined) update.shortBreakDuration = shortBreakDuration;
    if (longBreakDuration !== undefined) update.longBreakDuration = longBreakDuration;
    if (sessionsUntilLongBreak !== undefined) update.sessionsUntilLongBreak = sessionsUntilLongBreak;
    if (autoStartBreaks !== undefined) update.autoStartBreaks = autoStartBreaks;
    if (autoStartWork !== undefined) update.autoStartWork = autoStartWork;
    if (soundEnabled !== undefined) update.soundEnabled = soundEnabled;
    if (volume !== undefined) update.volume = volume;

    // Upsert settings
    await settingsCollection.updateOne(
      { userId },
      { $set: update },
      { upsert: true }
    );

    const updatedSettings = await settingsCollection.findOne({ userId });

    return NextResponse.json({
      success: true,
      data: updatedSettings,
    });
  } catch (error) {
    console.error('Update timer settings error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
