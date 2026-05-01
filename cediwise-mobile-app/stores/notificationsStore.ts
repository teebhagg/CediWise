import { supabase } from "@/utils/supabase";
import { log } from "@/utils/logger";
import { create } from "zustand";

export type AnnouncementInboxItem = {
  id: string;
  title: string;
  body: string;
  deep_link: string | null;
  sent_at: string | null;
  read: boolean;
  read_at: string | null;
};

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  deep_link: string | null;
  sent_at: string | null;
};

type ReadRow = {
  campaign_id: string;
  read_at: string;
};

type AnnouncementInboxState = {
  items: AnnouncementInboxItem[];
  unreadCount: number;
  loading: boolean;
  lastFetchedAt: number | null;
  lastError: string | null;
  clearLastError: () => void;
  refresh: (userId: string) => Promise<void>;
  markRead: (userId: string, campaignId: string) => Promise<void>;
};

export const useAnnouncementInboxStore = create<AnnouncementInboxState>((set, get) => ({
  items: [],
  unreadCount: 0,
  loading: false,
  lastFetchedAt: null,
  lastError: null,

  clearLastError: () => set({ lastError: null }),

  refresh: async (userId: string) => {
    if (!supabase || !userId) return;
    set({ loading: true, lastError: null });
    try {
      const { data: campaigns, error: cErr } = await supabase
        .from("announcement_campaigns")
        .select("id,title,body,deep_link,sent_at")
        .eq("status", "sent")
        .not("sent_at", "is", null)
        .or(`audience_type.eq.all,target_user_id.eq.${userId}`)
        .order("sent_at", { ascending: false, nullsFirst: false })
        .limit(50);

      if (cErr) throw new Error(cErr.message);

      const { data: reads, error: rErr } = await supabase
        .from("user_announcement_reads")
        .select("campaign_id,read_at")
        .eq("user_id", userId);

      if (rErr) throw new Error(rErr.message);

      const readMap = new Map<string, string>(
        (reads as ReadRow[] | null)?.map((r) => [r.campaign_id, r.read_at]) ?? [],
      );

      const rows = (campaigns ?? []) as AnnouncementRow[];
      const items: AnnouncementInboxItem[] = rows.map((c) => {
        const readAt = readMap.get(c.id) ?? null;
        return {
          id: c.id,
          title: c.title,
          body: c.body,
          deep_link: c.deep_link,
          sent_at: c.sent_at,
          read: readAt != null,
          read_at: readAt,
        };
      });

      const unreadCount = items.filter((i) => !i.read).length;

      set({
        items,
        unreadCount,
        lastFetchedAt: Date.now(),
        loading: false,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load updates";
      log.warn("announcement inbox refresh", message);
      set({ loading: false, lastError: message });
    }
  },

  markRead: async (userId: string, campaignId: string) => {
    if (!supabase || !userId) return;
    const { error } = await supabase.from("user_announcement_reads").upsert(
      {
        user_id: userId,
        campaign_id: campaignId,
        read_at: new Date().toISOString(),
      },
      { onConflict: "user_id,campaign_id" },
    );
    if (error) {
      log.warn("markRead announcement", error.message);
      return;
    }
    await get().refresh(userId);
  },
}));
