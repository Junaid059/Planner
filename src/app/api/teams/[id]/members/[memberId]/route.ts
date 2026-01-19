// Teams API - Member Management
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId, isValidObjectId } from '@/lib/db/mongodb';
import { User, Team, TeamMember } from '@/lib/db/models';
import { verifyToken } from '@/lib/auth/jwt';

// Verify user authentication
async function verifyUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return { error: 'Access token required', status: 401 };
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return { error: 'Invalid or expired token', status: 401 };
  }

  const db = await getDb();
  const usersCollection = db.collection<User>(COLLECTIONS.USERS);
  const user = await usersCollection.findOne({ _id: toObjectId(payload.userId) });

  if (!user) {
    return { error: 'User not found', status: 404 };
  }

  return { user, payload, db };
}

// PATCH /api/teams/[id]/members/[memberId] - Update member role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const userCheck = await verifyUser(request);
    if ('error' in userCheck) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH001', message: userCheck.error } },
        { status: userCheck.status }
      );
    }

    const { id, memberId } = await params;
    if (!isValidObjectId(id) || !isValidObjectId(memberId)) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL001', message: 'Invalid ID' } },
        { status: 400 }
      );
    }

    const { user, db } = userCheck;
    const teamId = toObjectId(id);
    const targetUserId = toObjectId(memberId);

    // Check if current user is owner/admin
    const currentMembership = await db
      .collection<TeamMember>(COLLECTIONS.TEAM_MEMBERS)
      .findOne({ teamId, userId: user._id! });

    if (!currentMembership || !['OWNER', 'ADMIN'].includes(currentMembership.role)) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH002', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    // Get target membership
    const targetMembership = await db
      .collection<TeamMember>(COLLECTIONS.TEAM_MEMBERS)
      .findOne({ teamId, userId: targetUserId });

    if (!targetMembership) {
      return NextResponse.json(
        { success: false, error: { code: 'RES001', message: 'Member not found' } },
        { status: 404 }
      );
    }

    // Cannot change owner's role
    if (targetMembership.role === 'OWNER') {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH003', message: 'Cannot change owner role' } },
        { status: 403 }
      );
    }

    // Only owner can promote to admin
    const body = await request.json();
    const { role } = body;

    if (role === 'ADMIN' && currentMembership.role !== 'OWNER') {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH004', message: 'Only owner can promote to admin' } },
        { status: 403 }
      );
    }

    if (!['ADMIN', 'MEMBER'].includes(role)) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL002', message: 'Invalid role' } },
        { status: 400 }
      );
    }

    // Update role
    await db.collection<TeamMember>(COLLECTIONS.TEAM_MEMBERS).updateOne(
      { _id: targetMembership._id },
      { $set: { role } }
    );

    // Log activity
    await db.collection(COLLECTIONS.ACTIVITY_LOGS).insertOne({
      userId: user._id!,
      teamId,
      action: 'member_role_changed',
      entityType: 'team_member',
      entityId: targetUserId,
      details: { newRole: role, previousRole: targetMembership.role },
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Member role updated' },
    });
  } catch (error) {
    console.error('Update member role error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/[id]/members/[memberId] - Remove member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const userCheck = await verifyUser(request);
    if ('error' in userCheck) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH001', message: userCheck.error } },
        { status: userCheck.status }
      );
    }

    const { id, memberId } = await params;
    if (!isValidObjectId(id) || !isValidObjectId(memberId)) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL001', message: 'Invalid ID' } },
        { status: 400 }
      );
    }

    const { user, db } = userCheck;
    const teamId = toObjectId(id);
    const targetUserId = toObjectId(memberId);

    // Check if current user is owner/admin OR removing themselves
    const currentMembership = await db
      .collection<TeamMember>(COLLECTIONS.TEAM_MEMBERS)
      .findOne({ teamId, userId: user._id! });

    if (!currentMembership) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH002', message: 'Not a team member' } },
        { status: 403 }
      );
    }

    const isSelfRemoval = user._id!.equals(targetUserId);
    const isAdminRemoval = ['OWNER', 'ADMIN'].includes(currentMembership.role);

    if (!isSelfRemoval && !isAdminRemoval) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH003', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    // Get target membership
    const targetMembership = await db
      .collection<TeamMember>(COLLECTIONS.TEAM_MEMBERS)
      .findOne({ teamId, userId: targetUserId });

    if (!targetMembership) {
      return NextResponse.json(
        { success: false, error: { code: 'RES001', message: 'Member not found' } },
        { status: 404 }
      );
    }

    // Cannot remove owner
    if (targetMembership.role === 'OWNER') {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH004', message: 'Cannot remove team owner' } },
        { status: 403 }
      );
    }

    // Only owner can remove admins
    if (targetMembership.role === 'ADMIN' && currentMembership.role !== 'OWNER') {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH005', message: 'Only owner can remove admins' } },
        { status: 403 }
      );
    }

    // Remove member
    await db.collection<TeamMember>(COLLECTIONS.TEAM_MEMBERS).deleteOne({
      _id: targetMembership._id,
    });

    // Log activity
    await db.collection(COLLECTIONS.ACTIVITY_LOGS).insertOne({
      userId: user._id!,
      teamId,
      action: isSelfRemoval ? 'member_left' : 'member_removed',
      entityType: 'team_member',
      entityId: targetUserId,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: { message: isSelfRemoval ? 'Left team successfully' : 'Member removed' },
    });
  } catch (error) {
    console.error('Remove member error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
