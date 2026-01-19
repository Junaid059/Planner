// Admin API - Make user admin endpoint
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId, isValidObjectId } from '@/lib/db/mongodb';
import { User } from '@/lib/db/models';
import { verifyToken, hashPassword } from '@/lib/auth/jwt';

// POST /api/admin/make-admin - Create or promote a user to admin
// This is protected - only existing admins can use it, OR it's the first admin setup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, userId, setupKey } = body;

    const db = await getDb();
    const usersCollection = db.collection<User>(COLLECTIONS.USERS);

    // Check if there are any admins
    const adminCount = await usersCollection.countDocuments({ role: 'ADMIN' });

    // If no admins exist and setup key is provided, allow first admin creation
    if (adminCount === 0 && setupKey === process.env.ADMIN_SETUP_KEY) {
      if (email) {
        // Find user by email and make them admin
        const result = await usersCollection.updateOne(
          { email: email.toLowerCase() },
          { $set: { role: 'ADMIN', updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
          return NextResponse.json(
            { success: false, error: { code: 'RES001', message: 'User not found' } },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: { message: `User ${email} has been promoted to admin` },
        });
      } else {
        return NextResponse.json(
          { success: false, error: { code: 'VAL002', message: 'Email is required for initial admin setup' } },
          { status: 400 }
        );
      }
    }

    // If admins exist, require admin authentication
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH003', message: 'Access token required' } },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH002', message: 'Invalid or expired token' } },
        { status: 401 }
      );
    }

    // Verify the requester is an admin
    const requestingUser = await usersCollection.findOne({ _id: toObjectId(payload.userId) });
    if (!requestingUser || requestingUser.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH001', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    // Promote user to admin
    let query: Record<string, unknown> = {};
    if (userId && isValidObjectId(userId)) {
      query = { _id: toObjectId(userId) };
    } else if (email) {
      query = { email: email.toLowerCase() };
    } else {
      return NextResponse.json(
        { success: false, error: { code: 'VAL002', message: 'Either userId or email is required' } },
        { status: 400 }
      );
    }

    const result = await usersCollection.updateOne(
      query,
      { $set: { role: 'ADMIN', updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'RES001', message: 'User not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: 'User has been promoted to admin' },
    });
  } catch (error) {
    console.error('Make admin error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
