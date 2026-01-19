"use client";

import { motion } from "framer-motion";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { TodaysTasks } from "@/components/dashboard/todays-tasks";
import { StudyProgress } from "@/components/dashboard/study-progress";
import { UpcomingSchedule } from "@/components/dashboard/upcoming-schedule";
import { QuickTimer } from "@/components/dashboard/quick-timer";
import { StudyPlans } from "@/components/dashboard/study-plans";
import { useAuth } from "@/components/providers/auth-provider";

export default function DashboardPage() {
  const { user } = useAuth();
  const displayName = user?.name || user?.email?.split('@')[0] || 'there';

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold">Welcome back, {displayName}!</h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your studies today.
        </p>
      </motion.div>

      {/* Stats Overview */}
      <StatsCards />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Tasks */}
        <div className="lg:col-span-2 space-y-6">
          <TodaysTasks />
          <StudyPlans />
        </div>

        {/* Right Column - Progress & Timer */}
        <div className="space-y-6">
          <QuickTimer />
          <UpcomingSchedule />
          <StudyProgress />
        </div>
      </div>
    </div>
  );
}
