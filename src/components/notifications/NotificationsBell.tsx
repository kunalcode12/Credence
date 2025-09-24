"use client";

import { useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";

export function NotificationsBell() {
  const { items, loading, error, markSeen, markAllSeen, refresh } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const unseen = items.filter((n) => !n.seen).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md px-3 py-1.5 text-sm text-white/90 ring-1 ring-white/15 hover:bg-white/5"
      >
        <span>🔔</span>
        {unseen > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-400 px-1 text-[10px] font-bold text-black">
            {unseen}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-white/10 bg-black/80 p-2 shadow-lg backdrop-blur">
          <div className="mb-2 flex items-center justify-between px-1">
            <div className="text-xs font-semibold text-white/70">
              Notifications
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  markAllSeen().then(refresh);
                }}
                className="text-[11px] text-white/60 hover:text-white"
              >
                Mark all seen
              </button>
              <button
                onClick={refresh}
                className="text-[11px] text-white/60 hover:text-white"
              >
                Refresh
              </button>
            </div>
          </div>
          <div className="max-h-80 overflow-auto">
            {loading ? (
              <div className="p-3 text-xs text-white/60">Loading…</div>
            ) : error ? (
              <div className="p-3 text-xs text-red-300">{error}</div>
            ) : items.length === 0 ? (
              <div className="p-3 text-xs text-white/60">No notifications</div>
            ) : (
              items.map((n) => (
                <div
                  key={n._id}
                  className="mb-1 rounded-lg border border-white/10 bg-white/5 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-white">
                        {n.title}
                      </div>
                      <div className="text-[11px] text-white/70">
                        {n.message}
                      </div>
                    </div>
                    {!n.seen ? (
                      <button
                        onClick={() => markSeen(n._id).then(refresh)}
                        className="text-[11px] text-emerald-400 hover:underline"
                      >
                        Seen
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-1 text-[10px] text-white/40">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
