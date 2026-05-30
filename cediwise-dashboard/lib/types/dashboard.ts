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

// ─── Analytics (PostHog) types ────────────────────────────────────────────

export type Period = "day" | "week" | "month" | "year";

export type SeriesPoint = {
  date: string;
  value: number;
};

export type StatCardData = {
  label: string;
  value: number | string;
  delta: number | null;
  deltaLabel: string;
};

export type EventBreakdownItem = {
  label: string;
  value: number;
  color: string;
};

export type ActiveUsersData = {
  dau: StatCardData;
  wau: StatCardData;
  mau: StatCardData;
  series: {
    dau: SeriesPoint[];
    wau: SeriesPoint[];
    mau: SeriesPoint[];
  };
};

export type TopEventsData = EventBreakdownItem[];

export type EventBreakdownData = EventBreakdownItem[];

export type PageviewTrendData = SeriesPoint[];

// ─── Monitoring (Sentry) types ────────────────────────────────────────────

export type SentryIssue = {
  id: string;
  title: string;
  level: "fatal" | "error" | "warning" | "info";
  count: number;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
  permalink: string;
  culprit: string;
  metadata: {
    type: string;
    value: string;
    filename: string;
    function: string;
  };
};

export type UnresolvedIssuesData = {
  total: StatCardData;
  issues: SentryIssue[];
};

export type ErrorStatsData = {
  fatal: SeriesPoint[];
  error: SeriesPoint[];
  warning: SeriesPoint[];
};

export type TransactionPerformance = {
  name: string;
  p95: number;
  p50: number;
};

export type PerformanceData = {
  transactions: TransactionPerformance[];
  overallP95: StatCardData;
};

export type AffectedUsersData = StatCardData;
