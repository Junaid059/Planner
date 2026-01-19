// Teams API - Invites Management
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId, isValidObjectId } from '@/lib/db/mongodb';
import { User, Team, TeamMember, TeamInvite, PLAN_LIMITS } from '@/lib/db/models';
import { verifyToken } from '@/lib/auth/jwt';
import crypto from 'crypto';

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

// POST /api/teams/[id]/invites - Create invite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userCheck = await verifyUser(request);
    if ('error' in userCheck) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH001', message: userCheck.error } },
        { status: userCheck.status }
      );
    }

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL001', message: 'Invalid team ID' } },
        { status: 400 }
      );
    }

    const { user, db } = userCheck;
    const teamId = toObjectId(id);

    // Check if user is team admin/owner
    const membership = await db
      .collection<TeamMember>(COLLECTIONS.TEAM_MEMBERS)
      .findOne({ teamId, userId: user._id! });

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH002', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    // Get team
    const team = await db.collection<Team>(COLLECTIONS.TEAMS).findOne({ _id: teamId });
    if (!team) {
      return NextResponse.json(
        { success: false, error: { code: 'RES001', message: 'Team not found' } },
        { status: 404 }
      );
    }

    // Check member limit
    const memberCount = await db
      .collection<TeamMember>(COLLECTIONS.TEAM_MEMBERS)
      .countDocuments({ teamId });

    if (memberCount >= team.maxMembers) {
      return NextResponse.json(
        { success: false, error: { code: 'LIMIT001', message: 'Team member limit reached' } },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { email, role = 'MEMBER' } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL002', message: 'Valid email required' } },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const existingMember = await db
      .collection<TeamMember>(COLLECTIONS.TEAM_MEMBERS)
      .aggregate([
        { $match: { teamId } },
        {
          $lookup: {
            from: COLLECTIONS.USERS,
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        { $match: { 'user.email': email.toLowerCase() } },
      ])
      .toArray();

    if (existingMember.length > 0) {
      return NextResponse.json(
        { success: false, error: { code: 'DUP001', message: 'User is already a team member' } },
        { status: 400 }
      );
    }

    // Check if invite already exists
    const existingInvite = await db
      .collection<TeamInvite>(COLLECTIONS.TEAM_INVITES)
      .findOne({ teamId, email: email.toLowerCase(), status: 'PENDING' });

    if (existingInvite) {
      return NextResponse.json(
        { success: false, error: { code: 'DUP002', message: 'Invite already sent to this email' } },
        { status: 400 }
      );
    }

    // Create invite
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const inviteResult = await db.collection<TeamInvite>(COLLECTIONS.TEAM_INVITES).insertOne({
      teamId,
      email: email.toLowerCase(),
      role: role as TeamInvite['role'],
      status: 'PENDING',
      token,
      invitedBy: user._id!,
      expiresAt,
      createdAt: now,
    });

    // Log activity
    await db.collection(COLLECTIONS.ACTIVITY_LOGS).insertOne({
      userId: user._id!,
      teamId,
      action: 'team_invite_sent',
      entityType: 'team_invite',
      entityId: inviteResult.insertedId,
      details: { email, role },
      createdAt: now,
    });

    // In a real app, you'd send an email here
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/teams/invite/${token}`;

    return NextResponse.json({
      success: true,
      data: {
        id: inviteResult.insertedId.toString(),
        inviteLink,
        message: 'Invite sent successfully',
      },
    });
  } catch (error) {
    console.error('Create invite error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// GET /api/teams/[id]/invites - Get pending invites
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userCheck = await verifyUser(request);
    if ('error' in userCheck) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH001', message: userCheck.error } },
        { status: userCheck.status }
      );
    }

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL001', message: 'Invalid team ID' } },
        { status: 400 }
      );
    }

    const { user, db } = userCheck;
    const teamId = toObjectId(id);

    // Check membership
    const membership = await db
      .collection<TeamMember>(COLLECTIONS.TEAM_MEMBERS)
      .findOne({ teamId, userId: user._id! });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH002', message: 'Not a team member' } },
        { status: 403 }
      );
    }

    // Get invites with inviter info
    const invites = await db
      .collection<TeamInvite>(COLLECTIONS.TEAM_INVITES)
      .aggregate([
        { $match: { teamId, status: 'PENDING' } },
        {
          $lookup: {
            from: COLLECTIONS.USERS,
            localField: 'invitedBy',
            foreignField: '_id',
            as: 'inviter',
          },
        },
        { $unwind: { path: '$inviter', preserveNullAndEmptyArrays: true } },
        { $sort: { createdAt: -1 } },
      ])
      .toArray();

    return NextResponse.json({
      success: true,
      data: invites.map((invite) => ({
        id: invite._id?.toString(),
        email: invite.email,
        role: invite.role,
        status: invite.status,
        invitedBy: {
          id: invite.invitedBy.toString(),
          name: (invite as unknown as { inviter?: User }).inviter?.name || 'Unknown',
        },
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get invites error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/[id]/invites - Cancel invite
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userCheck = await verifyUser(request);
    if ('error' in userCheck) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH001', message: userCheck.error } },
        { status: userCheck.status }
      );
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const inviteId = searchParams.get('inviteId');

    if (!isValidObjectId(id) || !inviteId || !isValidObjectId(inviteId)) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL001', message: 'Invalid ID' } },
        { status: 400 }
      );
    }

    const { user, db } = userCheck;
    const teamId = toObjectId(id);

    // Check admin/owner access
    const membership = await db
      .collection<TeamMember>(COLLECTIONS.TEAM_MEMBERS)
      .findOne({ teamId, userId: user._id! });

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH002', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    // Delete invite
    await db.collection<TeamInvite>(COLLECTIONS.TEAM_INVITES).deleteOne({
      _id: toObjectId(inviteId),
      teamId,
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Invite canceled' },
    });
  } catch (error) {
    console.error('Cancel invite error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
