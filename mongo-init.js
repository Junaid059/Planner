// MongoDB initialization script
db = db.getSiblingDB('studyflow');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'password', 'name'],
      properties: {
        email: { bsonType: 'string' },
        password: { bsonType: 'string' },
        name: { bsonType: 'string' },
        role: { enum: ['USER', 'ADMIN'] },
        plan: { enum: ['FREE', 'PRO', 'TEAM'] },
        theme: { enum: ['LIGHT', 'DARK', 'SYSTEM'] },
        isActive: { bsonType: 'bool' }
      }
    }
  }
});

db.createCollection('study_plans');
db.createCollection('tasks');
db.createCollection('pomodoro_sessions');
db.createCollection('timer_settings');
db.createCollection('daily_stats');
db.createCollection('study_streaks');
db.createCollection('achievements');
db.createCollection('user_achievements');
db.createCollection('refresh_tokens');

// Create indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.study_plans.createIndex({ userId: 1 });
db.study_plans.createIndex({ userId: 1, status: 1 });
db.tasks.createIndex({ userId: 1 });
db.tasks.createIndex({ userId: 1, status: 1 });
db.tasks.createIndex({ userId: 1, dueDate: 1 });
db.tasks.createIndex({ planId: 1 });
db.pomodoro_sessions.createIndex({ userId: 1 });
db.pomodoro_sessions.createIndex({ userId: 1, startedAt: -1 });
db.pomodoro_sessions.createIndex({ taskId: 1 });
db.timer_settings.createIndex({ userId: 1 }, { unique: true });
db.daily_stats.createIndex({ userId: 1, date: 1 }, { unique: true });
db.study_streaks.createIndex({ userId: 1 }, { unique: true });
db.refresh_tokens.createIndex({ userId: 1 });
db.refresh_tokens.createIndex({ token: 1 });
db.refresh_tokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Create default achievements
db.achievements.insertMany([
  { code: 'FIRST_SESSION', name: 'First Step', description: 'Complete your first study session', icon: 'target', category: 'sessions', requirement: 1 },
  { code: 'TEN_SESSIONS', name: 'Getting Started', description: 'Complete 10 study sessions', icon: 'flame', category: 'sessions', requirement: 10 },
  { code: 'HUNDRED_SESSIONS', name: 'Dedicated Learner', description: 'Complete 100 study sessions', icon: 'award', category: 'sessions', requirement: 100 },
  { code: 'STREAK_7', name: 'Week Warrior', description: 'Maintain a 7-day study streak', icon: 'calendar', category: 'streaks', requirement: 7 },
  { code: 'STREAK_30', name: 'Monthly Master', description: 'Maintain a 30-day study streak', icon: 'trophy', category: 'streaks', requirement: 30 },
  { code: 'FIRST_TASK', name: 'Task Taker', description: 'Complete your first task', icon: 'check', category: 'tasks', requirement: 1 },
  { code: 'TEN_TASKS', name: 'Task Master', description: 'Complete 10 tasks', icon: 'list', category: 'tasks', requirement: 10 },
  { code: 'FIVE_HOURS', name: 'Five Hour Focus', description: 'Study for 5 hours total', icon: 'clock', category: 'time', requirement: 300 },
  { code: 'TWENTY_HOURS', name: 'Twenty Hour Triumph', description: 'Study for 20 hours total', icon: 'timer', category: 'time', requirement: 1200 },
]);

print('StudyFlow database initialized successfully!');
