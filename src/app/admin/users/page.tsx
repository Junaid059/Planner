"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Crown,
  Shield,
  Loader2,
  ChevronLeft,
  ChevronRight,
  UserX,
  UserCheck,
  Filter,
  Key,
  CreditCard,
  Copy,
  Check,
} from "lucide-react";
import { adminApi } from "@/lib/api";

interface UserData {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  plan: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  stats: {
    tasks: number;
    plans: number;
    sessions: number;
    studyMinutes: number;
  };
}

interface UserDetailData {
  user: UserData;
  stats: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    taskCompletionRate: number;
    totalPlans: number;
    activePlans: number;
    totalSessions: number;
    completedSessions: number;
    totalStudyMinutes: number;
    totalStudyHours: number;
  };
  streak: {
    currentStreak: number;
    longestStreak: number;
    lastStudyDate?: string;
  } | null;
  recentActivity: {
    tasks: Array<{
      id: string;
      title: string;
      status: string;
      priority: string;
      dueDate?: string;
      createdAt: string;
    }>;
    plans: Array<{
      id: string;
      title: string;
      subject: string;
      status: string;
      progress: number;
      createdAt: string;
    }>;
  };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Dialog states
  const [viewUser, setViewUser] = useState<UserDetailData | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [editUser, setEditUser] = useState<UserData | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Password reset states
  const [resetPasswordUser, setResetPasswordUser] = useState<UserData | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [passwordCopied, setPasswordCopied] = useState(false);
  
  // Grant subscription states
  const [grantSubUser, setGrantSubUser] = useState<UserData | null>(null);
  const [grantPlan, setGrantPlan] = useState<string>("PRO");
  const [grantDuration, setGrantDuration] = useState(1);
  const [grantReason, setGrantReason] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const result = await adminApi.getUsers({
        page,
        limit: 15,
        search: search || undefined,
        plan: filterPlan || undefined,
        role: filterRole || undefined,
      });
      if (result.success) {
        setUsers(result.data as UserData[]);
        if (result.pagination) {
          const pag = result.pagination as { total: number; totalPages: number };
          setTotal(pag.total);
          setTotalPages(pag.totalPages);
        }
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterPlan, filterRole]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleViewUser = async (userId: string) => {
    setViewLoading(true);
    try {
      const result = await adminApi.getUser(userId);
      if (result.success && result.data) {
        setViewUser(result.data as UserDetailData);
      }
    } catch (error) {
      console.error("Failed to fetch user details:", error);
    } finally {
      setViewLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editUser) return;
    setActionLoading(true);
    try {
      const result = await adminApi.updateUser(editUser.id, {
        role: editUser.role,
        plan: editUser.plan,
        isActive: editUser.isActive,
        name: editUser.name,
      });
      if (result.success) {
        setEditUser(null);
        fetchUsers();
      }
    } catch (error) {
      console.error("Failed to update user:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    setActionLoading(true);
    try {
      const result = await adminApi.deleteUser(deleteUser.id);
      if (result.success) {
        setDeleteUser(null);
        fetchUsers();
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleResetPassword = async (generateRandom: boolean) => {
    if (!resetPasswordUser) return;
    if (!generateRandom && (!newPassword || newPassword.length < 8)) {
      alert("Password must be at least 8 characters");
      return;
    }
    
    setActionLoading(true);
    try {
      const result = await adminApi.resetUserPassword(resetPasswordUser.id, {
        newPassword: generateRandom ? undefined : newPassword,
        generateRandom,
      });
      if (result.success && result.data) {
        if (result.data.temporaryPassword) {
          setGeneratedPassword(result.data.temporaryPassword);
        } else {
          setResetPasswordUser(null);
          setNewPassword("");
          alert("Password reset successfully!");
        }
      }
    } catch (error) {
      console.error("Failed to reset password:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGrantSubscription = async () => {
    if (!grantSubUser) return;
    
    setActionLoading(true);
    try {
      const result = await adminApi.grantSubscription({
        userId: grantSubUser.id,
        plan: grantPlan,
        durationMonths: grantDuration,
        reason: grantReason,
      });
      if (result.success) {
        setGrantSubUser(null);
        setGrantPlan("PRO");
        setGrantDuration(1);
        setGrantReason("");
        fetchUsers();
        alert("Subscription granted successfully!");
      }
    } catch (error) {
      console.error("Failed to grant subscription:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setPasswordCopied(true);
    setTimeout(() => setPasswordCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-red-500" />
            User Management
          </h1>
          <p className="text-muted-foreground">
            Manage and monitor all users on the platform ({total} total)
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Plan: {filterPlan || "All"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => { setFilterPlan(""); setPage(1); }}>
                  All Plans
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setFilterPlan("FREE"); setPage(1); }}>
                  FREE
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setFilterPlan("PRO"); setPage(1); }}>
                  PRO
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setFilterPlan("TEAM"); setPage(1); }}>
                  TEAM
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Shield className="h-4 w-4" />
                  Role: {filterRole || "All"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => { setFilterRole(""); setPage(1); }}>
                  All Roles
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setFilterRole("USER"); setPage(1); }}>
                  USER
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setFilterRole("ADMIN"); setPage(1); }}>
                  ADMIN
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">User</th>
                    <th className="text-left p-4 font-medium">Plan</th>
                    <th className="text-left p-4 font-medium">Role</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Activity</th>
                    <th className="text-left p-4 font-medium">Joined</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {user.name?.charAt(0).toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={user.plan === "PRO" ? "default" : "secondary"}
                          className={user.plan === "PRO" ? "bg-amber-500" : ""}
                        >
                          {user.plan === "PRO" && <Crown className="h-3 w-3 mr-1" />}
                          {user.plan}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant={user.role === "ADMIN" ? "destructive" : "outline"}>
                          {user.role === "ADMIN" && <Shield className="h-3 w-3 mr-1" />}
                          {user.role || "USER"}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={user.isActive !== false ? "default" : "secondary"}
                          className={user.isActive !== false ? "bg-green-500" : "bg-gray-500"}
                        >
                          {user.isActive !== false ? (
                            <>
                              <UserCheck className="h-3 w-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <UserX className="h-3 w-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          <p>{user.stats?.tasks || 0} tasks</p>
                          <p className="text-muted-foreground">
                            {Math.round((user.stats?.studyMinutes || 0) / 60)}h studied
                          </p>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleViewUser(user.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditUser(user)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setResetPasswordUser(user)}>
                              <Key className="h-4 w-4 mr-2" />
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setGrantSubUser(user)}>
                              <CreditCard className="h-4 w-4 mr-2" />
                              Grant Subscription
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteUser(user)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View User Dialog */}
      <Dialog open={!!viewUser || viewLoading} onOpenChange={() => setViewUser(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {viewLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : viewUser ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary text-lg">
                      {viewUser.user.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p>{viewUser.user.name}</p>
                    <p className="text-sm font-normal text-muted-foreground">
                      {viewUser.user.email}
                    </p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* User Info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Plan</p>
                    <p className="font-semibold">{viewUser.user.plan}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Role</p>
                    <p className="font-semibold">{viewUser.user.role || "USER"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-semibold">
                      {viewUser.user.isActive !== false ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Joined</p>
                    <p className="font-semibold">
                      {new Date(viewUser.user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div>
                        <p className="text-2xl font-bold">{viewUser.stats.totalTasks}</p>
                        <p className="text-sm text-muted-foreground">Total Tasks</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-500">
                          {viewUser.stats.taskCompletionRate}%
                        </p>
                        <p className="text-sm text-muted-foreground">Completion Rate</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{viewUser.stats.totalPlans}</p>
                        <p className="text-sm text-muted-foreground">Study Plans</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{viewUser.stats.totalSessions}</p>
                        <p className="text-sm text-muted-foreground">Focus Sessions</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{viewUser.stats.totalStudyHours}h</p>
                        <p className="text-sm text-muted-foreground">Total Study Time</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{viewUser.streak?.currentStreak || 0}</p>
                        <p className="text-sm text-muted-foreground">Current Streak</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Tasks */}
                {viewUser.recentActivity.tasks.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Recent Tasks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {viewUser.recentActivity.tasks.slice(0, 5).map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                          >
                            <span className="text-sm font-medium truncate">{task.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {task.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and permissions</DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={editUser.name}
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Plan</label>
                <div className="flex gap-2">
                  {["FREE", "PRO", "TEAM"].map((plan) => (
                    <Button
                      key={plan}
                      variant={editUser.plan === plan ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEditUser({ ...editUser, plan })}
                    >
                      {plan}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <div className="flex gap-2">
                  {["USER", "ADMIN"].map((role) => (
                    <Button
                      key={role}
                      variant={editUser.role === role ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEditUser({ ...editUser, role })}
                    >
                      {role === "ADMIN" && <Shield className="h-3 w-3 mr-1" />}
                      {role}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <div className="flex gap-2">
                  <Button
                    variant={editUser.isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditUser({ ...editUser, isActive: true })}
                    className={editUser.isActive ? "bg-green-500" : ""}
                  >
                    <UserCheck className="h-3 w-3 mr-1" />
                    Active
                  </Button>
                  <Button
                    variant={!editUser.isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditUser({ ...editUser, isActive: false })}
                    className={!editUser.isActive ? "bg-gray-500" : ""}
                  >
                    <UserX className="h-3 w-3 mr-1" />
                    Inactive
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser} disabled={actionLoading}>
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone and will
              remove all associated data including tasks, plans, and study sessions.
            </DialogDescription>
          </DialogHeader>
          {deleteUser && (
            <div className="py-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-destructive/10 text-destructive">
                    {deleteUser.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{deleteUser.name}</p>
                  <p className="text-sm text-muted-foreground">{deleteUser.email}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={actionLoading}>
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPasswordUser} onOpenChange={() => {
        setResetPasswordUser(null);
        setNewPassword("");
        setGeneratedPassword("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Reset password for {resetPasswordUser?.name} ({resetPasswordUser?.email})
            </DialogDescription>
          </DialogHeader>
          
          {generatedPassword ? (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400 mb-2">
                  Password generated successfully! Share this with the user:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-background rounded border font-mono text-sm">
                    {generatedPassword}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(generatedPassword)}
                  >
                    {passwordCopied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                The user will need to log in with this password. All existing sessions have been invalidated.
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Set New Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 characters)"
                />
              </div>
              <div className="text-center text-sm text-muted-foreground">or</div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleResetPassword(true)}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Key className="h-4 w-4 mr-2" />
                )}
                Generate Random Password
              </Button>
            </div>
          )}
          
          <DialogFooter>
            {generatedPassword ? (
              <Button onClick={() => {
                setResetPasswordUser(null);
                setNewPassword("");
                setGeneratedPassword("");
              }}>
                Done
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => {
                  setResetPasswordUser(null);
                  setNewPassword("");
                }}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleResetPassword(false)} 
                  disabled={actionLoading || !newPassword || newPassword.length < 8}
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Set Password
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grant Subscription Dialog */}
      <Dialog open={!!grantSubUser} onOpenChange={() => setGrantSubUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Grant Subscription
            </DialogTitle>
            <DialogDescription>
              Grant a subscription to {grantSubUser?.name} ({grantSubUser?.email})
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Plan</label>
              <div className="flex gap-2">
                {["PRO", "TEAM"].map((plan) => (
                  <Button
                    key={plan}
                    variant={grantPlan === plan ? "default" : "outline"}
                    size="sm"
                    onClick={() => setGrantPlan(plan)}
                    className={grantPlan === plan && plan === "PRO" ? "bg-amber-500" : ""}
                  >
                    {plan === "PRO" && <Crown className="h-3 w-3 mr-1" />}
                    {plan}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Duration (months)</label>
              <div className="flex gap-2">
                {[1, 3, 6, 12].map((months) => (
                  <Button
                    key={months}
                    variant={grantDuration === months ? "default" : "outline"}
                    size="sm"
                    onClick={() => setGrantDuration(months)}
                  >
                    {months}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason (optional)</label>
              <Input
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
                placeholder="e.g., Beta tester, Contest winner, etc."
              />
            </div>
            
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p>This will:</p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                <li>Set user&apos;s plan to {grantPlan}</li>
                <li>Create a {grantDuration}-month subscription</li>
                <li>Not charge the user</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantSubUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleGrantSubscription} disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Grant Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
