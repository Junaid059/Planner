"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Plus,
  Loader2,
  Mail,
  MoreVertical,
  Crown,
  Shield,
  User,
  UserMinus,
  X,
  Clock,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { teamsApi } from "@/lib/api";
import Link from "next/link";

interface TeamListItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatar?: string;
  plan: string;
  maxMembers: number;
  memberCount: number;
  myRole: string;
  isOwner: boolean;
  createdAt: string;
}

interface TeamMember {
  id: string;
  memberId: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  joinedAt: string;
}

interface TeamDetails {
  team: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    avatar?: string;
    plan: string;
    maxMembers: number;
    settings: unknown;
    isOwner: boolean;
    myRole: string;
    createdAt: string;
  };
  members: TeamMember[];
  stats: {
    totalMembers: number;
    totalPlans: number;
    totalTasks: number;
    totalSessions: number;
  };
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  invitedBy: { id: string; name: string };
  expiresAt: string;
  createdAt: string;
}

const roleIcons = {
  OWNER: Crown,
  ADMIN: Shield,
  MEMBER: User,
};

const roleBadgeColors = {
  OWNER: "bg-amber-500",
  ADMIN: "bg-blue-500",
  MEMBER: "bg-gray-500",
};

export default function TeamsPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<TeamDetails | null>(null);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [inviting, setInviting] = useState(false);

  const fetchTeams = async () => {
    try {
      const result = await teamsApi.list();
      if (result.success && result.data) {
        setTeams(result.data.teams);
        if (result.data.teams.length > 0 && !selectedTeam) {
          handleSelectTeam(result.data.teams[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch teams:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;

    setCreating(true);
    try {
      const result = await teamsApi.create({ name: newTeamName, description: newTeamDescription });
      if (result.success) {
        setShowCreateDialog(false);
        setNewTeamName("");
        setNewTeamDescription("");
        fetchTeams();
      }
    } catch (error) {
      console.error("Failed to create team:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleSelectTeam = async (teamId: string) => {
    try {
      const [teamResult, invitesResult] = await Promise.all([
        teamsApi.get(teamId),
        teamsApi.getInvites(teamId),
      ]);
      
      if (teamResult.success && teamResult.data) {
        setSelectedTeam(teamResult.data);
      }
      if (invitesResult.success && invitesResult.data) {
        setInvites(Array.isArray(invitesResult.data) ? invitesResult.data : []);
      }
    } catch (error) {
      console.error("Failed to fetch team details:", error);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !selectedTeam) return;

    setInviting(true);
    try {
      const result = await teamsApi.inviteMember(selectedTeam.team.id, { email: inviteEmail, role: inviteRole });
      if (result.success) {
        setShowInviteDialog(false);
        setInviteEmail("");
        handleSelectTeam(selectedTeam.team.id);
      }
    } catch (error) {
      console.error("Failed to invite member:", error);
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedTeam) return;
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const result = await teamsApi.removeMember(selectedTeam.team.id, memberId);
      if (result.success) {
        handleSelectTeam(selectedTeam.team.id);
      }
    } catch (error) {
      console.error("Failed to remove member:", error);
    }
  };

  const handleUpdateRole = async (memberId: string, role: "ADMIN" | "MEMBER") => {
    if (!selectedTeam) return;

    try {
      const result = await teamsApi.updateMemberRole(selectedTeam.team.id, memberId, role);
      if (result.success) {
        handleSelectTeam(selectedTeam.team.id);
      }
    } catch (error) {
      console.error("Failed to update role:", error);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!selectedTeam) return;

    try {
      const result = await teamsApi.cancelInvite(selectedTeam.team.id, inviteId);
      if (result.success) {
        handleSelectTeam(selectedTeam.team.id);
      }
    } catch (error) {
      console.error("Failed to cancel invite:", error);
    }
  };

  const canManageTeam = selectedTeam?.team.isOwner || selectedTeam?.team.myRole === "ADMIN";

  if (user?.plan !== "TEAM") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Teams
          </h1>
          <p className="text-muted-foreground">
            Collaborate with others on your study goals
          </p>
        </div>

        <Card className="text-center py-12">
          <CardContent>
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Team Collaboration</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Team collaboration features are available on the Team plan.
              Upgrade to create teams, invite members, and study together.
            </p>
            <Link href="/pricing">
              <Button>
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Team Plan
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Teams
          </h1>
          <p className="text-muted-foreground">
            Manage your teams and collaborate with others
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Team
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Teams List */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Your Teams</CardTitle>
          </CardHeader>
          <CardContent>
            {teams.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No teams yet</p>
                <Button
                  variant="link"
                  onClick={() => setShowCreateDialog(true)}
                >
                  Create your first team
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedTeam?.team.id === team.id
                        ? "bg-primary/10 border border-primary"
                        : "bg-muted/50 hover:bg-muted"
                    }`}
                    onClick={() => handleSelectTeam(team.id)}
                  >
                    <p className="font-medium">{team.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {team.memberCount} member{team.memberCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Details */}
        <Card className="md:col-span-2">
          {selectedTeam ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedTeam.team.name}</CardTitle>
                    {selectedTeam.team.description && (
                      <CardDescription>{selectedTeam.team.description}</CardDescription>
                    )}
                  </div>
                  {canManageTeam && (
                    <Button onClick={() => setShowInviteDialog(true)}>
                      <Mail className="h-4 w-4 mr-2" />
                      Invite Member
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Members */}
                <div>
                  <h3 className="font-semibold mb-3">
                    Members ({selectedTeam.members.length}/{selectedTeam.team.maxMembers})
                  </h3>
                  <div className="space-y-2">
                    {selectedTeam.members.map((member) => {
                      const role = member.role as keyof typeof roleIcons;
                      const RoleIcon = roleIcons[role] || User;
                      const badgeColor = roleBadgeColors[role] || "bg-gray-500";

                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {member.name?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{member.name || member.email}</p>
                              <p className="text-sm text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`gap-1 ${badgeColor}`}>
                              <RoleIcon className="h-3 w-3" />
                              {member.role}
                            </Badge>
                            {canManageTeam && member.role !== "OWNER" && member.memberId !== user?.id && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  {member.role === "MEMBER" ? (
                                    <DropdownMenuItem onClick={() => handleUpdateRole(member.memberId, "ADMIN")}>
                                      <Shield className="h-4 w-4 mr-2" />
                                      Make Admin
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => handleUpdateRole(member.memberId, "MEMBER")}>
                                      <User className="h-4 w-4 mr-2" />
                                      Remove Admin
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    className="text-red-500"
                                    onClick={() => handleRemoveMember(member.memberId)}
                                  >
                                    <UserMinus className="h-4 w-4 mr-2" />
                                    Remove
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pending Invites */}
                {invites.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Pending Invites</h3>
                    <div className="space-y-2">
                      {invites.filter(i => i.status === "PENDING").map((invite) => (
                        <div
                          key={invite.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-dashed"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-background">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{invite.email}</p>
                              <p className="text-sm text-muted-foreground">
                                Invited as {invite.role}
                              </p>
                            </div>
                          </div>
                          {canManageTeam && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelInvite(invite.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center py-16">
              <div className="text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a team to view details</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Create Team Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a New Team</DialogTitle>
            <DialogDescription>
              Create a team to collaborate with others on study goals.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Team Name</label>
              <Input
                placeholder="e.g., Study Group Alpha"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (Optional)</label>
              <Input
                placeholder="What's this team about?"
                value={newTeamDescription}
                onChange={(e) => setNewTeamDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTeam} disabled={!newTeamName.trim() || creating}>
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Member Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <div className="flex gap-2">
                <Button
                  variant={inviteRole === "MEMBER" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setInviteRole("MEMBER")}
                >
                  <User className="h-4 w-4 mr-2" />
                  Member
                </Button>
                <Button
                  variant={inviteRole === "ADMIN" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setInviteRole("ADMIN")}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Admins can invite and manage other members.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInviteMember} disabled={!inviteEmail.trim() || inviting}>
              {inviting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
