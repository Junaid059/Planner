"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FolderKanban,
  MoreHorizontal,
  Calendar,
  CheckCircle2,
  Plus,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { plansApi } from "@/lib/api";

interface StudyPlan {
  id: string;
  title: string;
  subject: string;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  endDate: string | null;
  color: string;
  status: string;
}

const colorGradients: Record<string, string> = {
  blue: "from-blue-500 to-cyan-500",
  purple: "from-purple-500 to-pink-500",
  orange: "from-orange-500 to-red-500",
  green: "from-green-500 to-emerald-500",
  pink: "from-pink-500 to-rose-500",
  default: "from-violet-500 to-purple-500",
};

export function StudyPlans() {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await plansApi.list({ status: 'ACTIVE', limit: 5 });
        
        if (response.success && response.data) {
          const plansData = response.data as StudyPlan[];
          setPlans(plansData);
        }
      } catch (error) {
        console.error('Failed to fetch plans:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No deadline';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getGradient = (color: string) => {
    return colorGradients[color?.toLowerCase()] || colorGradients.default;
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 flex items-center justify-center h-[350px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold">Study Plans</CardTitle>
            <Badge variant="secondary" className="font-normal">
              {plans.length} Active
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/plans">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
            <Link href="/dashboard/plans">
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                New Plan
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px]">
          {plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <FolderKanban className="h-12 w-12 mb-2 opacity-50" />
              <p>No active study plans</p>
              <Link href="/dashboard/plans">
                <Button variant="link" className="mt-2">
                  Create your first plan
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="group p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg bg-gradient-to-br ${getGradient(plan.color)}`}
                      >
                        <FolderKanban className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">{plan.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {plan.subject || 'General'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{plan.progress || 0}%</span>
                      </div>
                      <Progress value={plan.progress || 0} className="h-2" />
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>
                          {plan.completedTasks || 0}/{plan.totalTasks || 0} tasks
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formatDate(plan.endDate)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
