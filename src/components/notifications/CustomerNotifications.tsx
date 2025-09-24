"use client";

import { useNotifications } from "@/hooks/useNotifications";

export function CustomerNotifications() {
  const { items, loading, error, markSeen, refresh } = useNotifications();
  const relevant = items.filter((n) =>
    ["invoice_sent", "invoice_due_7d", "invoice_due_1d"].includes(n.type)
  );
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-white">Notifications</div>
        <button
          onClick={refresh}
          className="text-xs text-white/60 hover:text-white"
        >
          Refresh
        </button>
      </div>
      {loading ? (
        <div className="text-sm text-white/60">Loading…</div>
      ) : error ? (
        <div className="text-sm text-red-300">{error}</div>
      ) : relevant.length === 0 ? (
        <div className="text-sm text-white/60">No notifications</div>
      ) : (
        <div className="grid gap-2">
          {relevant.map((n) => (
            <div
              key={n._id}
              className="rounded-lg border border-white/10 bg-black/40 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-white">
                    {n.title}
                  </div>
                  <div className="text-[11px] text-white/70">{n.message}</div>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
