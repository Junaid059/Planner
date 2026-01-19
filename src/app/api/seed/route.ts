// API route to initialize/seed the database
import { NextResponse } from 'next/server';
import { seedAdmin } from '@/lib/db/seed-admin';
import { getDb, COLLECTIONS } from '@/lib/db/mongodb';

// Track if seeding has been attempted this session
let seeded = false;

export async function GET() {
  if (seeded) {
    return NextResponse.json({ success: true, message: 'Already initialized' });
  }

  try {
    await seedAdmin();
    seeded = true;
    return NextResponse.json({ 
      success: true, 
      message: 'Database initialized. Default admin: admin@gmail.com / admin123' 
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to initialize database' 
    }, { status: 500 });
  }
}

// POST to reset and recreate admin
export async function POST() {
  try {
    const db = await getDb();
    
    // Delete existing admin
    await db.collection(COLLECTIONS.USERS).deleteOne({ 
      email: 'admin@gmail.com' 
    });
    
    // Reset seeded flag and reseed
    seeded = false;
    await seedAdmin();
    seeded = true;
    
    return NextResponse.json({ 
      success: true, 
      message: 'Admin reset. Login with: admin@gmail.com / admin123' 
    });
  } catch (error) {
    console.error('Reset error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to reset admin' 
    }, { status: 500 });
  }
}
