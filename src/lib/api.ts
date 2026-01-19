// API utility functions for the frontend
import { useEffect, useState, useCallback } from 'react';

const API_BASE = '/api';

// Token management
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    localStorage.setItem('accessToken', token);
  } else {
    localStorage.removeItem('accessToken');
  }
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  if (typeof window !== 'undefined') {
    accessToken = localStorage.getItem('accessToken');
  }
  return accessToken;
}

// Generic API request function
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: { code: string; message: string }; pagination?: unknown }> {
  const token = getAccessToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options.headers as Record<string, string>),
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    const data = await response.json();

    // If unauthorized, try to refresh token
    if (response.status === 401 && !endpoint.includes('/auth/')) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry with new token
        headers.Authorization = `Bearer ${getAccessToken()}`;
        const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          headers,
          credentials: 'include',
        });
        return await retryResponse.json();
      } else {
        // Clear token and redirect to login
        setAccessToken(null);
        window.location.href = '/login';
      }
    }

    return data;
  } catch (error) {
    console.error('API request failed:', error);
    return {
      success: false,
      error: { code: 'NET001', message: 'Network error. Please try again.' },
    };
  }
}

// Refresh access token
async function refreshAccessToken(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    const data = await response.json();
    if (data.success && data.data?.accessToken) {
      setAccessToken(data.data.accessToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Auth API
export const authApi = {
  async register(email: string, password: string, name: string) {
    return apiRequest<{ user: unknown; accessToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  },

  async login(email: string, password: string, rememberMe: boolean = false) {
    const result = await apiRequest<{ user: unknown; accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe }),
    });
    if (result.success && result.data?.accessToken) {
      setAccessToken(result.data.accessToken);
    }
    return result;
  },

  async logout() {
    const result = await apiRequest('/auth/logout', { method: 'POST' });
    setAccessToken(null);
    return result;
  },

  async me() {
    return apiRequest<{ user: unknown }>('/auth/me');
  },
};

// Study Plans API
export const plansApi = {
  async list(params?: { status?: string; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    return apiRequest<unknown[]>(`/plans?${searchParams.toString()}`);
  },

  async get(id: string) {
    return apiRequest<unknown>(`/plans/${id}`);
  },

  async create(data: {
    title: string;
    description?: string;
    subject?: string;
    color?: string;
    icon?: string;
    startDate?: string;
    endDate?: string;
    goals?: { title: string; targetHours?: number }[];
  }) {
    return apiRequest<unknown>('/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<{
    title: string;
    description: string;
    subject: string;
    color: string;
    icon: string;
    status: string;
    startDate: string;
    endDate: string;
  }>) {
    return apiRequest<unknown>(`/plans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string) {
    return apiRequest(`/plans/${id}`, { method: 'DELETE' });
  },
};

// Tasks API
export const tasksApi = {
  async list(params?: {
    status?: string;
    priority?: string;
    planId?: string;
    dueDate?: string;
    overdue?: boolean;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.priority) searchParams.set('priority', params.priority);
    if (params?.planId) searchParams.set('planId', params.planId);
    if (params?.dueDate) searchParams.set('dueDate', params.dueDate);
    if (params?.overdue) searchParams.set('overdue', 'true');
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    return apiRequest<unknown[]>(`/tasks?${searchParams.toString()}`);
  },

  async get(id: string) {
    return apiRequest<unknown>(`/tasks/${id}`);
  },

  async create(data: {
    title: string;
    description?: string;
    priority?: string;
    status?: string;
    dueDate?: string;
    dueTime?: string;
    estimatedMinutes?: number;
    studyPlanId?: string;
    planId?: string;
    subject?: string;
    tags?: string[];
    subtasks?: { title: string }[];
  }) {
    // Support both planId and studyPlanId
    const body = { ...data };
    if (data.planId && !data.studyPlanId) {
      body.studyPlanId = data.planId;
    }
    return apiRequest<unknown>('/tasks', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async update(id: string, data: Partial<{
    title: string;
    description: string;
    priority: string;
    status: string;
    dueDate: string;
    dueTime: string;
    estimatedMinutes: number;
    actualMinutes: number;
    studyPlanId: string;
    tags: string[];
  }>) {
    return apiRequest<unknown>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async complete(id: string) {
    return apiRequest<unknown>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
  },

  async delete(id: string) {
    return apiRequest(`/tasks/${id}`, { method: 'DELETE' });
  },
};

// Timer API
export const timerApi = {
  async getSessions(params?: {
    type?: string;
    taskId?: string;
    planId?: string;
    completed?: boolean;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.taskId) searchParams.set('taskId', params.taskId);
    if (params?.planId) searchParams.set('planId', params.planId);
    if (params?.completed !== undefined) searchParams.set('completed', params.completed.toString());
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    return apiRequest<unknown[]>(`/timer/sessions?${searchParams.toString()}`);
  },

  async createSession(data: {
    type: 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';
    duration: number;
    completed: boolean;
    startTime?: string;
    endTime?: string;
    taskId?: string;
    studyPlanId?: string;
    label?: string;
    notes?: string;
  }) {
    return apiRequest<unknown>('/timer/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async startSession(data: {
    type: 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';
    duration: number;
    taskId?: string;
    studyPlanId?: string;
    label?: string;
  }) {
    return apiRequest<unknown>('/timer/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async completeSession(id: string, data: {
    actualDuration?: number;
    notes?: string;
    interrupted?: boolean;
  }) {
    return apiRequest<unknown>(`/timer/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: true, ...data }),
    });
  },

  async getSettings() {
    return apiRequest<unknown>('/timer/settings');
  },

  async updateSettings(data: Partial<{
    pomodoroLength: number;
    shortBreakLength: number;
    longBreakLength: number;
    longBreakInterval: number;
    autoStartBreaks: boolean;
    autoStartPomodoros: boolean;
    soundEnabled: boolean;
    notificationsEnabled: boolean;
  }>) {
    return apiRequest<unknown>('/timer/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async getStats(period?: string) {
    const searchParams = new URLSearchParams();
    if (period) searchParams.set('period', period);
    return apiRequest<unknown>(`/timer/stats?${searchParams.toString()}`);
  },
};

// Analytics API
export const analyticsApi = {
  async get(params?: { period?: string; planId?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.set('period', params.period);
    if (params?.planId) searchParams.set('planId', params.planId);
    return apiRequest<unknown>(`/analytics?${searchParams.toString()}`);
  },

  async getWeeklyReport(offset?: number) {
    const searchParams = new URLSearchParams();
    if (offset !== undefined) searchParams.set('offset', offset.toString());
    return apiRequest<unknown>(`/analytics/weekly?${searchParams.toString()}`);
  },
};

// AI API
export const aiApi = {
  async generateSchedule(data: {
    startDate?: string;
    endDate?: string;
    dailyStudyHours?: number;
    preferredStartTime?: string;
    preferredEndTime?: string;
    breakBetweenSessions?: number;
    focusSessionLength?: number;
    includeWeekends?: boolean;
    planIds?: string[];
  }) {
    return apiRequest<unknown>('/ai/schedule', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getSuggestions() {
    return apiRequest<unknown>('/ai/suggestions');
  },
};

// React hooks for data fetching
export function useApi<T>(
  fetcher: () => Promise<{ success: boolean; data?: T; error?: { message: string } }>,
  deps: unknown[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error?.message || 'An error occurred');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch };
}

// User API
export const userApi = {
  async getProfile(id: string) {
    return apiRequest<unknown>(`/users/${id}`);
  },

  async updateProfile(id: string, data: Partial<{
    name: string;
    image: string;
    school: string;
    grade: string;
    bio: string;
    timezone: string;
  }>) {
    return apiRequest<unknown>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async getPreferences(id: string) {
    return apiRequest<unknown>(`/users/${id}/preferences`);
  },

  async updatePreferences(id: string, data: Partial<{
    theme: string;
    emailNotifications: boolean;
    pushNotifications: boolean;
    weeklyReport: boolean;
    dailyGoalMinutes: number;
    weeklyGoalMinutes: number;
    pomodoroLength: number;
    shortBreakLength: number;
    longBreakLength: number;
  }>) {
    return apiRequest<unknown>(`/users/${id}/preferences`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

// Study Plan API (alias for plansApi)
export const studyPlanApi = plansApi;

// Notes API
export const notesApi = {
  async list(params?: { folder?: string; tag?: string; search?: string; planId?: string; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.folder) searchParams.set('folder', params.folder);
    if (params?.tag) searchParams.set('tag', params.tag);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.planId) searchParams.set('planId', params.planId);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    return apiRequest<unknown[]>(`/notes?${searchParams.toString()}`);
  },

  async get(id: string) {
    return apiRequest<unknown>(`/notes/${id}`);
  },

  async create(data: {
    title: string;
    content?: string;
    folder?: string;
    tags?: string[];
    planId?: string;
  }) {
    return apiRequest<unknown>('/notes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<{
    title: string;
    content: string;
    folder: string;
    tags: string[];
  }>) {
    return apiRequest<unknown>(`/notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string) {
    return apiRequest(`/notes/${id}`, { method: 'DELETE' });
  },
};

// Flashcards API
export const flashcardsApi = {
  async listDecks(params?: { planId?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.planId) searchParams.set('planId', params.planId);
    return apiRequest<unknown[]>(`/flashcards/decks?${searchParams.toString()}`);
  },

  async getDeck(id: string) {
    return apiRequest<unknown>(`/flashcards/decks/${id}`);
  },

  async createDeck(data: { title?: string; name?: string; description?: string; planId?: string }) {
    return apiRequest<unknown>('/flashcards/decks', {
      method: 'POST',
      body: JSON.stringify({ name: data.title || data.name, description: data.description, planId: data.planId }),
    });
  },

  async updateDeck(id: string, data: Partial<{ name: string; description: string }>) {
    return apiRequest<unknown>(`/flashcards/decks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteDeck(id: string) {
    return apiRequest(`/flashcards/decks/${id}`, { method: 'DELETE' });
  },

  async listCards(deckId: string) {
    return apiRequest<unknown[]>(`/flashcards/decks/${deckId}/cards`);
  },

  async createCard(data: { deckId: string; front: string; back: string }) {
    return apiRequest<unknown>(`/flashcards/decks/${data.deckId}/cards`, {
      method: 'POST',
      body: JSON.stringify({ front: data.front, back: data.back }),
    });
  },

  async updateCard(deckId: string, cardId: string, data: Partial<{ front: string; back: string }>) {
    return apiRequest<unknown>(`/flashcards/decks/${deckId}/cards/${cardId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteCard(deckId: string, cardId: string) {
    return apiRequest(`/flashcards/decks/${deckId}/cards/${cardId}`, { method: 'DELETE' });
  },

  async reviewCard(cardId: string, correct: boolean) {
    return apiRequest<unknown>(`/flashcards/cards/${cardId}/review`, {
      method: 'POST',
      body: JSON.stringify({ correct }),
    });
  },
};

// Admin API
export const adminApi = {
  async getStats() {
    return apiRequest<{
      stats: {
        totalUsers: number;
        totalPlans: number;
        totalTasks: number;
        totalSessions: number;
        activeUsersToday: number;
        proUsers: number;
        completedTasks: number;
        pendingTasks: number;
        taskCompletionRate: number;
        totalStudyMinutes: number;
        totalStudyHours: number;
      };
      userGrowth: { _id: string; count: number }[];
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
    }>('/admin');
  },

  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    plan?: string;
    role?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.plan) searchParams.set('plan', params.plan);
    if (params?.role) searchParams.set('role', params.role);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    return apiRequest<unknown[]>(`/admin/users?${searchParams.toString()}`);
  },

  async getUser(id: string) {
    return apiRequest<unknown>(`/admin/users/${id}`);
  },

  async updateUser(id: string, data: { role?: string; plan?: string; isActive?: boolean; name?: string }) {
    return apiRequest<unknown>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteUser(id: string) {
    return apiRequest(`/admin/users/${id}`, { method: 'DELETE' });
  },

  async resetUserPassword(id: string, data: { newPassword?: string; generateRandom?: boolean }) {
    return apiRequest<{ message: string; temporaryPassword?: string }>(`/admin/users/${id}/password`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getAnalytics(range?: number) {
    const searchParams = new URLSearchParams();
    if (range) searchParams.set('range', range.toString());
    return apiRequest<unknown>(`/admin/analytics?${searchParams.toString()}`);
  },

  async makeAdmin(data: { email?: string; userId?: string; setupKey?: string }) {
    return apiRequest<unknown>('/admin/make-admin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getSubscriptions(params?: {
    page?: number;
    limit?: number;
    status?: string;
    plan?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.plan) searchParams.set('plan', params.plan);
    return apiRequest<unknown>(`/admin/subscriptions?${searchParams.toString()}`);
  },

  async grantSubscription(data: { userId: string; plan: string; durationMonths?: number; reason?: string }) {
    return apiRequest<unknown>('/admin/subscriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getActivityLogs(params?: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.userId) searchParams.set('userId', params.userId);
    if (params?.action) searchParams.set('action', params.action);
    if (params?.entityType) searchParams.set('entityType', params.entityType);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    return apiRequest<unknown>(`/admin/activity?${searchParams.toString()}`);
  },

  async getSettings() {
    return apiRequest<unknown>('/admin/settings');
  },

  async updateSettings(data: Record<string, unknown>) {
    return apiRequest<unknown>('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

// Payments API
export const paymentsApi = {
  async getPaymentInfo() {
    return apiRequest<{
      subscription: {
        id: string;
        plan: string;
        status: string;
        currentPeriodStart: string;
        currentPeriodEnd: string;
        cancelAtPeriodEnd: boolean;
        trialEnd?: string;
      } | null;
      payments: Array<{
        id: string;
        amount: number;
        currency: string;
        status: string;
        description?: string;
        createdAt: string;
      }>;
      stripeData: {
        paymentMethods: Array<{
          id: string;
          brand?: string;
          last4?: string;
          expMonth?: number;
          expYear?: number;
        }>;
        invoices: Array<{
          id: string;
          number?: string;
          amount: number;
          currency: string;
          status?: string;
          paidAt?: number;
          invoicePdf?: string;
          hostedUrl?: string;
        }>;
      } | null;
      currentPlan: string;
    }>('/payments');
  },

  async createCheckoutSession(data: { plan: 'PRO' | 'TEAM'; interval?: 'monthly' | 'yearly' }) {
    return apiRequest<{ sessionId: string; url: string }>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async cancelSubscription() {
    return apiRequest<{ message: string }>('/payments', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'cancel' }),
    });
  },

  async resumeSubscription() {
    return apiRequest<{ message: string }>('/payments', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'resume' }),
    });
  },

  async openCustomerPortal() {
    return apiRequest<{ url: string }>('/payments', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'portal' }),
    });
  },
};

// Teams API
export const teamsApi = {
  async list() {
    return apiRequest<{
      teams: Array<{
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
      }>;
      pendingInvites: Array<{
        id: string;
        teamId: string;
        teamName: string;
        role: string;
        expiresAt: string;
        createdAt: string;
      }>;
    }>('/teams');
  },

  async create(data: { name: string; description?: string }) {
    return apiRequest<{ id: string; name: string; slug: string }>('/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async get(id: string) {
    return apiRequest<{
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
      members: Array<{
        id: string;
        memberId: string;
        name: string;
        email: string;
        avatar?: string;
        role: string;
        joinedAt: string;
      }>;
      stats: {
        totalMembers: number;
        totalPlans: number;
        totalTasks: number;
        totalSessions: number;
      };
    }>(`/teams/${id}`);
  },

  async update(id: string, data: { name?: string; description?: string; avatar?: string; settings?: unknown }) {
    return apiRequest<unknown>(`/teams/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string) {
    return apiRequest(`/teams/${id}`, { method: 'DELETE' });
  },

  async inviteMember(teamId: string, data: { email: string; role?: string }) {
    return apiRequest<{ id: string; inviteLink: string }>(`/teams/${teamId}/invites`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getInvites(teamId: string) {
    return apiRequest<Array<{
      id: string;
      email: string;
      role: string;
      status: string;
      invitedBy: { id: string; name: string };
      expiresAt: string;
      createdAt: string;
    }>>(`/teams/${teamId}/invites`);
  },

  async cancelInvite(teamId: string, inviteId: string) {
    return apiRequest(`/teams/${teamId}/invites?inviteId=${inviteId}`, { method: 'DELETE' });
  },

  async updateMemberRole(teamId: string, memberId: string, role: string) {
    return apiRequest<unknown>(`/teams/${teamId}/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  async removeMember(teamId: string, memberId: string) {
    return apiRequest(`/teams/${teamId}/members/${memberId}`, { method: 'DELETE' });
  },

  async getInviteDetails(token: string) {
    return apiRequest<{
      id: string;
      email: string;
      role: string;
      team: { id: string; name: string; description?: string; avatar?: string };
      invitedBy: { name: string };
      expiresAt: string;
    }>(`/teams/invite/${token}`);
  },

  async acceptInvite(token: string) {
    return apiRequest<{ teamId: string; teamName: string; role: string }>(`/teams/invite/${token}`, {
      method: 'POST',
    });
  },

  async declineInvite(token: string) {
    return apiRequest(`/teams/invite/${token}`, { method: 'DELETE' });
  },
};

// Usage/Limits API
export const usageApi = {
  async getUsageSummary() {
    return apiRequest<{
      studyPlans: { used: number; limit: number; unlimited: boolean; percentage: number };
      tasks: { used: number; limit: number; unlimited: boolean; percentage: number };
      flashcardDecks: { used: number; limit: number; unlimited: boolean; percentage: number };
      notes: { used: number; limit: number; unlimited: boolean; percentage: number };
      aiSuggestions: { used: number; limit: number; unlimited: boolean; percentage: number; resetsIn: string };
      aiScheduleGenerations: { used: number; limit: number; unlimited: boolean; percentage: number; resetsIn: string };
      features: {
        customThemes: boolean;
        advancedAnalytics: boolean;
        prioritySupport: boolean;
        exportData: boolean;
        apiAccess: boolean;
        teamCollaboration: boolean;
      };
    }>('/usage');
  },
};

