import type { User } from "@supabase/supabase-js";

/** New signups: last 7 days vs prior 7 days. */
export function computeSignupWeekOverWeek(users: User[]): {
  current: number;
  previous: number;
} {
  const now = new Date();
  const thisStart = new Date(now);
  thisStart.setDate(thisStart.getDate() - 7);
  const prevStart = new Date(now);
  prevStart.setDate(prevStart.getDate() - 14);

  let current = 0;
  let previous = 0;
  for (const u of users) {
    const c = new Date(u.created_at);
    if (c >= thisStart) current += 1;
    else if (c >= prevStart && c < thisStart) previous += 1;
  }
  return { current, previous };
}

/** New signups: last 30 days vs prior 30 days. */
export function computeSignupMonthOverMonth(users: User[]): {
  current: number;
  previous: number;
} {
  const now = new Date();
  const thisStart = new Date(now);
  thisStart.setDate(thisStart.getDate() - 30);
  const prevStart = new Date(now);
  prevStart.setDate(prevStart.getDate() - 60);

  let current = 0;
  let previous = 0;
  for (const u of users) {
    const c = new Date(u.created_at);
    if (c >= thisStart) current += 1;
    else if (c >= prevStart && c < thisStart) previous += 1;
  }
  return { current, previous };
}
