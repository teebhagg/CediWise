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
