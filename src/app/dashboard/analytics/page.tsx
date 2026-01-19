"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  Target,
  Flame,
  Award,
  Calendar,
  Brain,
  Loader2,
} from "lucide-react";
import { analyticsApi } from "@/lib/api";

interface AnalyticsData {
  overview: {
    totalStudyHours: number;
    totalStudyMinutes: number;
    totalPomodoros: number;
    completedTasks: number;
    totalTasks: number;
    taskCompletionRate: number;
    avgMinutesPerDay: number;
    avgPomodorosPerDay: number;
    focusRate: number;
  };
  trends: {
    studyTime: number;
    pomodoros: number;
  };
  streak: {
    currentStreak: number;
    longestStreak: number;
    totalStudyDays: number;
  };
  timeline: {
    date: string;
    studyMinutes: number;
    pomodoros: number;
    tasksCompleted: number;
  }[];
  distribution: {
    byHour: { hour: number; minutes: number }[];
    byDayOfWeek: { day: string; dayIndex: number; minutes: number }[];
    byPlan: { planId: string; title?: string; minutes: number; sessions: number; hours: number }[];
  };
  insights: {
    mostProductiveHours: string[];
    mostProductiveDay: string;
    avgSessionLength: number;
  };
  achievements: {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    unlockedAt: string;
  }[];
  plans: {
    id: string;
    title: string;
    color: string;
    progress: number;
    status: string;
    totalTasks: number;
    totalSessions: number;
  }[];
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("week");

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const result = await analyticsApi.get({ period });
        if (result.success && result.data) {
          setAnalytics(result.data as AnalyticsData);
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const maxDayMinutes = analytics?.distribution.byDayOfWeek
    ? Math.max(...analytics.distribution.byDayOfWeek.map(d => d.minutes), 1)
    : 1;

  const maxHourMinutes = analytics?.distribution.byHour
    ? Math.max(...analytics.distribution.byHour.map(h => h.minutes), 1)
    : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Analytics
          </h1>
          <p className="text-muted-foreground">
            Track your study progress and productivity
          </p>
        </div>
        <Tabs value={period} onValueChange={setPeriod} className="w-auto">
          <TabsList>
            <TabsTrigger value="day">Today</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Clock className="h-4 w-4 text-blue-500" />
                </div>
                {analytics?.trends.studyTime !== undefined && analytics.trends.studyTime !== 0 && (
                  <Badge variant="secondary" className={
                    analytics.trends.studyTime > 0
                      ? "text-green-600 bg-green-100 dark:bg-green-900/30"
                      : "text-red-600 bg-red-100 dark:bg-red-900/30"
                  }>
                    {analytics.trends.studyTime > 0 ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {analytics.trends.studyTime > 0 ? "+" : ""}{analytics.trends.studyTime}%
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold">{analytics?.overview.totalStudyHours.toFixed(1)}h</p>
              <p className="text-sm text-muted-foreground">Study Time</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Brain className="h-4 w-4 text-purple-500" />
                </div>
                {analytics?.trends.pomodoros !== undefined && analytics.trends.pomodoros !== 0 && (
                  <Badge variant="secondary" className={
                    analytics.trends.pomodoros > 0
                      ? "text-green-600 bg-green-100 dark:bg-green-900/30"
                      : "text-red-600 bg-red-100 dark:bg-red-900/30"
                  }>
                    {analytics.trends.pomodoros > 0 ? "+" : ""}{analytics.trends.pomodoros}%
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold">{analytics?.overview.totalPomodoros}</p>
              <p className="text-sm text-muted-foreground">Pomodoros</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </div>
                <Badge variant="secondary">{analytics?.overview.taskCompletionRate}%</Badge>
              </div>
              <p className="text-2xl font-bold">{analytics?.overview.completedTasks}/{analytics?.overview.totalTasks}</p>
              <p className="text-sm text-muted-foreground">Tasks Done</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Flame className="h-4 w-4 text-orange-500" />
                </div>
              </div>
              <p className="text-2xl font-bold">{analytics?.streak.currentStreak}</p>
              <p className="text-sm text-muted-foreground">Day Streak</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Weekly Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between h-48 gap-2">
                {analytics?.distribution.byDayOfWeek.map((day) => (
                  <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
                    <div 
                      className="w-full bg-primary/20 rounded-t-lg transition-all hover:bg-primary/30"
                      style={{ 
                        height: `${Math.max(8, (day.minutes / maxDayMinutes) * 160)}px`,
                      }}
                    >
                      <div 
                        className="w-full bg-primary rounded-t-lg h-full"
                        style={{ 
                          opacity: day.minutes > 0 ? 1 : 0.3,
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{day.day.slice(0, 3)}</span>
                    <span className="text-xs font-medium">
                      {day.minutes >= 60 ? `${Math.round(day.minutes / 60)}h` : `${day.minutes}m`}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="border-border/50 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Most Productive Day</p>
                <p className="text-lg font-semibold">{analytics?.insights.mostProductiveDay || "No data"}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Best Hours</p>
                <p className="text-lg font-semibold">
                  {analytics?.insights.mostProductiveHours?.join(", ") || "No data"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Avg Session Length</p>
                <p className="text-lg font-semibold">{analytics?.insights.avgSessionLength || 0} min</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Focus Rate</p>
                <p className="text-lg font-semibold">{analytics?.overview.focusRate || 0}%</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Study Plans Progress */}
      {analytics?.plans && analytics.plans.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Study Plans Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.plans.map((plan) => (
                  <div key={plan.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className={`w-3 h-3 rounded-full bg-gradient-to-br ${plan.color || "from-blue-500 to-cyan-500"}`} 
                        />
                        <span className="font-medium">{plan.title}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{plan.totalTasks} tasks</span>
                        <span>{plan.totalSessions} sessions</span>
                        <span className="font-semibold text-foreground">{plan.progress}%</span>
                      </div>
                    </div>
                    <Progress value={plan.progress} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Streak & Achievements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                Study Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-lg bg-orange-500/10">
                  <p className="text-3xl font-bold text-orange-500">{analytics?.streak.currentStreak || 0}</p>
                  <p className="text-sm text-muted-foreground">Current</p>
                </div>
                <div className="p-4 rounded-lg bg-purple-500/10">
                  <p className="text-3xl font-bold text-purple-500">{analytics?.streak.longestStreak || 0}</p>
                  <p className="text-sm text-muted-foreground">Longest</p>
                </div>
                <div className="p-4 rounded-lg bg-blue-500/10">
                  <p className="text-3xl font-bold text-blue-500">{analytics?.streak.totalStudyDays || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Recent Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.achievements && analytics.achievements.length > 0 ? (
                <div className="space-y-3">
                  {analytics.achievements.slice(0, 4).map((achievement) => (
                    <div key={achievement.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <span className="text-2xl">{achievement.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{achievement.name}</p>
                        <p className="text-xs text-muted-foreground">{achievement.description}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {new Date(achievement.unlockedAt).toLocaleDateString()}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No achievements yet</p>
                  <p className="text-sm">Keep studying to unlock achievements!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Hourly Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Study Time by Hour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between h-32 gap-1">
              {Array.from({ length: 24 }, (_, i) => {
                const hourData = analytics?.distribution.byHour.find(h => h.hour === i);
                const minutes = hourData?.minutes || 0;
                return (
                  <div 
                    key={i} 
                    className="flex-1 flex flex-col items-center gap-1"
                    title={`${i}:00 - ${minutes} minutes`}
                  >
                    <div 
                      className="w-full bg-primary rounded-sm transition-all hover:opacity-80"
                      style={{ 
                        height: `${Math.max(2, (minutes / maxHourMinutes) * 100)}px`,
                        opacity: minutes > 0 ? 1 : 0.2,
                      }}
                    />
                    {i % 4 === 0 && (
                      <span className="text-[10px] text-muted-foreground">{i}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>12 AM</span>
              <span>6 AM</span>
              <span>12 PM</span>
              <span>6 PM</span>
              <span>11 PM</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
