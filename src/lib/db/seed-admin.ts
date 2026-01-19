// Seed default admin user
import { getDb, COLLECTIONS } from './mongodb';
import { User, DEFAULT_USER_PREFERENCES } from './models';
import { hashPassword } from '../auth/jwt';

const DEFAULT_ADMIN = {
  email: 'admin@gmail.com',
  password: 'admin123',
  name: 'Admin',
};

export async function seedAdmin() {
  try {
    const db = await getDb();
    const usersCollection = db.collection<User>(COLLECTIONS.USERS);

    // Check if admin already exists
    const existingAdmin = await usersCollection.findOne({ 
      email: DEFAULT_ADMIN.email.toLowerCase() 
    });

    if (existingAdmin) {
      console.log('✓ Admin user already exists');
      return;
    }

    // Hash password using the same method as auth system
    const hashedPassword = await hashPassword(DEFAULT_ADMIN.password);

    // Create admin user
    const now = new Date();
    const adminUser: User = {
      email: DEFAULT_ADMIN.email.toLowerCase(),
      name: DEFAULT_ADMIN.name,
      password: hashedPassword,
      role: 'ADMIN',
      plan: 'PRO',
      theme: 'SYSTEM',
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: now,
      createdAt: now,
      updatedAt: now,
      preferences: DEFAULT_USER_PREFERENCES,
    };

    const result = await usersCollection.insertOne(adminUser);
    
    // Initialize study streak for admin
    const streaksCollection = db.collection(COLLECTIONS.STUDY_STREAKS);
    await streaksCollection.insertOne({
      userId: result.insertedId,
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: null,
      streakStartDate: null,
    });

    // Initialize timer settings for admin
    const timerCollection = db.collection(COLLECTIONS.TIMER_SETTINGS);
    await timerCollection.insertOne({
      userId: result.insertedId,
      workDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      sessionsUntilLongBreak: 4,
      autoStartBreaks: false,
      autoStartWork: false,
      soundEnabled: true,
      volume: 80,
    });

    console.log('✓ Default admin user created successfully');
    console.log('  Email: admin@gmail.com');
    console.log('  Password: admin123');
  } catch (error) {
    console.error('Failed to seed admin user:', error);
  }
}
