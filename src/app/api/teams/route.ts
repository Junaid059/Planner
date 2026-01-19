// Teams API Routes
import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS, toObjectId } from '@/lib/db/mongodb';
import { User, Team, TeamMember, TeamInvite, DEFAULT_TEAM_SETTINGS, PLAN_LIMITS } from '@/lib/db/models';
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

// Generate team slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    + '-' + Math.random().toString(36).substring(2, 8);
}

// GET /api/teams - Get user's teams
export async function GET(request: NextRequest) {
  try {
    const userCheck = await verifyUser(request);
    if ('error' in userCheck) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH001', message: userCheck.error } },
        { status: userCheck.status }
      );
    }

    const { user, db } = userCheck;

    // Get teams where user is a member
    const memberships = await db
      .collection<TeamMember>(COLLECTIONS.TEAM_MEMBERS)
      .find({ userId: user._id! })
      .toArray();

    const teamIds = memberships.map((m) => m.teamId);

    // Get team details
    const teams = await db
      .collection<Team>(COLLECTIONS.TEAMS)
      .find({ _id: { $in: teamIds } })
      .toArray();

    // Get member counts for each team
    const teamsWithMemberCounts = await Promise.all(
      teams.map(async (team) => {
        const memberCount = await db
          .collection<TeamMember>(COLLECTIONS.TEAM_MEMBERS)
          .countDocuments({ teamId: team._id! });

        const membership = memberships.find((m) => m.teamId.equals(team._id!));

        return {
          id: team._id?.toString(),
          name: team.name,
          slug: team.slug,
          description: team.description,
          avatar: team.avatar,
          plan: team.plan,
          maxMembers: team.maxMembers,
          memberCount,
          myRole: membership?.role,
          isOwner: team.ownerId.equals(user._id!),
          createdAt: team.createdAt,
        };
      })
    );

    // Get pending invites for the user
    const pendingInvites = await db
      .collection<TeamInvite>(COLLECTIONS.TEAM_INVITES)
      .aggregate([
        { 
          $match: { 
            email: user.email, 
            status: 'PENDING',
            expiresAt: { $gt: new Date() }
          } 
        },
        {
          $lookup: {
            from: COLLECTIONS.TEAMS,
            localField: 'teamId',
            foreignField: '_id',
            as: 'team',
          },
        },
        { $unwind: '$team' },
      ])
      .toArray();

    return NextResponse.json({
      success: true,
      data: {
        teams: teamsWithMemberCounts,
        pendingInvites: pendingInvites.map((invite) => ({
          id: invite._id?.toString(),
          teamId: invite.teamId.toString(),
          teamName: (invite as unknown as { team: Team }).team.name,
          role: invite.role,
          expiresAt: invite.expiresAt,
          createdAt: invite.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Get teams error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// POST /api/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    const userCheck = await verifyUser(request);
    if ('error' in userCheck) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH001', message: userCheck.error } },
        { status: userCheck.status }
      );
    }

    const { user, db } = userCheck;

    // Check if user has TEAM plan
    if (user.plan !== 'TEAM') {
      return NextResponse.json(
        { success: false, error: { code: 'PLAN001', message: 'Team plan required to create teams' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || name.length < 2) {
      return NextResponse.json(
        { success: false, error: { code: 'VAL001', message: 'Team name must be at least 2 characters' } },
        { status: 400 }
      );
    }

    // Check how many teams user owns
    const ownedTeamsCount = await db
      .collection<Team>(COLLECTIONS.TEAMS)
      .countDocuments({ ownerId: user._id! });

    if (ownedTeamsCount >= 5) {
      return NextResponse.json(
        { success: false, error: { code: 'LIMIT001', message: 'Maximum 5 teams allowed per user' } },
        { status: 400 }
      );
    }

    const now = new Date();
    const slug = generateSlug(name);

    // Create team
    const teamResult = await db.collection<Team>(COLLECTIONS.TEAMS).insertOne({
      name,
      slug,
      description,
      ownerId: user._id!,
      plan: 'TEAM',
      maxMembers: PLAN_LIMITS.TEAM.maxTeamMembers,
      settings: DEFAULT_TEAM_SETTINGS,
      createdAt: now,
      updatedAt: now,
    });

    // Add owner as a member
    await db.collection<TeamMember>(COLLECTIONS.TEAM_MEMBERS).insertOne({
      teamId: teamResult.insertedId,
      userId: user._id!,
      role: 'OWNER',
      joinedAt: now,
      invitedBy: user._id!,
    });

    // Log activity
    await db.collection(COLLECTIONS.ACTIVITY_LOGS).insertOne({
      userId: user._id!,
      teamId: teamResult.insertedId,
      action: 'team_created',
      entityType: 'team',
      entityId: teamResult.insertedId,
      details: { name, slug },
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: teamResult.insertedId.toString(),
        name,
        slug,
        description,
        message: 'Team created successfully',
      },
    });
  } catch (error) {
    console.error('Create team error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SRV001', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
