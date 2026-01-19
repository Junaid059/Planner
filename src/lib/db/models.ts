import { ObjectId } from "mongodb";

// Enums
export type Plan = "FREE" | "PRO" | "TEAM";
export type Theme = "LIGHT" | "DARK" | "SYSTEM";
export type PlanStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED" | "PAUSED";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type SessionType = "WORK" | "SHORT_BREAK" | "LONG_BREAK";
export type UserRole = "USER" | "ADMIN";
export type SubscriptionStatus = "ACTIVE" | "CANCELED" | "PAST_DUE" | "TRIALING" | "INCOMPLETE" | "EXPIRED";
export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
export type TeamRole = "OWNER" | "ADMIN" | "MEMBER";
export type InviteStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";

// User Model
export interface User {
  _id?: ObjectId;
  email: string;
  password: string;
  name: string;
  avatar?: string;
  role: UserRole;
  plan: Plan;
  theme: Theme;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
  emailVerified: boolean;
  emailVerifiedAt?: Date;
  preferences?: UserPreferences;
}

// User Preferences
export interface UserPreferences {
  dailyGoalHours: number;
  preferredStudyTime: string;
  breakReminders: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  weeklyReportEmail: boolean;
}

// Study Plan Model
export interface StudyPlan {
  _id?: ObjectId;
  userId: ObjectId;
  title: string;
  description?: string;
  subject: string;
  targetDate?: Date;
  hoursPerWeek: number;
  status: PlanStatus;
  progress: number;
  color?: string;
  goals?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Task Model
export interface Task {
  _id?: ObjectId;
  userId: ObjectId;
  planId?: ObjectId;
  title: string;
  description?: string;
  subject?: string;
  priority: Priority;
  status: TaskStatus;
  dueDate?: Date;
  estimatedMinutes?: number;
  actualMinutes?: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  subtasks?: Subtask[];
}

// Subtask Model
export interface Subtask {
  _id?: ObjectId;
  taskId: ObjectId;
  title: string;
  completed: boolean;
  createdAt: Date;
}

// Pomodoro Session Model
export interface PomodoroSession {
  _id?: ObjectId;
  userId: ObjectId;
  taskId?: ObjectId;
  planId?: ObjectId;
  type: SessionType;
  duration: number;
  actualDuration?: number;
  startedAt: Date;
  completedAt?: Date;
  completed: boolean;
  interrupted?: boolean;
  notes?: string;
}

// Timer Settings Model
export interface TimerSettings {
  _id?: ObjectId;
  userId: ObjectId;
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
  autoStartBreaks: boolean;
  autoStartWork: boolean;
  soundEnabled: boolean;
  volume: number;
}

// Daily Stats Model
export interface DailyStats {
  _id?: ObjectId;
  userId: ObjectId;
  date: Date;
  totalMinutes: number;
  sessionsCompleted: number;
  focusSessions?: number;
  tasksCompleted: number;
  focusScore: number;
}

// Study Streak Model
export interface StudyStreak {
  _id?: ObjectId;
  userId: ObjectId;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate?: Date;
  streakStartDate?: Date;
  totalStudyDays?: number;
}

// Achievement Model
export interface Achievement {
  _id?: ObjectId;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement: number;
}

// User Achievement Model
export interface UserAchievement {
  _id?: ObjectId;
  userId: ObjectId;
  achievementId: ObjectId;
  unlockedAt: Date;
  progress: number;
}

// Refresh Token Model
export interface RefreshToken {
  _id?: ObjectId;
  userId: ObjectId;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

// Subscription Model
export interface Subscription {
  _id?: ObjectId;
  userId: ObjectId;
  plan: Plan;
  status: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Payment Model
export interface Payment {
  _id?: ObjectId;
  userId: ObjectId;
  subscriptionId?: ObjectId;
  stripePaymentIntentId?: string;
  stripeInvoiceId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Team Model
export interface Team {
  _id?: ObjectId;
  name: string;
  slug: string;
  description?: string;
  ownerId: ObjectId;
  plan: Plan;
  maxMembers: number;
  avatar?: string;
  subscriptionId?: ObjectId;
  settings?: TeamSettings;
  createdAt: Date;
  updatedAt: Date;
}

// Team Settings
export interface TeamSettings {
  allowMemberInvites: boolean;
  defaultMemberRole: TeamRole;
  sharedPlansEnabled: boolean;
  sharedTasksEnabled: boolean;
  sharedNotesEnabled: boolean;
}

// Team Member Model
export interface TeamMember {
  _id?: ObjectId;
  teamId: ObjectId;
  userId: ObjectId;
  role: TeamRole;
  joinedAt: Date;
  invitedBy: ObjectId;
}

// Team Invite Model
export interface TeamInvite {
  _id?: ObjectId;
  teamId: ObjectId;
  email: string;
  role: TeamRole;
  status: InviteStatus;
  token: string;
  invitedBy: ObjectId;
  expiresAt: Date;
  createdAt: Date;
  acceptedAt?: Date;
}

// Plan Limits - defines what each plan can do
export interface PlanLimits {
  maxStudyPlans: number;
  maxTasksPerPlan: number;
  maxTotalTasks: number;
  maxFlashcardDecks: number;
  maxCardsPerDeck: number;
  maxNotes: number;
  maxTeamMembers: number;
  aiSuggestionsPerDay: number;
  aiScheduleGenerationsPerMonth: number;
  customThemes: boolean;
  advancedAnalytics: boolean;
  prioritySupport: boolean;
  exportData: boolean;
  apiAccess: boolean;
  teamCollaboration: boolean;
}

// Plan Pricing
export interface PlanPricing {
  plan: Plan;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  features: string[];
  limits: PlanLimits;
  popular?: boolean;
}

// Activity Log Model
export interface ActivityLog {
  _id?: ObjectId;
  userId: ObjectId;
  teamId?: ObjectId;
  action: string;
  entityType: string;
  entityId?: ObjectId;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// Default values
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  dailyGoalHours: 4,
  preferredStudyTime: "morning",
  breakReminders: true,
  soundEnabled: true,
  notificationsEnabled: true,
  weeklyReportEmail: false,
};

export const DEFAULT_TIMER_SETTINGS: Omit<TimerSettings, "_id" | "userId"> = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: false,
  autoStartWork: false,
  soundEnabled: true,
  volume: 80,
};

// Plan Limits Configuration
export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    maxStudyPlans: 3,
    maxTasksPerPlan: 10,
    maxTotalTasks: 30,
    maxFlashcardDecks: 2,
    maxCardsPerDeck: 20,
    maxNotes: 10,
    maxTeamMembers: 0,
    aiSuggestionsPerDay: 3,
    aiScheduleGenerationsPerMonth: 1,
    customThemes: false,
    advancedAnalytics: false,
    prioritySupport: false,
    exportData: false,
    apiAccess: false,
    teamCollaboration: false,
  },
  PRO: {
    maxStudyPlans: 50,
    maxTasksPerPlan: 100,
    maxTotalTasks: 500,
    maxFlashcardDecks: 50,
    maxCardsPerDeck: 200,
    maxNotes: 500,
    maxTeamMembers: 0,
    aiSuggestionsPerDay: 50,
    aiScheduleGenerationsPerMonth: 20,
    customThemes: true,
    advancedAnalytics: true,
    prioritySupport: true,
    exportData: true,
    apiAccess: true,
    teamCollaboration: false,
  },
  TEAM: {
    maxStudyPlans: -1, // unlimited
    maxTasksPerPlan: -1,
    maxTotalTasks: -1,
    maxFlashcardDecks: -1,
    maxCardsPerDeck: -1,
    maxNotes: -1,
    maxTeamMembers: 50,
    aiSuggestionsPerDay: -1,
    aiScheduleGenerationsPerMonth: -1,
    customThemes: true,
    advancedAnalytics: true,
    prioritySupport: true,
    exportData: true,
    apiAccess: true,
    teamCollaboration: true,
  },
};

// Plan Pricing Configuration
export const PLAN_PRICING: PlanPricing[] = [
  {
    plan: "FREE",
    name: "Free",
    description: "Perfect for getting started",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "Up to 3 study plans",
      "30 tasks total",
      "2 flashcard decks",
      "Basic analytics",
      "3 AI suggestions/day",
      "Community support",
    ],
    limits: PLAN_LIMITS.FREE,
  },
  {
    plan: "PRO",
    name: "Pro",
    description: "For serious students",
    monthlyPrice: 9.99,
    yearlyPrice: 99.99,
    features: [
      "50 study plans",
      "500 tasks total",
      "50 flashcard decks",
      "Advanced analytics",
      "50 AI suggestions/day",
      "Export your data",
      "Custom themes",
      "Priority support",
      "API access",
    ],
    limits: PLAN_LIMITS.PRO,
    popular: true,
  },
  {
    plan: "TEAM",
    name: "Team",
    description: "For study groups & teams",
    monthlyPrice: 19.99,
    yearlyPrice: 199.99,
    features: [
      "Everything in Pro",
      "Unlimited everything",
      "Up to 50 team members",
      "Team collaboration",
      "Shared study plans",
      "Shared tasks & notes",
      "Team analytics",
      "Admin controls",
      "Dedicated support",
    ],
    limits: PLAN_LIMITS.TEAM,
  },
];

// Default Team Settings
export const DEFAULT_TEAM_SETTINGS: TeamSettings = {
  allowMemberInvites: false,
  defaultMemberRole: "MEMBER",
  sharedPlansEnabled: true,
  sharedTasksEnabled: true,
  sharedNotesEnabled: true,
};
