"use client";

import { useEffect, useState } from "react";
import {
  listNotifications,
  markNotificationSeen,
  markAllNotificationsSeen,
} from "@/lib/notifications";
import type { Notification } from "@/lib/api";

export function useNotifications() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Notification[]>([]);

  async function refresh() {
    setLoading(true);
    try {
      const res = await listNotifications();
      setItems(res.data.notifications || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return {
    loading,
    error,
    items,
    refresh,
    markSeen: markNotificationSeen,
    markAllSeen: markAllNotificationsSeen,
  };
}
