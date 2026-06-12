import AsyncStorage from "@react-native-async-storage/async-storage";

export type ReminderMessage = {
  id: string;
  title: string;
  body: string;
  deepLink: string;
};

const SHOWN_MESSAGES_KEY = "@cediwise_notification_shown_message_ids";

const MESSAGE_POOL: ReminderMessage[] = [
  { id: "m01", title: "💰 Cash Check", body: "Quick 30-second check-in to see where your money went today.", deepLink: "/expenses" },
  { id: "m02", title: "📊 Budget Pulse", body: "How's your budget looking? One tap to log today's expenses.", deepLink: "/expenses" },
  { id: "m03", title: "🎯 On Track?", body: "Small daily logs = big financial clarity. You've got this!", deepLink: "/expenses" },
  { id: "m04", title: "👀 Sneak Peek", body: "Your weekly spending snapshot is ready. 30 seconds away.", deepLink: "/expenses" },
  { id: "m05", title: "🔥 Keep Going", body: "Logging today keeps your budget on fire. Don't break the streak!", deepLink: "/expenses" },
  { id: "m06", title: "✅ Quick Win", body: "One tap. 30 seconds. That's all it takes to stay on top.", deepLink: "/expenses" },
  { id: "m07", title: "💪 Money Moves", body: "Every log is a step toward financial freedom. Let's go!", deepLink: "/expenses" },
  { id: "m08", title: "📈 Stay Sharp", body: "Keep your budget razor-sharp with a quick expense log.", deepLink: "/expenses" },
  { id: "m09", title: "⏰ Daily Snap", body: "Time for your daily money snapshot. Quick and easy!", deepLink: "/expenses" },
  { id: "m10", title: "🎉 You Got This", body: "Budget logging made simple. 30 seconds, you're done.", deepLink: "/expenses" },
  { id: "m11", title: "👋 Hey You", body: "Just a friendly nudge to log today's expenses. Future you will thank you!", deepLink: "/expenses" },
  { id: "m12", title: "💡 Money Tip", body: "People who log daily save 20% more. Start with today!", deepLink: "/expenses" },
  { id: "m13", title: "📋 Quick Log", body: "Before you forget — log that expense from earlier today.", deepLink: "/expenses" },
  { id: "m14", title: "🎯 Stay Focused", body: "Your goals are closer when you track every cedis. Log now!", deepLink: "/expenses" },
  { id: "m15", title: "🔄 Check In", body: "How's your budget feeling today? 30 seconds to find out.", deepLink: "/expenses" },
  { id: "m16", title: "📊 Money Snapshot", body: "See where you stand with a quick expense log.", deepLink: "/expenses" },
  { id: "m17", title: "🚀 Level Up", body: "Level up your finances — one log at a time. Tap to start!", deepLink: "/expenses" },
  { id: "m18", title: "💎 Habit Builder", body: "Great financial habits start with daily logs. Don't skip today!", deepLink: "/expenses" },
  { id: "m19", title: "🎯 Budget Check", body: "Is your budget on track? One tap gives you the answer.", deepLink: "/expenses" },
  { id: "m20", title: "🌈 Fresh Start", body: "New day, fresh chance to keep your finances on point!", deepLink: "/expenses" },
  { id: "m21", title: "⚡ Quick Hit", body: "30-second expense log. Fast, easy, powerful. Go!", deepLink: "/expenses" },
  { id: "m22", title: "🎯 Know Your Numbers", body: "You can't manage what you don't measure. Log today!", deepLink: "/expenses" },
  { id: "m23", title: "💪 Stay on Track", body: "Your budget works when you log. Quick check-in time!", deepLink: "/expenses" },
  { id: "m24", title: "📆 Today's Log", body: "Don't let today's expenses become tomorrow's mystery. Log now!", deepLink: "/expenses" },
  { id: "m25", title: "💰 Money Check", body: "Pause for 30 seconds and log. Your wallet will thank you!", deepLink: "/expenses" },
  { id: "m26", title: "🎯 Midweek Check", body: "How are you tracking this week? Quick log keeps you honest.", deepLink: "/expenses" },
  { id: "m27", title: "🔥 On Fire", body: "Consistent logging = financial clarity. Keep it burning!", deepLink: "/expenses" },
  { id: "m28", title: "👑 Own It", body: "Take control of your money. One log at a time. You're the boss!", deepLink: "/expenses" },
  { id: "m29", title: "🎯 Right Here", body: "Your budget data is waiting. 30 seconds to stay ahead.", deepLink: "/expenses" },
  { id: "m30", title: "💡 Bright Idea", body: "Best time to log expenses? Right now. Second best? Right after!", deepLink: "/expenses" },
  { id: "m31", title: "📊 Peak at Your Week", body: "Curious how your week is shaping up? One log unlocks the view.", deepLink: "/expenses" },
  { id: "m32", title: "🔔 Friendly Reminder", body: "Logging expenses = peace of mind. You deserve that today!", deepLink: "/expenses" },
  { id: "m33", title: "🎯 Stay Ahead", body: "Future you will be so glad you logged today. Do it now!", deepLink: "/expenses" },
  { id: "m34", title: "❤️ Self Care", body: "Financial self-care is real. 30 seconds to log = love yourself!", deepLink: "/expenses" },
  { id: "m35", title: "🧠 Brain Boost", body: "Your brain on budgeting: sharper, clearer, wealthier. Log today!", deepLink: "/expenses" },
];

export function getMessagePool(): ReminderMessage[] {
  return [...MESSAGE_POOL];
}

export async function getShownMessageIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(SHOWN_MESSAGES_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

export async function markMessageShown(id: string): Promise<void> {
  try {
    const shown = await getShownMessageIds();
    shown.add(id);
    await AsyncStorage.setItem(SHOWN_MESSAGES_KEY, JSON.stringify([...shown]));
  } catch {
    // ignore
  }
}

export async function resetShownMessages(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SHOWN_MESSAGES_KEY);
  } catch {
    // ignore
  }
}

export async function pickUnseenMessage(): Promise<ReminderMessage> {
  const pool = getMessagePool();
  const shown = await getShownMessageIds();

  const unseen = pool.filter((m) => !shown.has(m.id));

  if (unseen.length === 0) {
    await resetShownMessages();
    const randomIndex = Math.floor(Math.random() * pool.length);
    const picked = pool[randomIndex];
    await markMessageShown(picked.id);
    return picked;
  }

  const randomIndex = Math.floor(Math.random() * unseen.length);
  const picked = unseen[randomIndex];
  await markMessageShown(picked.id);
  return picked;
}
