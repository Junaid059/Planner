// Teams API - Individual Team Management
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

// Check if user is team member with specified role
async function verifyTeamAccess(
  db: Awaited<ReturnType<typeof getDb>>,
  teamId: string,
  userId: string,
  requiredRoles?: ('OWNER' | 'ADMIN' | 'MEMBER')[]
) {
  const membership = await db
    .collection<TeamMember>(COLLECTIONS.TEAM_MEMBERS)
    .findOne({ teamId: toObjectId(teamId), userId: toObjectId(userId) });

  if (!membership) {
    return { error: 'Not a team member', status: 403 };
  }

  if (requiredRoles && !requiredRoles.includes(membership.role)) {
    return { error: 'Insufficient permissions', status: 403 };
  }

  return { membership };
}

// GET /api/teams/[id] - Get team details
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
    const accessCheck = await verifyTeamAccess(db, id, user._id!.toString());
    if ('error' in accessCheck) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH002', message: accessCheck.error } },
        { status: accessCheck.status }
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

    // Get members with user info
    const members = await db
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
      ])
      .toArray();

    // Get team stats
    const [totalPlans, totalTasks, totalSessions] = await Promise.all([
      db.collection(COLLECTIONS.STUDY_PLANS).countDocuments({ 
        userId: { $in: members.map((m) => m.userId) }
      }),
      db.collection(COLLECTIONS.TASKS).countDocuments({ 
        userId: { $in: members.map((m) => m.userId) }
      }),
      db.collection(COLLECTIONS.POMODORO_SESSIONS).countDocuments({ 
        userId: { $in: members.map((m) => m.userId) }
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        team: {
          id: team._id?.toString(),
          name: team.name,
          slug: team.slug,
          description: team.description,
          avatar: team.avatar,
          plan: team.plan,
          maxMembers: team.maxMembers,
          settings: team.settings,
          isOwner: team.ownerId.equals(user._id!),
          myRole: accessCheck.membership.role,
          createdAt: team.createdAt,
        },
        members: members.map((m) => ({
          id: m._id?.toString(),
          memberId: m.userId.toString(),
          name: (m as unknown as { user: User }).user.name,
          email: (m as unknown as { user: User }).user.email,
          avatar: (m as unknown as { user: User }).user.avatar,
          role: m.role,
          joinedAt: m.joinedAt,
        })),
        stats: {
          totalMembers: members.length,
          totalPlans,
          totalTasks,
          totalSessions,
        },
      },
    });
  } catch (error) {
    console.error('Get team error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// PATCH /api/teams/[id] - Update team
export async function PATCH(
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

    // Check admin/owner access
    const accessCheck = await verifyTeamAccess(db, id, user._id!.toString(), ['OWNER', 'ADMIN']);
    if ('error' in accessCheck) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH002', message: accessCheck.error } },
        { status: accessCheck.status }
      );
    }

    const body = await request.json();
    const { name, description, avatar, settings } = body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (settings) updateData.settings = settings;

    await db.collection(COLLECTIONS.TEAMS).updateOne(
      { _id: toObjectId(id) },
      { $set: updateData }
    );

    return NextResponse.json({
      success: true,
      data: { message: 'Team updated successfully' },
    });
  } catch (error) {
    console.error('Update team error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/[id] - Delete team (owner only)
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
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL001', message: 'Invalid team ID' } },
        { status: 400 }
      );
    }

    const { user, db } = userCheck;
    const teamId = toObjectId(id);

    // Check owner access only
    const accessCheck = await verifyTeamAccess(db, id, user._id!.toString(), ['OWNER']);
    if ('error' in accessCheck) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH002', message: accessCheck.error } },
        { status: accessCheck.status }
      );
    }

    // Delete team and all related data
    await Promise.all([
      db.collection(COLLECTIONS.TEAMS).deleteOne({ _id: teamId }),
      db.collection(COLLECTIONS.TEAM_MEMBERS).deleteMany({ teamId }),
      db.collection(COLLECTIONS.TEAM_INVITES).deleteMany({ teamId }),
    ]);

    // Log activity
    await db.collection(COLLECTIONS.ACTIVITY_LOGS).insertOne({
      userId: user._id!,
      action: 'team_deleted',
      entityType: 'team',
      entityId: teamId,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Team deleted successfully' },
    });
  } catch (error) {
    console.error('Delete team error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
