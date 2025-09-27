"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderOverlay } from "@/components/ui/LoaderOverlay";
import {
  useFinancerOverview,
  financerActions,
  type FinancerInvoiceDetails,
} from "@/hooks/useFinancer";
import Link from "next/link";

export default function FinancerDashboardPage() {
  const router = useRouter();
  const tabs = useMemo(() => ["profile", "bids", "bought"] as const, []);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("profile");

  const {
    loading,
    error,
    data: overview,
    refresh,
    setData,
  } = useFinancerOverview();
  console.log("overview", overview);

  const [bought, setBought] = useState<{
    boughtInvoices: Array<{
      invoice: { _id: string; invoiceNumber?: string; totalAmount?: number };
      organization?: { name?: string; _id: string };
      amount: number;
      boughtAt: string;
    }>;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [addDialog, setAddDialog] = useState<{ open: boolean; amount: string }>(
    { open: false, amount: "" }
  );
  const [detailsDialog, setDetailsDialog] = useState<{
    open: boolean;
    invoice: FinancerInvoiceDetails | null;
    loading: boolean;
    fromContext?: { listingId?: string; bidId?: string } | null;
  }>({ open: false, invoice: null, loading: false, fromContext: null });

  async function fetchBought() {
    setBusy(true);
    try {
      const res = await financerActions.fetchBought();
      setBought(res.data);
    } finally {
      setBusy(false);
    }
  }

  async function openInvoice(
    invoiceId: string,
    context?: { listingId?: string; bidId?: string }
  ) {
    console.log("openInvoice", invoiceId, context);
    setDetailsDialog({
      open: true,
      invoice: null,
      loading: true,
      fromContext: context || null,
    });
    try {
      const res = await financerActions.fetchInvoiceDetails(invoiceId);
      setDetailsDialog({
        open: true,
        invoice: res.data.invoice,
        loading: false,
        fromContext: context || null,
      });

      console.log(res.data);
    } catch {
      setDetailsDialog({
        open: true,
        invoice: null,
        loading: false,
        fromContext: context || null,
      });
    }
  }

  async function addBalance() {
    const amountNum = Number(addDialog.amount);
    if (!amountNum || amountNum <= 0) return;
    setBusy(true);
    try {
      await financerActions.addBalance(amountNum);
      await refresh();
      setAddDialog({ open: false, amount: "" });
    } finally {
      setBusy(false);
    }
  }

  async function cancelBid(listingId: string, bidId: string) {
    setBusy(true);
    try {
      await financerActions.cancelBid(listingId, bidId);
      setData((prev) => {
        if (!prev) return prev;
        const nextBids = prev.bids
          .map((b) => {
            if (b.listingId !== listingId) return b;
            const active = b.activeBids.filter((ab) => ab.bidId !== bidId);
            return { ...b, activeBids: active };
          })
          .filter((b) => b.activeBids.length > 0);
        return { ...prev, bids: nextBids };
      });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (activeTab === "bought") fetchBought();
  }, [activeTab]);

  const profileCard = overview?.financer;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-2xl font-semibold text-white">Financer</div>
          <div className="text-sm text-white/60">Dashboard</div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/marketplace")}
            className="rounded-md bg-blue-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-400"
          >
            Go to marketplace
          </button>
          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white/80">
            <span className="text-white/60">Balance:</span>
            <span className="ml-2 font-semibold text-white">
              ₹{(profileCard?.balance || 0).toLocaleString()}
            </span>
            <span className="ml-3 text-white/60">Locked:</span>
            <span className="ml-2 font-medium text-white/90">
              ₹{(profileCard?.lockedBalance || 0).toLocaleString()}
            </span>
          </div>
          <button
            onClick={() => setAddDialog({ open: true, amount: "" })}
            className="rounded-md bg-emerald-400 px-3 py-1.5 text-sm font-semibold text-black hover:bg-emerald-300"
          >
            Add money
          </button>
        </div>
      </div>

      <div className="mb-5 flex items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              activeTab === t
                ? "bg-white text-black"
                : "bg-white/10 text-white/70 hover:bg-white/15"
            }`}
          >
            {t === "profile"
              ? "Profile"
              : t === "bids"
              ? "My bids"
              : "Bought invoices"}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        {loading ? (
          <div className="text-white/60">Loading…</div>
        ) : error ? (
          <div className="text-red-300">{error}</div>
        ) : activeTab === "profile" ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-black/30 p-4">
              <div className="mb-2 text-sm font-semibold text-white/80">
                Basic
              </div>
              <div className="text-sm text-white/80">
                <div>
                  <span className="text-white/60">Name:</span>{" "}
                  {profileCard?.profile?.firstName}{" "}
                  {profileCard?.profile?.lastName}
                </div>
                <div>
                  <span className="text-white/60">Company:</span>{" "}
                  {profileCard?.profile?.companyName || "—"}
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-4">
              <div className="mb-2 text-sm font-semibold text-white/80">
                Address
              </div>
              <div className="text-sm text-white/80">
                <div>{profileCard?.profile?.address?.street || "—"}</div>
                <div>
                  {profileCard?.profile?.address?.city || "—"},{" "}
                  {profileCard?.profile?.address?.state || "—"}
                </div>
                <div>
                  {profileCard?.profile?.address?.country || "—"}{" "}
                  {profileCard?.profile?.address?.zipCode || ""}
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-4">
              <div className="mb-2 text-sm font-semibold text-white/80">
                Stats
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-white">
                <div className="rounded-md bg-white/5 p-3">
                  <div className="text-xs text-white/60">Bids</div>
                  <div className="text-lg font-semibold">
                    {overview?.financer.stats.bidsPlaced || 0}
                  </div>
                </div>
                <div className="rounded-md bg-white/5 p-3">
                  <div className="text-xs text-white/60">Won</div>
                  <div className="text-lg font-semibold">
                    {overview?.financer.stats.invoicesWon || 0}
                  </div>
                </div>
                <div className="rounded-md bg-white/5 p-3">
                  <div className="text-xs text-white/60">Financed</div>
                  <div className="text-lg font-semibold">
                    ₹
                    {(
                      overview?.financer.stats.totalFinanced || 0
                    ).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-4">
              <div className="mb-2 text-sm font-semibold text-white/80">
                Active bids summary
              </div>
              {overview && overview.bids.length > 0 ? (
                <ul className="divide-y divide-white/10">
                  {overview.bids.map((b) => (
                    <li
                      key={b.listingId}
                      className="flex items-center justify-between py-3 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-white">
                          Invoice: {b.invoiceId}
                        </div>
                        <div className="text-white/60">
                          Highest: ₹{b.highestOnListing.toLocaleString()} • Your
                          max: ₹{b.myHighestBid.toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/marketplace`)}
                          className="rounded-md px-2 py-1 text-xs text-white/90 ring-1 ring-white/15 hover:bg-white/5"
                        >
                          Go to marketplace
                        </button>
                        {b.activeBids[0] ? (
                          <button
                            onClick={() =>
                              cancelBid(b.listingId, b.activeBids[0].bidId)
                            }
                            className="rounded-md bg-red-500/80 px-2 py-1 text-xs font-semibold text-black hover:bg-red-400"
                          >
                            Cancel bid
                          </button>
                        ) : null}
                        <button
                          onClick={() =>
                            openInvoice(b.invoiceId, {
                              listingId: b.listingId,
                              bidId: b.activeBids[0]?.bidId,
                            })
                          }
                          className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-black"
                        >
                          View
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-white/60">No active bids.</div>
              )}
            </div>
          </div>
        ) : activeTab === "bids" ? (
          <div>
            {overview && overview.bids.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {overview.bids.map((b) => (
                  <div
                    key={b.listingId}
                    className="rounded-lg border border-white/10 bg-black/30 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-white">Invoice: {b.invoiceId}</div>
                      <div className="text-sm text-white/60">
                        Highest: ₹{b.highestOnListing.toLocaleString()} • Your
                        max: ₹{b.myHighestBid.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {b.activeBids.map((ab) => (
                        <div
                          key={ab.bidId}
                          className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80"
                        >
                          <span>Bid: ₹{ab.amount.toLocaleString()}</span>
                          <span className="text-white/50">• {ab.status}</span>
                          <button
                            onClick={() => cancelBid(b.listingId, ab.bidId)}
                            className="rounded bg-red-500/80 px-2 py-0.5 text-[11px] font-semibold text-black hover:bg-red-400"
                          >
                            Withdraw
                          </button>
                          <button
                            onClick={() =>
                              openInvoice(b.invoiceId, {
                                listingId: b.listingId,
                                bidId: ab.bidId,
                              })
                            }
                            className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-black"
                          >
                            View details
                          </button>
                        </div>
                      ))}
                      <Link href="/marketplace">
                        <button
                          // onClick={() => router.push(`/marketplace`)}
                          className="ml-auto rounded-md px-2 py-1 text-xs text-white/90 ring-1 ring-white/15 hover:bg-white/5"
                        >
                          Go to marketplace
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-white/60">You have no active bids.</div>
            )}
          </div>
        ) : (
          <div>
            {busy && !bought ? (
              <div className="text-white/60">Loading…</div>
            ) : !bought || bought.boughtInvoices.length === 0 ? (
              <div className="text-white/60">No bought invoices yet.</div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {bought.boughtInvoices.map((bi, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-white/10 bg-black/30 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <div className="text-white">
                        {bi.invoice?.invoiceNumber || bi.invoice?._id}
                      </div>
                      <div className="text-white/60">
                        ₹{(bi.amount || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-xs text-white/60">
                      From: {bi.organization?.name || "—"}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => openInvoice(bi.invoice?._id || "")}
                        className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-black"
                      >
                        View invoice
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {addDialog.open ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-black/70 p-6">
            <div className="mb-3 text-lg font-semibold text:white">
              Add balance
            </div>
            <input
              type="number"
              value={addDialog.amount}
              onChange={(e) =>
                setAddDialog({ ...addDialog, amount: e.target.value })
              }
              className="mb-4 w-full rounded-md border border:white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring:white/20"
              placeholder="Enter amount"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setAddDialog({ open: false, amount: "" })}
                className="rounded-md px-3 py-1.5 text-sm text-white/90 ring-1 ring-white/15 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={addBalance}
                className="rounded-md bg-emerald-400 px-3 py-1.5 text-sm font-semibold text-black hover:bg-emerald-300"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detailsDialog.open ? (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-white/10 bg-black/70">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <div className="text-sm font-semibold text-white">
                Invoice details
              </div>
              <div className="flex items-center gap-2">
                {detailsDialog.fromContext?.listingId ? (
                  <button
                    onClick={() =>
                      router.push(
                        `/marketplace/${detailsDialog.invoice?._id}/${detailsDialog.fromContext?.listingId}`
                      )
                    }
                    className="rounded-md px-2 py-1 text-xs text-white/90 ring-1 ring-white/15 hover:bg-white/5"
                  >
                    Go to marketplace
                  </button>
                ) : null}
                {detailsDialog.fromContext?.listingId &&
                detailsDialog.fromContext?.bidId ? (
                  <button
                    onClick={() => {
                      if (!detailsDialog.fromContext) return;
                      cancelBid(
                        detailsDialog.fromContext.listingId!,
                        detailsDialog.fromContext.bidId!
                      );
                      setDetailsDialog((prev) => ({ ...prev, open: false }));
                    }}
                    className="rounded-md bg-red-500/80 px-2 py-1 text-xs font-semibold text-black hover:bg-red-400"
                  >
                    Withdraw bid
                  </button>
                ) : null}
                <button
                  onClick={() =>
                    setDetailsDialog({
                      open: false,
                      invoice: null,
                      loading: false,
                      fromContext: null,
                    })
                  }
                  className="rounded-md px-2 py-1 text-xs text:white/90 ring-1 ring-white/15 hover:bg-white/5"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="max-h-[80vh] overflow-y-auto p-5">
              {detailsDialog.loading ? (
                <div className="text-white/60">Loading…</div>
              ) : !detailsDialog.invoice ? (
                <div className="text-white/60">No invoice found.</div>
              ) : (
                <div className="rounded-lg border border:white/10 bg-white p-6 text-black">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <div className="text-xl font-semibold">Invoice</div>
                      <div className="text-sm text-black/60">
                        #{detailsDialog.invoice.invoiceNumber}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div>
                        <span className="text-black/60">Issue:</span>{" "}
                        {new Date(
                          detailsDialog.invoice.issueDate
                        ).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="text-black/60">Due:</span>{" "}
                        {new Date(
                          detailsDialog.invoice.dueDate
                        ).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="text-black/60">Status:</span>{" "}
                        {detailsDialog.invoice.status}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-black/60">Billed By</div>
                      <div className="font-medium">
                        {detailsDialog.invoice.organization?.name || "—"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-black/60">Billed To</div>
                      <div className="font-medium">
                        {detailsDialog.invoice.customer
                          ? `${
                              detailsDialog.invoice.customer.firstName || ""
                            } ${
                              detailsDialog.invoice.customer.lastName || ""
                            }`.trim()
                          : "—"}
                      </div>
                      <div className="text-xs text-black/60">
                        {detailsDialog.invoice.customer?.user?.email || ""}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 overflow-hidden rounded-md border border:black/10">
                    <table className="w-full text-sm">
                      <thead className="bg-black/5">
                        <tr>
                          <th className="px-3 py-2 text-left">Description</th>
                          <th className="px-3 py-2 text-right">Qty</th>
                          <th className="px-3 py-2 text-right">Unit</th>
                          <th className="px-3 py-2 text-right">Discount</th>
                          <th className="px-3 py-2 text-right">Tax</th>
                          <th className="px-3 py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailsDialog.invoice.items.map((it, idx) => (
                          <tr key={idx} className="odd:bg-black/2">
                            <td className="px-3 py-2">{it.description}</td>
                            <td className="px-3 py-2 text-right">
                              {it.quantity}
                            </td>
                            <td className="px-3 py-2 text-right">
                              ₹{it.unitPrice.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {it.discount}%
                            </td>
                            <td className="px-3 py-2 text-right">{it.tax}%</td>
                            <td className="px-3 py-2 text-right">
                              ₹{it.total.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-start justify-end gap-6 text-sm">
                    <div>
                      <div className="flex items-center justify-between gap-10">
                        <div className="text-black/60">Subtotal</div>
                        <div className="font-medium">
                          ₹{detailsDialog.invoice.subtotal.toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items:center justify-between gap-10">
                        <div className="text-black/60">Discount</div>
                        <div className="font-medium">
                          ₹
                          {detailsDialog.invoice.discountAmount.toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-10">
                        <div className="text-black/60">Tax</div>
                        <div className="font-medium">
                          ₹{detailsDialog.invoice.taxAmount.toLocaleString()}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-10 border-t border-black/10 pt-2 text-base">
                        <div className="font-semibold">Total</div>
                        <div className="font-semibold">
                          ₹{detailsDialog.invoice.totalAmount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {detailsDialog.invoice.notes ? (
                    <div className="mt-4 rounded-md border border-black/10 bg-black/5 p-3 text-sm">
                      <div className="text-black/60">Notes</div>
                      <div>{detailsDialog.invoice.notes}</div>
                    </div>
                  ) : null}

                  {detailsDialog.invoice.termsAndConditions ? (
                    <div className="mt-3 text-xs text-black/60">
                      {detailsDialog.invoice.termsAndConditions}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <LoaderOverlay show={busy} title="Working" />
    </div>
  );
}
