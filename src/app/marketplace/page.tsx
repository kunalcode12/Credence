"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  type MarketplaceListing,
  getMarketplaceListings,
  placeMarketplaceBid,
} from "@/lib/api";
import {
  getFinancerSelf,
  addFinancerBalance,
  getMyBids,
  cancelMarketplaceBid,
  type FinancerSelfResponse,
  type MyBidsResponse,
} from "@/lib/financer";

type Self = {
  financerId: string;
  name: string;
  email: string;
  balance: number;
  lockedBalance: number;
};

export default function MarketplacePage() {
  const router = useRouter();
  const [self, setSelf] = useState<Self | null>(null);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [myBids, setMyBids] = useState<
    Record<string, { bidId: string; amount: number }>
  >({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addAmt, setAddAmt] = useState(0);

  const [openBidsId, setOpenBidsId] = useState<string | null>(null);
  const [openInvoiceId, setOpenInvoiceId] = useState<string | null>(null);
  const [pct, setPct] = useState<string>("");
  const [amt, setAmt] = useState<string>("");
  const [placing, setPlacing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    setLoading(true);
    setErr(null);
    try {
      const [selfRes, listRes, myBidsRes]: [
        FinancerSelfResponse,
        { success: boolean; data: { listings: MarketplaceListing[] } },
        MyBidsResponse
      ] = await Promise.all([
        getFinancerSelf(),
        getMarketplaceListings(),
        getMyBids(),
      ]);
      setSelf(selfRes.data);
      setListings(listRes.data.listings);
      console.log("listRes", listRes.data);
      console.log("myBidsRes", myBidsRes.data);
      const map: Record<string, { bidId: string; amount: number }> = {};
      const myId = selfRes.data.financerId;
      for (const l of myBidsRes.data.listings) {
        const my = l.bids.find((b) =>
          typeof b.financer === "string"
            ? String(b.financer) === myId
            : String((b.financer as { _id: string })._id) === myId
        );
        if (my)
          map[String(l._id)] = { bidId: String(my._id), amount: my.amount };
      }
      setMyBids(map);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to load marketplace";
      setErr(message);
    } finally {
      setLoading(false);
    }
  }

  const selectedBids = useMemo(
    () => listings.find((l) => String(l._id) === String(openBidsId)) || null,
    [listings, openBidsId]
  );
  const selectedInvoice = useMemo(
    () => listings.find((l) => String(l._id) === String(openInvoiceId)) || null,
    [listings, openInvoiceId]
  );
  const invoiceTotal = selectedBids?.invoice.totalAmount || 0;
  const pctToAmt = (p: number) => Math.round((p / 100) * invoiceTotal);

  function openBidsDialog(id: string) {
    setOpenBidsId(id);
    setPct("");
    setAmt("");
  }
  function openInvoiceDialog(id: string) {
    setOpenInvoiceId(id);
  }

  async function onAddBalance() {
    if (!addAmt || addAmt <= 0) return;
    setAdding(true);
    try {
      const res = await addFinancerBalance(addAmt);
      setSelf((s) => (s ? { ...s, balance: res.data.balance } : s));
      setAddAmt(0);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to add balance";
      setErr(message);
    } finally {
      setAdding(false);
    }
  }

  function formatCurrency(n: number) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);
  }

  const alreadyBid = selectedBids
    ? myBids[String(selectedBids._id)]
    : undefined;

  function onPctChange(v: string) {
    setPct(v);
    const p = Number(v);
    if (!isFinite(p)) return;
    const a = Math.min(100, Math.max(0, p));
    const amount = pctToAmt(a);
    setAmt(String(amount || ""));
  }
  function onAmtChange(v: string) {
    setAmt(v);
    const a = Number(v);
    if (!isFinite(a) || invoiceTotal <= 0) return;
    const capped = Math.min(invoiceTotal, Math.max(0, a));
    const p = Math.round((capped / invoiceTotal) * 100);
    setPct(String(p || ""));
  }

  const canPlace =
    selectedBids &&
    !alreadyBid &&
    Number(amt) > 0 &&
    Number(amt) <= invoiceTotal &&
    Number(pct) > 0 &&
    Number(pct) <= 100;

  async function placeBid() {
    if (!selectedBids) return;
    const amount = Number(amt);
    if (!isFinite(amount) || amount <= 0) return;
    setPlacing(true);
    setErr(null);
    try {
      // optimistic: update myBids and listing bids locally
      setMyBids((m) => ({
        ...m,
        [String(selectedBids._id)]: { bidId: "pending", amount },
      }));
      const res = await placeMarketplaceBid(String(selectedBids._id), amount);
      const updated = res.data.listing as any;
      // Enrich last bid with current financer details if not populated
      if (self) {
        const last = updated?.bids?.[updated.bids.length - 1];
        const lastFin = last?.financer;
        const myId = self.financerId;
        const isMine =
          typeof lastFin === "string"
            ? String(lastFin) === myId
            : String(lastFin?._id) === myId;
        if (isMine && typeof lastFin === "string") {
          last.financer = {
            _id: lastFin,
            profile: { companyName: self.name },
            user: { email: self.email },
          };
        }
      }
      setListings((ls) =>
        ls.map((l) =>
          String(l._id) === String(updated._id) ? (updated as any) : l
        )
      );
      const my = updated.bids[updated.bids.length - 1];
      setMyBids((m) => ({
        ...m,
        [String(updated._id)]: { bidId: String(my._id), amount: my.amount },
      }));
      // update balances locally if present
      setSelf((s) =>
        s
          ? {
              ...s,
              balance: Math.max(0, s.balance - amount),
              lockedBalance: (s.lockedBalance || 0) + amount,
            }
          : s
      );
      // Rehydrate listings to ensure financer names stay populated from backend
      try {
        const fresh = await getMarketplaceListings();
        setListings(fresh.data.listings);
      } catch (_) {}
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to place bid";
      setErr(message);
      setMyBids((m) => {
        const copy = { ...m };
        delete copy[String(selectedBids._id)];
        return copy;
      });
    } finally {
      setPlacing(false);
    }
  }

  async function cancelBid() {
    if (!selectedBids) return;
    const mb = myBids[String(selectedBids._id)];
    if (!mb) return;
    setCancelling(true);
    setErr(null);
    try {
      await cancelMarketplaceBid(String(selectedBids._id), String(mb.bidId));
      // optimistic: remove my bid entirely from the listing locally
      setListings((ls) =>
        ls.map((l) => {
          if (String(l._id) !== String(selectedBids._id)) return l;
          return {
            ...l,
            bids: l.bids.filter((b) => String(b._id) !== String(mb.bidId)),
          };
        })
      );
      setMyBids((m) => {
        const copy = { ...m };
        delete copy[String(selectedBids._id)];
        return copy;
      });
      // Optimistically unlock funds back to available balance
      setSelf((s) =>
        s
          ? {
              ...s,
              balance: (s.balance || 0) + (mb.amount || 0),
              lockedBalance: Math.max(
                0,
                (s.lockedBalance || 0) - (mb.amount || 0)
              ),
            }
          : s
      );
      // refresh listings to ensure financer names stay populated from backend
      try {
        const fresh = await getMarketplaceListings();
        setListings(fresh.data.listings);
      } catch (_) {}
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to cancel bid";
      setErr(message);
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="px-6 py-10 text-center text-zinc-400">
        Loading marketplace…
      </div>
    );
  }

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {err ? (
        <div className="mb-4 rounded-md border border-red-500/30 bg-red-950/20 text-red-300 px-4 py-3 text-sm">
          {err}
        </div>
      ) : null}

      {/* Financer header */}
      {self && (
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
            <div className="text-zinc-300 text-sm">Logged in as</div>
            <div className="text-lg font-semibold text-zinc-100">
              {self.name}
            </div>
            <div className="text-zinc-400 text-sm">{self.email}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
            <div className="text-zinc-300 text-sm">Available Balance</div>
            <div className="text-2xl font-bold text-emerald-400">
              {formatCurrency(self.balance || 0)}
            </div>
            <div className="text-zinc-400 text-xs">
              Locked: {formatCurrency(self.lockedBalance || 0)}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5 flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm text-zinc-300 mb-1">
                Add funds
              </label>
              <input
                value={addAmt || ""}
                onChange={(e) => setAddAmt(Number(e.target.value))}
                type="number"
                min={1}
                className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                placeholder="Enter amount"
              />
            </div>
            <button
              onClick={onAddBalance}
              disabled={adding || !addAmt || addAmt <= 0}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white"
            >
              {adding ? "Adding…" : "Add"}
            </button>
            <button
              onClick={() => router.push(`/financer/${self.financerId}`)}
              className="ml-auto rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100"
            >
              Go to profile
            </button>
          </div>
        </div>
      )}

      {/* Listings grid */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-100">
          Open Marketplace
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => self && router.push(`/financer/${self.financerId}`)}
            disabled={!self}
            className="rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-3 py-1.5 text-sm text-zinc-100"
          >
            Go back to profile
          </button>
          <button
            onClick={loadAll}
            className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-sm text-zinc-100"
          >
            Refresh
          </button>
          <div className="text-sm text-zinc-400">
            {listings.length} listings
          </div>
        </div>
      </div>

      {listings.length === 0 ? (
        <div className="text-center text-zinc-500 py-20">
          No listings available right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {listings.map((l) => {
            const inv = l.invoice as any;
            const totalBids = l.bids.filter(
              (b) => b.status !== "cancelled"
            ).length;
            const my = myBids[String(l._id)];
            const orgName =
              typeof l.organization === "string"
                ? ""
                : l.organization?.name || "";
            return (
              <div
                key={String(l._id)}
                className={`group relative rounded-xl border p-5 transition-all ${
                  my
                    ? "border-emerald-600/50 bg-emerald-950/10 hover:bg-emerald-950/20"
                    : "border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/50"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-xs text-zinc-400">Invoice</div>
                    <div className="text-zinc-100 font-semibold">
                      {l.invoice.invoiceNumber}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full border ${
                      my
                        ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/30"
                        : "bg-zinc-800 text-zinc-300 border-zinc-700"
                    }`}
                  >
                    {my ? "Bidded" : l.isOpen ? "Open" : "Closed"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm text-zinc-300">
                  <div>
                    <div className="text-zinc-400">Issue</div>
                    <div>
                      {inv?.issueDate
                        ? new Date(inv.issueDate).toLocaleDateString()
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-400">Due</div>
                    <div>
                      {inv?.dueDate
                        ? new Date(inv.dueDate).toLocaleDateString()
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-400">Subtotal</div>
                    <div>{formatCurrency(inv?.subtotal || 0)}</div>
                  </div>
                  <div>
                    <div className="text-zinc-400">Taxes</div>
                    <div>{formatCurrency(inv?.taxAmount || 0)}</div>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
                  <div className="flex items-center justify-between px-3 py-2 text-xs text-zinc-400">
                    <span>Items ({(inv?.items || []).length})</span>
                    <span className="text-zinc-500">
                      Discount: {formatCurrency(inv?.discountAmount || 0)}
                    </span>
                  </div>
                  <div className="divide-y divide-zinc-800">
                    {(inv?.items || [])
                      .slice(0, 3)
                      .map((it: any, idx: number) => (
                        <div
                          key={idx}
                          className="px-3 py-2 text-xs text-zinc-300 flex items-center justify-between"
                        >
                          <div className="truncate max-w-[60%] text-zinc-100">
                            {it?.description}
                          </div>
                          <div className="text-zinc-400">
                            {it?.quantity} ×{" "}
                            {formatCurrency(it?.unitPrice || 0)}
                          </div>
                        </div>
                      ))}
                    {(inv?.items || []).length > 3 ? (
                      <div className="px-3 py-2 text-[11px] text-zinc-500">
                        +{(inv?.items || []).length - 3} more
                      </div>
                    ) : null}
                  </div>
                  <div className="px-3 py-2 text-sm text-zinc-200 flex items-center justify-between">
                    <div className="text-zinc-400">Total</div>
                    <div className="font-semibold">
                      {formatCurrency(inv?.totalAmount || 0)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <div className="text-zinc-400">
                    Bids: <span className="text-zinc-100">{totalBids}</span>
                  </div>
                  {my ? (
                    <div className="text-xs text-emerald-300">
                      Your bid: {formatCurrency(my.amount)}
                    </div>
                  ) : (
                    <div />
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => openInvoiceDialog(String(l._id))}
                    className="rounded-md bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-100"
                  >
                    See invoice
                  </button>
                  <button
                    onClick={() => openBidsDialog(String(l._id))}
                    className="rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Bids
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bids Dialog */}
      {selectedBids && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpenBidsId(null)}
          />
          <div className="absolute left-1/2 top-10 -translate-x-1/2 w-[min(780px,95vw)] rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-zinc-400">Invoice</div>
                <div className="text-xl font-semibold text-zinc-100">
                  {selectedBids.invoice.invoiceNumber}
                </div>
                <div className="text-3xl font-bold text-zinc-100 mt-1">
                  {formatCurrency(selectedBids.invoice.totalAmount)}
                </div>
                <div className="text-sm text-zinc-400 mt-1">
                  Organization:{" "}
                  {typeof selectedBids.organization === "string"
                    ? "—"
                    : selectedBids.organization?.name || "—"}
                </div>
              </div>
              <button
                className="text-zinc-400 hover:text-zinc-200"
                onClick={() => setOpenBidsId(null)}
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <div className="text-sm text-zinc-300 mb-2">Bids</div>
                  <div className="space-y-2 max-h-60 overflow-auto pr-1">
                    {selectedBids.bids.filter((b) => b.status !== "cancelled")
                      .length === 0 ? (
                      <div className="text-sm text-zinc-500">
                        No bids yet. Be the first to bid.
                      </div>
                    ) : (
                      (() => {
                        const myId = self?.financerId || "";
                        const sorted = [...selectedBids.bids]
                          .filter((b) => b.status !== "cancelled")
                          .sort((a, b) => b.amount - a.amount);
                        const ranked = sorted.map((b, i) => ({
                          ...b,
                          rank: i + 1,
                        }));
                        const myBidIndex = ranked.findIndex((b) => {
                          const f = b.financer as any;
                          return typeof f === "string"
                            ? String(f) === myId
                            : String(f?._id) === myId;
                        });
                        const display =
                          myBidIndex >= 0
                            ? [
                                ranked[myBidIndex],
                                ...ranked.filter((_, i) => i !== myBidIndex),
                              ]
                            : ranked;
                        return display.map((b, idx) => {
                          const f = (b.financer as any) || {};
                          const prof = f.profile || {};
                          const user = f.user || {};
                          const isMine =
                            myId &&
                            (typeof (b.financer as any) === "string"
                              ? String(b.financer as any) === myId
                              : String((b.financer as any)?._id) === myId);
                          const name = isMine
                            ? self?.name ||
                              prof.companyName ||
                              [prof.firstName, prof.lastName]
                                .filter(Boolean)
                                .join(" ") ||
                              user.name ||
                              "Financer"
                            : prof.companyName ||
                              [prof.firstName, prof.lastName]
                                .filter(Boolean)
                                .join(" ") ||
                              user.name ||
                              "Financer";
                          const tag =
                            b.status === "active"
                              ? isMine
                                ? "text-emerald-300"
                                : "text-zinc-200"
                              : b.status === "cancelled"
                              ? "text-zinc-500"
                              : b.status === "rejected"
                              ? "text-red-300"
                              : "text-blue-300";
                          return (
                            <div
                              key={String((b as any)._id)}
                              className={`flex items-center justify-between text-sm rounded-md border px-3 py-2 ${
                                isMine
                                  ? "border-emerald-600/40 bg-emerald-950/20"
                                  : "border-zinc-800 bg-zinc-900/40"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`grid h-6 w-6 place-items-center rounded-full text-xs ${
                                    isMine
                                      ? "bg-emerald-600/30 text-emerald-200"
                                      : "bg-zinc-800 text-zinc-300"
                                  }`}
                                >
                                  {b.rank}
                                </div>
                                <div className={`truncate ${tag}`}>{name}</div>
                              </div>
                              <div className={`font-medium ${tag}`}>
                                {formatCurrency(b.amount)}
                              </div>
                            </div>
                          );
                        });
                      })()
                    )}
                  </div>
                </div>
              </div>
              <div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                  {alreadyBid ? (
                    <>
                      <div className="text-sm text-zinc-300 mb-2">Your bid</div>
                      <div className="text-2xl font-semibold text-emerald-300">
                        {formatCurrency(alreadyBid.amount)}
                      </div>
                      <button
                        onClick={cancelBid}
                        disabled={cancelling}
                        className="mt-4 w-full rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white"
                      >
                        {cancelling ? "Cancelling…" : "Cancel bid"}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-sm text-zinc-300">Place a bid</div>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">
                            Percentage (%)
                          </label>
                          <input
                            value={pct}
                            onChange={(e) => onPctChange(e.target.value)}
                            type="number"
                            min={0}
                            max={100}
                            className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                            placeholder="e.g. 80"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">
                            Amount
                          </label>
                          <input
                            value={amt}
                            onChange={(e) => onAmtChange(e.target.value)}
                            type="number"
                            min={0}
                            max={invoiceTotal}
                            className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                            placeholder="e.g. 40000"
                          />
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-zinc-400">
                        Max: 100% or {formatCurrency(invoiceTotal)}
                      </div>
                      <button
                        onClick={placeBid}
                        disabled={!canPlace || placing}
                        className="mt-4 w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white"
                      >
                        {placing ? "Placing…" : "Place bid"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Details Dialog */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpenInvoiceId(null)}
          />
          <div className="absolute left-1/2 top-10 -translate-x-1/2 w-[min(820px,95vw)] rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-zinc-400">Invoice</div>
                {(() => {
                  const inv = selectedInvoice.invoice as any;
                  return (
                    <>
                      <div className="text-xl font-semibold text-zinc-100">
                        {inv?.invoiceNumber}
                      </div>
                      <div className="text-3xl font-bold text-zinc-100 mt-1">
                        {formatCurrency(inv?.totalAmount || 0)}
                      </div>
                    </>
                  );
                })()}
                <div className="text-sm text-zinc-400 mt-1">
                  Organization:{" "}
                  {typeof selectedInvoice.organization === "string"
                    ? "—"
                    : selectedInvoice.organization?.name || "—"}
                </div>
              </div>
              <button
                className="text-zinc-400 hover:text-zinc-200"
                onClick={() => setOpenInvoiceId(null)}
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {(() => {
                const inv = selectedInvoice.invoice as any;
                return (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-zinc-400">Issue date</div>
                      <div className="text-zinc-200">
                        {inv?.issueDate
                          ? new Date(inv.issueDate).toLocaleString()
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-400">Due date</div>
                      <div className="text-zinc-200">
                        {inv?.dueDate
                          ? new Date(inv.dueDate).toLocaleString()
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-400">Payment terms</div>
                      <div className="text-zinc-200">
                        {inv?.paymentTerms ?? "—"}{" "}
                        {inv?.paymentTerms ? "days" : ""}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-400">Status</div>
                      <div className="text-zinc-200 uppercase">
                        {inv?.status || "—"}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {(() => {
                const inv = selectedInvoice.invoice as any;
                const items = inv?.items || [];
                return (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40">
                    <div className="border-b border-zinc-800 px-4 py-2 text-sm text-zinc-300">
                      Items
                    </div>
                    <div className="divide-y divide-zinc-800">
                      {items.map((it: any, idx: number) => (
                        <div
                          key={idx}
                          className="grid grid-cols-6 items-center gap-2 px-4 py-2 text-sm"
                        >
                          <div className="col-span-3 text-zinc-100">
                            {it?.description}
                          </div>
                          <div className="text-zinc-300">
                            Qty {it?.quantity}
                          </div>
                          <div className="text-zinc-300">Tax {it?.tax}%</div>
                          <div className="text-right text-zinc-100">
                            {formatCurrency(it?.total || 0)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3 px-4 py-3 text-sm">
                      <div className="text-zinc-400">Subtotal</div>
                      <div className="text-right text-zinc-100">
                        {formatCurrency(inv?.subtotal || 0)}
                      </div>
                      <div className="text-zinc-400">Discount</div>
                      <div className="text-right text-zinc-100">
                        {formatCurrency(inv?.discountAmount || 0)}
                      </div>
                      <div className="text-zinc-400">Tax</div>
                      <div className="text-right text-zinc-100">
                        {formatCurrency(inv?.taxAmount || 0)}
                      </div>
                      <div className="text-zinc-200 font-semibold">Total</div>
                      <div className="text-right text-zinc-100 font-semibold">
                        {formatCurrency(inv?.totalAmount || 0)}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {(selectedInvoice.invoice as any)?.notes ? (
                <div className="text-sm">
                  <div className="mb-1 text-zinc-400">Notes</div>
                  <pre className="whitespace-pre-wrap rounded-lg bg-zinc-900/40 p-3 text-zinc-200">
                    {(selectedInvoice.invoice as any).notes}
                  </pre>
                </div>
              ) : null}

              {(selectedInvoice.invoice as any)?.termsAndConditions ? (
                <div className="text-sm">
                  <div className="mb-1 text-zinc-400">Terms & Conditions</div>
                  <pre className="whitespace-pre-wrap rounded-lg bg-zinc-900/40 p-3 text-zinc-200">
                    {(selectedInvoice.invoice as any).termsAndConditions}
                  </pre>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
