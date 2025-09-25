"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getOrgInvoicesWithBids, type OrgInvoice } from "@/lib/organization";
import { apiFetch } from "@/lib/api";

type Listing = {
  _id: string;
  invoice: OrgInvoice;
  organization: string;
  isOpen: boolean;
  bids: Array<{
    _id: string;
    amount: number;
    status: string;
    financer: {
      _id: string;
      user?: { email?: string };
      profile?: { firstName?: string; lastName?: string; companyName?: string };
    };
  }>;
};

export default function OrgBidsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await getOrgInvoicesWithBids();
      setListings(res.data.listings || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load bids");
    } finally {
      setLoading(false);
    }
  }

  async function acceptBid(listingId: string, bidId: string) {
    setBusy(true);
    try {
      await apiFetch<{ success: boolean; message: string }>(
        `/marketplace/${listingId}/bids/${bidId}/accept`,
        { method: "POST", auth: true }
      );
      setListings((prev) => prev.filter((l) => l._id !== listingId));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!params?.id) return;
    load();
  }, [params?.id]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-2xl font-semibold text-white">Bids</div>
          <div className="text-sm text-white/60">Invoices with active bids</div>
        </div>
        <button
          onClick={() => router.push(`/organization/${params.id}`)}
          className="rounded-md px-3 py-1.5 text-sm text-white/90 ring-1 ring-white/15 hover:bg-white/5"
        >
          Back to profile
        </button>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        {loading ? (
          <div className="text-white/60">Loading…</div>
        ) : error ? (
          <div className="text-red-300">{error}</div>
        ) : listings.length === 0 ? (
          <div className="text-white/60">No bids yet.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {listings.map((l) => {
              const sorted = [...l.bids].sort((a, b) => b.amount - a.amount);
              return (
                <div
                  key={l._id}
                  className="rounded-lg border border-white/10 bg-black/30 p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-white font-medium">
                      {l.invoice?.invoiceNumber || l.invoice?._id}
                    </div>
                    <button
                      onClick={() =>
                        router.push(`/marketplace/${l.invoice?._id}/${l._id}`)
                      }
                      className="rounded-md px-2 py-1 text-xs text-white/90 ring-1 ring-white/15 hover:bg-white/5"
                    >
                      Go to listing
                    </button>
                  </div>
                  <div className="text-xs text-white/60 mb-2">Top bids</div>
                  <div className="grid gap-2">
                    {sorted.map((b) => (
                      <div
                        key={b._id}
                        className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80"
                      >
                        <div>
                          <div className="font-medium text-white">
                            ₹{b.amount.toLocaleString()}
                          </div>
                          <div className="text-white/60 text-xs">
                            {b.financer.profile?.companyName ||
                              `${b.financer.profile?.firstName || ""} ${
                                b.financer.profile?.lastName || ""
                              }`.trim()}{" "}
                            • {b.financer.user?.email || ""}
                          </div>
                        </div>
                        <button
                          onClick={() => acceptBid(l._id, b._id)}
                          className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-black hover:bg-white/90"
                        >
                          Accept bid
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {busy ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40">
          <div className="rounded-md bg-black/80 px-4 py-2 text-sm text-white/80">
            Working…
          </div>
        </div>
      ) : null}
    </div>
  );
}
