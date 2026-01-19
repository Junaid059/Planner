"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  DollarSign,
  TrendingUp,
  Loader2,
  Crown,
  UserCheck,
  UserPlus,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  CreditCard,
  Calendar,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

interface AdminStats {
  stats: {
    totalUsers: number;
    totalPlans: number;
    totalTasks: number;
    totalSessions: number;
    activeUsersToday: number;
    proUsers: number;
    teamUsers: number;
    freeUsers: number;
    completedTasks: number;
    pendingTasks: number;
    taskCompletionRate: number;
    totalStudyMinutes: number;
    totalStudyHours: number;
    totalRevenue: number;
    monthlyRevenue: number;
    newUsersThisMonth: number;
    newUsersLastMonth: number;
    churnRate: number;
  };
  userGrowth: { _id: string; count: number }[];
  revenueGrowth: { _id: string; amount: number }[];
  planDistribution: { plan: string; count: number }[];
  recentUsers: {
    id: string;
    name: string;
    email: string;
    plan: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    lastLoginAt?: string;
  }[];
  recentPayments: {
    id: string;
    amount: number;
    status: string;
    userName: string;
    createdAt: string;
  }[];
}

const PLAN_COLORS: Record<string, string> = {
  FREE: "#94a3b8",
  PRO: "#8b5cf6",
  TEAM: "#6366f1",
};

export default function AdminDashboard() {
  const [data, setData] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await adminApi.getStats();
        if (result.success && result.data) {
          setData(result.data as AdminStats);
        }
      } catch (error) {
        console.error("Failed to fetch admin stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load admin data</p>
      </div>
    );
  }

  const userGrowthPercent = data.stats.newUsersLastMonth > 0
    ? ((data.stats.newUsersThisMonth - data.stats.newUsersLastMonth) / data.stats.newUsersLastMonth * 100).toFixed(1)
    : "100";

  // Prepare chart data
  const userGrowthData = data.userGrowth.map(item => ({
    date: new Date(item._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    users: item.count,
  }));

  const revenueData = (data.revenueGrowth || []).map(item => ({
    date: new Date(item._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: item.amount,
  }));

  const planData = [
    { name: "Free", value: data.stats.freeUsers || data.stats.totalUsers - data.stats.proUsers - (data.stats.teamUsers || 0), fill: PLAN_COLORS.FREE },
    { name: "Pro", value: data.stats.proUsers, fill: PLAN_COLORS.PRO },
    { name: "Team", value: data.stats.teamUsers || 0, fill: PLAN_COLORS.TEAM },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Overview</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s what&apos;s happening with your platform.
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.stats.totalUsers.toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-1">
              {parseFloat(userGrowthPercent) >= 0 ? (
                <>
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-500">+{userGrowthPercent}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-500">{userGrowthPercent}%</span>
                </>
              )}
              <span className="text-sm text-muted-foreground">from last month</span>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
        </Card>

        {/* Monthly Revenue */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Revenue
            </CardTitle>
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${(data.stats.monthlyRevenue || 0).toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">
                ${(data.stats.totalRevenue || 0).toLocaleString()} total
              </span>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-600" />
        </Card>

        {/* Active Users */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Today
            </CardTitle>
            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.stats.activeUsersToday}</div>
            <div className="flex items-center gap-1 mt-1">
              <Activity className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">
                {data.stats.totalUsers > 0 ? ((data.stats.activeUsersToday / data.stats.totalUsers) * 100).toFixed(1) : 0}% of users
              </span>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-violet-600" />
        </Card>

        {/* Pro Subscribers */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid Subscribers
            </CardTitle>
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Crown className="h-5 w-5 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.stats.proUsers + (data.stats.teamUsers || 0)}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {data.stats.proUsers} Pro
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {data.stats.teamUsers || 0} Team
              </Badge>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-600" />
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-500" />
              User Growth
            </CardTitle>
            <CardDescription>New user registrations over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userGrowthData}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorUsers)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-purple-500" />
              Plan Distribution
            </CardTitle>
            <CardDescription>Users by subscription tier</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {planData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              {planData.map((item) => (
                <div key={item.name} className="text-center">
                  <div className="text-2xl font-bold">{item.value}</div>
                  <div className="text-sm text-muted-foreground">{item.name}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue & Activity Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Revenue Trend
            </CardTitle>
            <CardDescription>Daily revenue over selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(value) => `$${value}`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value) => [`$${value ?? 0}`, "Revenue"]}
                    />
                    <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No revenue data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-500" />
              Platform Stats
            </CardTitle>
            <CardDescription>Key performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Task Completion Rate</span>
                <span className="text-sm font-medium">{data.stats.taskCompletionRate}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                  style={{ width: `${data.stats.taskCompletionRate}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{data.stats.totalTasks.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Tasks</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{data.stats.completedTasks.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{data.stats.totalPlans.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Study Plans</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{Math.round(data.stats.totalStudyHours)}</div>
                <div className="text-sm text-muted-foreground">Study Hours</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Users & Payments */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Users</CardTitle>
              <CardDescription>Latest user registrations</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="/admin/users">View All</a>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentUsers.slice(0, 5).map((user) => (
                <div key={user.id} className="flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <Badge 
                        variant={user.plan === 'PRO' ? 'default' : user.plan === 'TEAM' ? 'default' : 'secondary'}
                        className={`text-xs ${user.plan === 'PRO' ? 'bg-purple-500' : user.plan === 'TEAM' ? 'bg-indigo-500' : ''}`}
                      >
                        {user.plan}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Payments</CardTitle>
              <CardDescription>Latest transactions</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentPayments && data.recentPayments.length > 0 ? (
              <div className="space-y-4">
                {data.recentPayments.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{payment.userName}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-500">
                        +${payment.amount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mb-4 opacity-50" />
                <p>No payments yet</p>
                <p className="text-sm">Payments will appear here once users subscribe</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
