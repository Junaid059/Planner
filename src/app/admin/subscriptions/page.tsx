"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CreditCard,
  Crown,
  Users,
  DollarSign,
  TrendingUp,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { adminApi } from "@/lib/api";

interface SubscriptionData {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  plan: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
  createdAt: string;
}

interface SubscriptionStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  canceledSubscriptions: number;
  proSubscriptions: number;
  teamSubscriptions: number;
  totalRevenue: number;
  totalPayments: number;
  monthlyRevenue: number;
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPlan, setFilterPlan] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const result = await adminApi.getSubscriptions({
        page,
        limit: 15,
        status: filterStatus || undefined,
        plan: filterPlan || undefined,
      });
      if (result.success && result.data) {
        const data = result.data as {
          subscriptions: SubscriptionData[];
          stats: SubscriptionStats;
          pagination: { total: number; totalPages: number };
        };
        setSubscriptions(data.subscriptions);
        setStats(data.stats);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch subscriptions:", error);
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterPlan]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "TRIALING":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "PAST_DUE":
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case "CANCELED":
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-500";
      case "TRIALING":
        return "bg-blue-500";
      case "PAST_DUE":
        return "bg-amber-500";
      case "CANCELED":
        return "bg-gray-500";
      default:
        return "";
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-red-500" />
          Subscriptions
        </h1>
        <p className="text-muted-foreground">
          Manage user subscriptions and view revenue metrics
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Revenue
                    </p>
                    <p className="text-3xl font-bold mt-1">
                      ${stats.totalRevenue.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {stats.totalPayments} payments
                    </p>
                  </div>
                  <div className="bg-green-500/10 p-3 rounded-xl">
                    <DollarSign className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Monthly Revenue
                    </p>
                    <p className="text-3xl font-bold mt-1">
                      ${stats.monthlyRevenue.toLocaleString()}
                    </p>
                    <p className="text-sm text-green-500 mt-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Last 30 days
                    </p>
                  </div>
                  <div className="bg-blue-500/10 p-3 rounded-xl">
                    <TrendingUp className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Active Subscriptions
                    </p>
                    <p className="text-3xl font-bold mt-1">
                      {stats.activeSubscriptions}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      +{stats.trialingSubscriptions} trialing
                    </p>
                  </div>
                  <div className="bg-amber-500/10 p-3 rounded-xl">
                    <Crown className="h-6 w-6 text-amber-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Plan Distribution
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Badge className="bg-amber-500">
                        PRO: {stats.proSubscriptions}
                      </Badge>
                      <Badge className="bg-purple-500">
                        TEAM: {stats.teamSubscriptions}
                      </Badge>
                    </div>
                  </div>
                  <div className="bg-purple-500/10 p-3 rounded-xl">
                    <Users className="h-6 w-6 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Status: {filterStatus || "All"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => { setFilterStatus(""); setPage(1); }}>
                  All Statuses
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setFilterStatus("ACTIVE"); setPage(1); }}>
                  Active
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setFilterStatus("TRIALING"); setPage(1); }}>
                  Trialing
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setFilterStatus("PAST_DUE"); setPage(1); }}>
                  Past Due
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setFilterStatus("CANCELED"); setPage(1); }}>
                  Canceled
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Crown className="h-4 w-4" />
                  Plan: {filterPlan || "All"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => { setFilterPlan(""); setPage(1); }}>
                  All Plans
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setFilterPlan("PRO"); setPage(1); }}>
                  PRO
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setFilterPlan("TEAM"); setPage(1); }}>
                  TEAM
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No subscriptions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">User</th>
                    <th className="text-left p-4 font-medium">Plan</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Period</th>
                    <th className="text-left p-4 font-medium">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {sub.userName?.charAt(0).toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{sub.userName}</p>
                            <p className="text-sm text-muted-foreground">{sub.userEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge
                          className={sub.plan === "PRO" ? "bg-amber-500" : "bg-purple-500"}
                        >
                          {sub.plan === "PRO" && <Crown className="h-3 w-3 mr-1" />}
                          {sub.plan === "TEAM" && <Users className="h-3 w-3 mr-1" />}
                          {sub.plan}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(sub.status)}
                          <Badge
                            variant="secondary"
                            className={getStatusColor(sub.status)}
                          >
                            {sub.status}
                          </Badge>
                          {sub.cancelAtPeriodEnd && (
                            <span className="text-xs text-amber-500">(canceling)</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm">
                        <p>
                          {new Date(sub.currentPeriodStart).toLocaleDateString()} -{" "}
                          {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                        </p>
                        {sub.trialEnd && (
                          <p className="text-muted-foreground text-xs">
                            Trial ends: {new Date(sub.trialEnd).toLocaleDateString()}
                          </p>
                        )}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(sub.createdAt).toLocaleDateString()}
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
    </div>
  );
}
