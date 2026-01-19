"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  Target,
  TrendingUp,
  TrendingDown,
  Flame,
  Loader2,
} from "lucide-react";
import { timerApi, analyticsApi } from "@/lib/api";

interface StatsData {
  tasksCompleted: number;
  totalTasks: number;
  studyHours: number;
  studyTrend: number;
  goalsAchieved: number;
  totalGoals: number;
  currentStreak: number;
}

export function StatsCards() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [timerStats, analytics] = await Promise.all([
          timerApi.getStats('week'),
          analyticsApi.get({ period: 'week' }),
        ]);

        if (timerStats.success && analytics.success) {
          const timerData = timerStats.data as {
            today: { tasksCompleted: number };
            summary: { totalHours: number };
            streak: { currentStreak: number };
          };
          const analyticsData = analytics.data as {
            overview: {
              completedTasks: number;
              totalTasks: number;
              totalStudyHours: number;
            };
            trends: { studyTime: number };
            streak: { currentStreak: number };
            plans: { progress: number }[];
          };

          const completedGoals = analyticsData.plans?.filter(p => p.progress >= 100).length || 0;
          
          setStats({
            tasksCompleted: analyticsData.overview?.completedTasks || 0,
            totalTasks: analyticsData.overview?.totalTasks || 0,
            studyHours: analyticsData.overview?.totalStudyHours || 0,
            studyTrend: analyticsData.trends?.studyTime || 0,
            goalsAchieved: completedGoals,
            totalGoals: analyticsData.plans?.length || 0,
            currentStreak: analyticsData.streak?.currentStreak || timerData.streak?.currentStreak || 0,
          });
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-6 flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      title: "Tasks Completed",
      value: stats?.tasksCompleted.toString() || "0",
      total: stats?.totalTasks.toString() || "0",
      progress: stats?.totalTasks ? Math.round((stats.tasksCompleted / stats.totalTasks) * 100) : 0,
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Study Hours",
      value: stats?.studyHours.toFixed(1) || "0",
      suffix: "hrs",
      trend: stats?.studyTrend || 0,
      icon: Clock,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Goals Achieved",
      value: stats?.goalsAchieved.toString() || "0",
      total: stats?.totalGoals.toString() || "0",
      progress: stats?.totalGoals ? Math.round((stats.goalsAchieved / stats.totalGoals) * 100) : 0,
      icon: Target,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Day Streak",
      value: stats?.currentStreak.toString() || "0",
      suffix: "days",
      icon: Flame,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <Card className="border-border/50 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                {stat.trend !== undefined && stat.trend !== 0 && (
                  <Badge 
                    variant="secondary" 
                    className={stat.trend > 0 
                      ? "text-green-600 bg-green-100 dark:bg-green-900/30"
                      : "text-red-600 bg-red-100 dark:bg-red-900/30"
                    }
                  >
                    {stat.trend > 0 ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {stat.trend > 0 ? "+" : ""}{stat.trend}%
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{stat.value}</span>
                  {stat.total && (
                    <span className="text-sm text-muted-foreground">
                      / {stat.total}
                    </span>
                  )}
                  {stat.suffix && (
                    <span className="text-sm text-muted-foreground">
                      {stat.suffix}
                    </span>
                  )}
                </div>
              </div>
              {stat.progress !== undefined && stat.total && (
                <Progress value={stat.progress} className="mt-3 h-2" />
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
