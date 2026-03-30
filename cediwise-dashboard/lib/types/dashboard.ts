export type DashboardKpis = {
  usersCount: number;
  lessonsCount: number;
  completionsThisWeek: number;
  pendingFeedback: number;
};

export type UserMetrics = {
  totalUsers: number;
  usersWithProfiles: number;
  usersWithoutProfiles: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  setupCompletedCount: number;
};

export type CompletionsByDay = { date: string; count: number }[];

export type RegistrationsByDay = { date: string; count: number }[];

export type CompletionsByModule = { module: string; count: number }[];

export type ProfileBreakdown = { name: string; value: number; fill: string }[];

export type RecentUser = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  hasProfile: boolean;
  setupCompleted: boolean;
  createdAt: string;
};

// --- Subscription types ---

export type SubscriptionTier = "free" | "budget" | "sme";
export type SubscriptionStatus = "active" | "trial" | "expired" | "cancelled" | "past_due" | "pending_payment";

export type SubscriptionMetrics = {
  totalSubscriptions: number;
  freeCount: number;
  budgetCount: number;
  smeCount: number;
  trialCount: number;
  paidActiveCount: number;
  earlyBirdUsed: number;
  earlyBirdTotal: number;
  mrr: number;
  projectedArr: number;
};

export type TierDistribution = { name: string; value: number; fill: string }[];

export type SubscriptionActivityEntry = {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  eventType: string;
  fromTier: string | null;
  toTier: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
};

export type SubscriptionActivityByDay = { date: string; count: number }[];

export type UserSubscription = {
  tier: string;
  status: string;
  trialEndsAt: string | null;
  isEarlyBird: boolean;
  pendingTier: string | null;
  monthlyPrice: number;
} | null;
