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
  const [showDetails, setShowDetails] = useState(false);
  const [showBids, setShowBids] = useState(false);
  const [selected, setSelected] = useState<Listing | null>(null);

  function formatCurrency(amount?: number, currency?: string) {
    if (typeof amount !== "number") return "-";
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: currency || "INR",
        maximumFractionDigits: 0,
      }).format(amount);
    } catch (_) {
      return `₹${amount.toLocaleString()}`;
    }
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await getOrgInvoicesWithBids();
      // console.log("res", res.data);
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
      // Close the bids dialog after successful acceptance
      setShowBids(false);
      setSelected(null);
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((l) => {
              const inv = l.invoice as any;
              const items = inv?.items || [];
              const topItems = items.slice(0, 3);
              const bidsSorted = [...l.bids].sort(
                (a, b) => b.amount - a.amount
              );
              return (
                <div
                  key={l._id}
                  className="group relative rounded-xl border border-white/10 bg-black/40 p-4 shadow-sm shadow-black/30 overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-white/50">Invoice</div>
                      <div className="text-white font-semibold">
                        {inv?.invoiceNumber || inv?._id}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {inv?.status ? (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/70 ring-1 ring-white/10">
                          {inv.status}
                        </span>
                      ) : null}
                      {inv?.isOverdue ? (
                        <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] text-red-200 ring-1 ring-red-500/30">
                          Overdue
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-white/70">
                    <div>
                      <div className="text-white/50">Issue</div>
                      <div>
                        {inv?.issueDate
                          ? new Date(inv.issueDate).toLocaleDateString()
                          : "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/50">Due</div>
                      <div>
                        {inv?.dueDate
                          ? new Date(inv.dueDate).toLocaleDateString()
                          : "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/50">Amount</div>
                      <div className="font-medium text-white">
                        {formatCurrency(inv?.totalAmount, inv?.currency)}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/50">Days left</div>
                      <div>
                        {typeof inv?.daysUntilDue === "number"
                          ? inv.daysUntilDue
                          : "-"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-white/10 bg-white/5">
                    <div className="flex items-center justify-between px-3 py-2 text-xs text-white/60">
                      <span>Items ({items.length})</span>
                      <span className="text-white/50">
                        Subtotal: {formatCurrency(inv?.subtotal, inv?.currency)}
                      </span>
                    </div>
                    <div className="divide-y divide-white/10">
                      {topItems.map((it: any, idx: number) => (
                        <div
                          key={idx}
                          className="px-3 py-2 text-xs text-white/80 flex items-center justify-between"
                        >
                          <div className="truncate max-w-[60%] text-white/90">
                            {it.description}
                          </div>
                          <div className="text-white/60">
                            {it.quantity} ×{" "}
                            {formatCurrency(it.unitPrice, inv?.currency)}
                          </div>
                        </div>
                      ))}
                      {items.length > 3 ? (
                        <div className="px-3 py-2 text-[11px] text-white/50">
                          +{items.length - 3} more
                        </div>
                      ) : null}
                    </div>
                    <div className="px-3 py-2 text-xs text-white/70 grid grid-cols-3 gap-2">
                      <div>
                        Discount:{" "}
                        <span className="text-white/90">
                          {formatCurrency(inv?.discountAmount, inv?.currency)}
                        </span>
                      </div>
                      <div>
                        Tax:{" "}
                        <span className="text-white/90">
                          {formatCurrency(inv?.taxAmount, inv?.currency)}
                        </span>
                      </div>
                      <div className="text-right">
                        Total:{" "}
                        <span className="font-semibold text-white">
                          {formatCurrency(inv?.totalAmount, inv?.currency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs">
                    <div className="text-white/60">
                      Bids: <span className="text-white">{l.bids.length}</span>
                    </div>
                    <button
                      onClick={() =>
                        router.push(`/marketplace/${inv?._id}/${l._id}`)
                      }
                      className="rounded-md px-2 py-1 text-[11px] text-white/90 ring-1 ring-white/15 hover:bg-white/5"
                    >
                      Go to listing
                    </button>
                  </div>

                  <div className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/40" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-4 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                    <div className="flex justify-center gap-2 p-3">
                      <button
                        onClick={() => {
                          setSelected(l);
                          setShowDetails(true);
                        }}
                        className="pointer-events-auto rounded-md bg-white px-3 py-1 text-xs font-semibold text-black hover:bg-white/90"
                      >
                        See details
                      </button>
                      <button
                        onClick={() => {
                          setSelected(l);
                          setShowBids(true);
                        }}
                        className="pointer-events-auto rounded-md bg-sky-500 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-400"
                      >
                        Bids
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showDetails && selected ? (
        <div
          className="fixed inset-0 z-[120] grid place-items-center bg-black/60"
          onClick={() => {
            setShowDetails(false);
            setSelected(null);
          }}
        >
          <div
            className="max-h-[85vh] w-[95vw] max-w-3xl overflow-auto rounded-xl border border-white/10 bg-black/80 p-4 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-lg font-semibold">Invoice details</div>
              <button
                className="rounded-md px-2 py-1 text-xs text-white/80 ring-1 ring-white/15 hover:bg-white/5"
                onClick={() => {
                  setShowDetails(false);
                  setSelected(null);
                }}
              >
                Close
              </button>
            </div>
            {(() => {
              const inv = selected.invoice as any;
              const items = inv?.items || [];
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-white/60">Invoice number</div>
                      <div className="font-medium">
                        {inv?.invoiceNumber || inv?._id}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/60">Status</div>
                      <div className="font-medium uppercase">{inv?.status}</div>
                    </div>
                    <div>
                      <div className="text-white/60">Issue date</div>
                      <div>
                        {inv?.issueDate
                          ? new Date(inv.issueDate).toLocaleString()
                          : "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/60">Due date</div>
                      <div>
                        {inv?.dueDate
                          ? new Date(inv.dueDate).toLocaleString()
                          : "-"}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/10">
                    <div className="border-b border-white/10 px-3 py-2 text-sm text-white/70">
                      Items
                    </div>
                    <div className="divide-y divide-white/10">
                      {items.map((it: any, idx: number) => (
                        <div
                          key={idx}
                          className="grid grid-cols-6 items-center gap-2 px-3 py-2 text-sm"
                        >
                          <div className="col-span-3 text-white/90">
                            {it.description}
                          </div>
                          <div className="text-white/70">Qty {it.quantity}</div>
                          <div className="text-white/70">Tax {it.tax}%</div>
                          <div className="text-right text-white">
                            {formatCurrency(it.total, inv?.currency)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3 px-3 py-3 text-sm">
                      <div className="text-white/70">Subtotal</div>
                      <div className="text-right">
                        {formatCurrency(inv?.subtotal, inv?.currency)}
                      </div>
                      <div className="text-white/70">Discount</div>
                      <div className="text-right">
                        {formatCurrency(inv?.discountAmount, inv?.currency)}
                      </div>
                      <div className="text-white/70">Tax</div>
                      <div className="text-right">
                        {formatCurrency(inv?.taxAmount, inv?.currency)}
                      </div>
                      <div className="text-white/90 font-semibold">Total</div>
                      <div className="text-right font-semibold">
                        {formatCurrency(inv?.totalAmount, inv?.currency)}
                      </div>
                    </div>
                  </div>

                  {inv?.notes ? (
                    <div className="text-sm">
                      <div className="mb-1 text-white/60">Notes</div>
                      <pre className="whitespace-pre-wrap rounded-md bg-white/5 p-3 text-white/80">
                        {inv.notes}
                      </pre>
                    </div>
                  ) : null}

                  {inv?.termsAndConditions ? (
                    <div className="text-sm">
                      <div className="mb-1 text-white/60">
                        Terms & Conditions
                      </div>
                      <pre className="whitespace-pre-wrap rounded-md bg-white/5 p-3 text-white/80">
                        {inv.termsAndConditions}
                      </pre>
                    </div>
                  ) : null}
                </div>
              );
            })()}
          </div>
        </div>
      ) : null}

      {showBids && selected ? (
        <div
          className="fixed inset-0 z-[120] grid place-items-center bg-black/60"
          onClick={() => {
            setShowBids(false);
            setSelected(null);
          }}
        >
          <div
            className="max-h-[85vh] w-[95vw] max-w-2xl overflow-auto rounded-xl border border-white/10 bg-black/80 p-4 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-lg font-semibold">Bids</div>
              <button
                className="rounded-md px-2 py-1 text-xs text-white/80 ring-1 ring-white/15 hover:bg-white/5"
                onClick={() => {
                  setShowBids(false);
                  setSelected(null);
                }}
              >
                Close
              </button>
            </div>
            {(() => {
              const bidsSorted = [...selected.bids].sort(
                (a, b) => b.amount - a.amount
              );
              return (
                <div className="space-y-2">
                  {bidsSorted.length === 0 ? (
                    <div className="text-white/60">No bids yet.</div>
                  ) : (
                    bidsSorted.map((b, idx) => (
                      <div
                        key={b._id}
                        className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80"
                      >
                        <div className="flex items-center gap-3">
                          <div className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-xs text-white/80">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="font-medium text-white">
                              {formatCurrency(
                                b.amount,
                                (selected.invoice as any)?.currency
                              )}
                            </div>
                            <div className="text-white/60 text-xs">
                              {b.financer.profile?.companyName ||
                                `${b.financer.profile?.firstName || ""} ${
                                  b.financer.profile?.lastName || ""
                                }`.trim()}{" "}
                              • {b.financer.user?.email || ""}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/70 ring-1 ring-white/10">
                            {b.status}
                          </span>
                          <button
                            onClick={() => acceptBid(selected._id, b._id)}
                            className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-black hover:bg-white/90"
                          >
                            Accept
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      ) : null}

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
