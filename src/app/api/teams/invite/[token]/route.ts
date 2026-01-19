// Teams API - Accept/Decline Invite
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId } from '@/lib/db/mongodb';
import { User, Team, TeamMember, TeamInvite } from '@/lib/db/models';
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

// GET /api/teams/invite/[token] - Get invite details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const db = await getDb();

    // Find invite
    const invite = await db
      .collection<TeamInvite>(COLLECTIONS.TEAM_INVITES)
      .findOne({ token, status: 'PENDING' });

    if (!invite) {
      return NextResponse.json(
        { success: false, error: { code: 'RES001', message: 'Invite not found or expired' } },
        { status: 404 }
      );
    }

    // Check if expired
    if (invite.expiresAt < new Date()) {
      await db.collection<TeamInvite>(COLLECTIONS.TEAM_INVITES).updateOne(
        { _id: invite._id },
        { $set: { status: 'EXPIRED' } }
      );
      return NextResponse.json(
        { success: false, error: { code: 'RES002', message: 'Invite has expired' } },
        { status: 400 }
      );
    }

    // Get team
    const team = await db.collection<Team>(COLLECTIONS.TEAMS).findOne({ _id: invite.teamId });
    if (!team) {
      return NextResponse.json(
        { success: false, error: { code: 'RES003', message: 'Team not found' } },
        { status: 404 }
      );
    }

    // Get inviter
    const inviter = await db.collection<User>(COLLECTIONS.USERS).findOne({ _id: invite.invitedBy });

    return NextResponse.json({
      success: true,
      data: {
        id: invite._id?.toString(),
        email: invite.email,
        role: invite.role,
        team: {
          id: team._id?.toString(),
          name: team.name,
          description: team.description,
          avatar: team.avatar,
        },
        invitedBy: {
          name: inviter?.name || 'Unknown',
        },
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error) {
    console.error('Get invite error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// POST /api/teams/invite/[token] - Accept invite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const userCheck = await verifyUser(request);
    if ('error' in userCheck) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH001', message: userCheck.error } },
        { status: userCheck.status }
      );
    }

    const { token } = await params;
    const { user, db } = userCheck;

    // Find invite
    const invite = await db
      .collection<TeamInvite>(COLLECTIONS.TEAM_INVITES)
      .findOne({ token, status: 'PENDING' });

    if (!invite) {
      return NextResponse.json(
        { success: false, error: { code: 'RES001', message: 'Invite not found or already used' } },
        { status: 404 }
      );
    }

    // Verify email matches
    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH002', message: 'Invite email does not match your account' } },
        { status: 403 }
      );
    }

    // Check if expired
    if (invite.expiresAt < new Date()) {
      await db.collection<TeamInvite>(COLLECTIONS.TEAM_INVITES).updateOne(
        { _id: invite._id },
        { $set: { status: 'EXPIRED' } }
      );
      return NextResponse.json(
        { success: false, error: { code: 'RES002', message: 'Invite has expired' } },
        { status: 400 }
      );
    }

    // Check if already a member
    const existingMember = await db
      .collection<TeamMember>(COLLECTIONS.TEAM_MEMBERS)
      .findOne({ teamId: invite.teamId, userId: user._id! });

    if (existingMember) {
      return NextResponse.json(
        { success: false, error: { code: 'DUP001', message: 'Already a team member' } },
        { status: 400 }
      );
    }

    // Get team
    const team = await db.collection<Team>(COLLECTIONS.TEAMS).findOne({ _id: invite.teamId });
    if (!team) {
      return NextResponse.json(
        { success: false, error: { code: 'RES003', message: 'Team not found' } },
        { status: 404 }
      );
    }

    // Check member limit
    const memberCount = await db
      .collection<TeamMember>(COLLECTIONS.TEAM_MEMBERS)
      .countDocuments({ teamId: invite.teamId });

    if (memberCount >= team.maxMembers) {
      return NextResponse.json(
        { success: false, error: { code: 'LIMIT001', message: 'Team member limit reached' } },
        { status: 400 }
      );
    }

    const now = new Date();

    // Add member
    await db.collection<TeamMember>(COLLECTIONS.TEAM_MEMBERS).insertOne({
      teamId: invite.teamId,
      userId: user._id!,
      role: invite.role,
      joinedAt: now,
      invitedBy: invite.invitedBy,
    });

    // Update invite status
    await db.collection<TeamInvite>(COLLECTIONS.TEAM_INVITES).updateOne(
      { _id: invite._id },
      { $set: { status: 'ACCEPTED', acceptedAt: now } }
    );

    // Log activity
    await db.collection(COLLECTIONS.ACTIVITY_LOGS).insertOne({
      userId: user._id!,
      teamId: invite.teamId,
      action: 'team_joined',
      entityType: 'team',
      entityId: invite.teamId,
      details: { role: invite.role },
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      data: {
        teamId: invite.teamId.toString(),
        teamName: team.name,
        role: invite.role,
        message: 'Successfully joined the team',
      },
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/invite/[token] - Decline invite
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const userCheck = await verifyUser(request);
    if ('error' in userCheck) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH001', message: userCheck.error } },
        { status: userCheck.status }
      );
    }

    const { token } = await params;
    const { user, db } = userCheck;

    // Find and update invite
    const result = await db.collection<TeamInvite>(COLLECTIONS.TEAM_INVITES).updateOne(
      { token, email: user.email.toLowerCase(), status: 'PENDING' },
      { $set: { status: 'DECLINED' } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'RES001', message: 'Invite not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Invite declined' },
    });
  } catch (error) {
    console.error('Decline invite error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
