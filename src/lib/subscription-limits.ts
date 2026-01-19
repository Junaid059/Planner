// Subscription Limits Utility - Check and enforce plan limits
import { getDb, COLLECTIONS, toObjectId } from '@/lib/db/mongodb';
import { User, Plan, PLAN_LIMITS, PlanLimits, Subscription } from '@/lib/db/models';

export interface UsageCounts {
  studyPlans: number;
  totalTasks: number;
  flashcardDecks: number;
  notes: number;
  aiSuggestionsToday: number;
  aiScheduleGenerationsThisMonth: number;
}

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  currentUsage: number;
  limit: number;
  upgradeRequired?: boolean;
}

// Get user's current plan limits
export function getPlanLimits(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;
}

// Get user's current usage counts
export async function getUserUsage(userId: string): Promise<UsageCounts> {
  const db = await getDb();
  const userObjectId = toObjectId(userId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    studyPlans,
    totalTasks,
    flashcardDecks,
    notes,
    aiSuggestionsToday,
    aiScheduleGenerationsThisMonth,
  ] = await Promise.all([
    db.collection(COLLECTIONS.STUDY_PLANS).countDocuments({ userId: userObjectId }),
    db.collection(COLLECTIONS.TASKS).countDocuments({ userId: userObjectId }),
    db.collection('flashcard_decks').countDocuments({ userId: userObjectId }),
    db.collection('notes').countDocuments({ userId: userObjectId }),
    db.collection(COLLECTIONS.ACTIVITY_LOGS).countDocuments({
      userId: userObjectId,
      action: 'ai_suggestion',
      createdAt: { $gte: today },
    }),
    db.collection(COLLECTIONS.ACTIVITY_LOGS).countDocuments({
      userId: userObjectId,
      action: 'ai_schedule_generation',
      createdAt: { $gte: firstOfMonth },
    }),
  ]);

  return {
    studyPlans,
    totalTasks,
    flashcardDecks,
    notes,
    aiSuggestionsToday,
    aiScheduleGenerationsThisMonth,
  };
}

// Check if user can create a study plan
export async function canCreateStudyPlan(userId: string, userPlan: Plan): Promise<LimitCheckResult> {
  const limits = getPlanLimits(userPlan);
  const usage = await getUserUsage(userId);

  // -1 means unlimited
  if (limits.maxStudyPlans === -1) {
    return { allowed: true, currentUsage: usage.studyPlans, limit: -1 };
  }

  const allowed = usage.studyPlans < limits.maxStudyPlans;
  return {
    allowed,
    currentUsage: usage.studyPlans,
    limit: limits.maxStudyPlans,
    reason: allowed ? undefined : `Study plan limit reached (${limits.maxStudyPlans}). Upgrade to create more.`,
    upgradeRequired: !allowed,
  };
}

// Check if user can create a task
export async function canCreateTask(userId: string, userPlan: Plan, planId?: string): Promise<LimitCheckResult> {
  const limits = getPlanLimits(userPlan);
  const usage = await getUserUsage(userId);

  // Check total tasks limit
  if (limits.maxTotalTasks !== -1 && usage.totalTasks >= limits.maxTotalTasks) {
    return {
      allowed: false,
      currentUsage: usage.totalTasks,
      limit: limits.maxTotalTasks,
      reason: `Total task limit reached (${limits.maxTotalTasks}). Upgrade to create more.`,
      upgradeRequired: true,
    };
  }

  // Check tasks per plan limit if planId provided
  if (planId && limits.maxTasksPerPlan !== -1) {
    const db = await getDb();
    const tasksInPlan = await db.collection(COLLECTIONS.TASKS).countDocuments({
      userId: toObjectId(userId),
      planId: toObjectId(planId),
    });

    if (tasksInPlan >= limits.maxTasksPerPlan) {
      return {
        allowed: false,
        currentUsage: tasksInPlan,
        limit: limits.maxTasksPerPlan,
        reason: `Tasks per plan limit reached (${limits.maxTasksPerPlan}). Upgrade to add more.`,
        upgradeRequired: true,
      };
    }
  }

  return { allowed: true, currentUsage: usage.totalTasks, limit: limits.maxTotalTasks };
}

// Check if user can create a flashcard deck
export async function canCreateFlashcardDeck(userId: string, userPlan: Plan): Promise<LimitCheckResult> {
  const limits = getPlanLimits(userPlan);
  const usage = await getUserUsage(userId);

  if (limits.maxFlashcardDecks === -1) {
    return { allowed: true, currentUsage: usage.flashcardDecks, limit: -1 };
  }

  const allowed = usage.flashcardDecks < limits.maxFlashcardDecks;
  return {
    allowed,
    currentUsage: usage.flashcardDecks,
    limit: limits.maxFlashcardDecks,
    reason: allowed ? undefined : `Flashcard deck limit reached (${limits.maxFlashcardDecks}). Upgrade to create more.`,
    upgradeRequired: !allowed,
  };
}

// Check if user can add a card to a deck
export async function canAddFlashcard(userId: string, userPlan: Plan, deckId: string): Promise<LimitCheckResult> {
  const limits = getPlanLimits(userPlan);

  if (limits.maxCardsPerDeck === -1) {
    return { allowed: true, currentUsage: 0, limit: -1 };
  }

  const db = await getDb();
  const cardCount = await db.collection('flashcards').countDocuments({
    deckId: toObjectId(deckId),
  });

  const allowed = cardCount < limits.maxCardsPerDeck;
  return {
    allowed,
    currentUsage: cardCount,
    limit: limits.maxCardsPerDeck,
    reason: allowed ? undefined : `Cards per deck limit reached (${limits.maxCardsPerDeck}). Upgrade to add more.`,
    upgradeRequired: !allowed,
  };
}

// Check if user can create a note
export async function canCreateNote(userId: string, userPlan: Plan): Promise<LimitCheckResult> {
  const limits = getPlanLimits(userPlan);
  const usage = await getUserUsage(userId);

  if (limits.maxNotes === -1) {
    return { allowed: true, currentUsage: usage.notes, limit: -1 };
  }

  const allowed = usage.notes < limits.maxNotes;
  return {
    allowed,
    currentUsage: usage.notes,
    limit: limits.maxNotes,
    reason: allowed ? undefined : `Notes limit reached (${limits.maxNotes}). Upgrade to create more.`,
    upgradeRequired: !allowed,
  };
}

// Check if user can use AI suggestions
export async function canUseAiSuggestion(userId: string, userPlan: Plan): Promise<LimitCheckResult> {
  const limits = getPlanLimits(userPlan);
  const usage = await getUserUsage(userId);

  if (limits.aiSuggestionsPerDay === -1) {
    return { allowed: true, currentUsage: usage.aiSuggestionsToday, limit: -1 };
  }

  const allowed = usage.aiSuggestionsToday < limits.aiSuggestionsPerDay;
  return {
    allowed,
    currentUsage: usage.aiSuggestionsToday,
    limit: limits.aiSuggestionsPerDay,
    reason: allowed ? undefined : `Daily AI suggestions limit reached (${limits.aiSuggestionsPerDay}). Try again tomorrow or upgrade.`,
    upgradeRequired: !allowed,
  };
}

// Check if user can generate AI schedule
export async function canGenerateAiSchedule(userId: string, userPlan: Plan): Promise<LimitCheckResult> {
  const limits = getPlanLimits(userPlan);
  const usage = await getUserUsage(userId);

  if (limits.aiScheduleGenerationsPerMonth === -1) {
    return { allowed: true, currentUsage: usage.aiScheduleGenerationsThisMonth, limit: -1 };
  }

  const allowed = usage.aiScheduleGenerationsThisMonth < limits.aiScheduleGenerationsPerMonth;
  return {
    allowed,
    currentUsage: usage.aiScheduleGenerationsThisMonth,
    limit: limits.aiScheduleGenerationsPerMonth,
    reason: allowed ? undefined : `Monthly AI schedule generations limit reached (${limits.aiScheduleGenerationsPerMonth}). Upgrade for more.`,
    upgradeRequired: !allowed,
  };
}

// Check if user can use a feature
export function canUseFeature(userPlan: Plan, feature: keyof PlanLimits): boolean {
  const limits = getPlanLimits(userPlan);
  const value = limits[feature];
  
  // Boolean features
  if (typeof value === 'boolean') {
    return value;
  }
  
  // Numeric features (> 0 or -1 for unlimited)
  return value !== 0;
}

// Get full usage summary for user
export async function getUsageSummary(userId: string, userPlan: Plan) {
  const limits = getPlanLimits(userPlan);
  const usage = await getUserUsage(userId);

  return {
    studyPlans: {
      used: usage.studyPlans,
      limit: limits.maxStudyPlans,
      unlimited: limits.maxStudyPlans === -1,
      percentage: limits.maxStudyPlans === -1 ? 0 : Math.round((usage.studyPlans / limits.maxStudyPlans) * 100),
    },
    tasks: {
      used: usage.totalTasks,
      limit: limits.maxTotalTasks,
      unlimited: limits.maxTotalTasks === -1,
      percentage: limits.maxTotalTasks === -1 ? 0 : Math.round((usage.totalTasks / limits.maxTotalTasks) * 100),
    },
    flashcardDecks: {
      used: usage.flashcardDecks,
      limit: limits.maxFlashcardDecks,
      unlimited: limits.maxFlashcardDecks === -1,
      percentage: limits.maxFlashcardDecks === -1 ? 0 : Math.round((usage.flashcardDecks / limits.maxFlashcardDecks) * 100),
    },
    notes: {
      used: usage.notes,
      limit: limits.maxNotes,
      unlimited: limits.maxNotes === -1,
      percentage: limits.maxNotes === -1 ? 0 : Math.round((usage.notes / limits.maxNotes) * 100),
    },
    aiSuggestions: {
      used: usage.aiSuggestionsToday,
      limit: limits.aiSuggestionsPerDay,
      unlimited: limits.aiSuggestionsPerDay === -1,
      percentage: limits.aiSuggestionsPerDay === -1 ? 0 : Math.round((usage.aiSuggestionsToday / limits.aiSuggestionsPerDay) * 100),
      resetsIn: 'daily',
    },
    aiScheduleGenerations: {
      used: usage.aiScheduleGenerationsThisMonth,
      limit: limits.aiScheduleGenerationsPerMonth,
      unlimited: limits.aiScheduleGenerationsPerMonth === -1,
      percentage: limits.aiScheduleGenerationsPerMonth === -1 ? 0 : Math.round((usage.aiScheduleGenerationsThisMonth / limits.aiScheduleGenerationsPerMonth) * 100),
      resetsIn: 'monthly',
    },
    features: {
      customThemes: limits.customThemes,
      advancedAnalytics: limits.advancedAnalytics,
      prioritySupport: limits.prioritySupport,
      exportData: limits.exportData,
      apiAccess: limits.apiAccess,
      teamCollaboration: limits.teamCollaboration,
    },
  };
}

// Log usage action (for tracking AI usage, etc.)
export async function logUsageAction(userId: string, action: string, details?: Record<string, unknown>) {
  const db = await getDb();
  await db.collection(COLLECTIONS.ACTIVITY_LOGS).insertOne({
    userId: toObjectId(userId),
    action,
    entityType: 'usage',
    details,
    createdAt: new Date(),
  });
}
