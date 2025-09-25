"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [self, setSelf] = useState<Self | null>(null);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [myBids, setMyBids] = useState<
    Record<string, { bidId: string; amount: number }>
  >({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addAmt, setAddAmt] = useState(0);

  const [openId, setOpenId] = useState<string | null>(null);
  const [pct, setPct] = useState<string>("");
  const [amt, setAmt] = useState<string>("");
  const [placing, setPlacing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    async function load() {
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
    load();
  }, []);

  const selected = useMemo(
    () => listings.find((l) => String(l._id) === String(openId)) || null,
    [listings, openId]
  );
  const invoiceTotal = selected?.invoice.totalAmount || 0;
  const pctToAmt = (p: number) => Math.round((p / 100) * invoiceTotal);

  function openDialog(id: string) {
    setOpenId(id);
    setPct("");
    setAmt("");
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

  const alreadyBid = selected ? myBids[String(selected._id)] : undefined;

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
    selected &&
    !alreadyBid &&
    Number(amt) > 0 &&
    Number(amt) <= invoiceTotal &&
    Number(pct) > 0 &&
    Number(pct) <= 100;

  async function placeBid() {
    if (!selected) return;
    const amount = Number(amt);
    if (!isFinite(amount) || amount <= 0) return;
    setPlacing(true);
    setErr(null);
    try {
      // optimistic: update myBids and listing bids locally
      setMyBids((m) => ({
        ...m,
        [String(selected._id)]: { bidId: "pending", amount },
      }));
      const res = await placeMarketplaceBid(String(selected._id), amount);
      const updated = res.data.listing;
      setListings((ls) =>
        ls.map((l) => (String(l._id) === String(updated._id) ? updated : l))
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
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to place bid";
      setErr(message);
      setMyBids((m) => {
        const copy = { ...m };
        delete copy[String(selected._id)];
        return copy;
      });
    } finally {
      setPlacing(false);
    }
  }

  async function cancelBid() {
    if (!selected) return;
    const mb = myBids[String(selected._id)];
    if (!mb) return;
    setCancelling(true);
    setErr(null);
    try {
      await cancelMarketplaceBid(String(selected._id), String(mb.bidId));
      // optimistic: mark my bid removed and update listing bids status
      setListings((ls) =>
        ls.map((l) => {
          if (String(l._id) !== String(selected._id)) return l;
          return {
            ...l,
            bids: l.bids.map((b) =>
              String(b._id) === String(mb.bidId)
                ? { ...b, status: "cancelled" }
                : b
            ),
          };
        })
      );
      setMyBids((m) => {
        const copy = { ...m };
        delete copy[String(selected._id)];
        return copy;
      });
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
          </div>
        </div>
      )}

      {/* Listings grid */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-100">
          Open Marketplace
        </h2>
        <div className="text-sm text-zinc-400">{listings.length} listings</div>
      </div>

      {listings.length === 0 ? (
        <div className="text-center text-zinc-500 py-20">
          No listings available right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {listings.map((l) => {
            const totalBids = l.bids.length;
            const my = myBids[String(l._id)];
            const orgName =
              typeof l.organization === "string"
                ? ""
                : l.organization?.name || "";
            return (
              <div
                key={String(l._id)}
                className={`rounded-xl border p-5 cursor-pointer transition-all ${
                  my
                    ? "border-emerald-600/50 bg-emerald-950/10 hover:bg-emerald-950/20"
                    : "border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/50"
                }`}
                onClick={() => openDialog(String(l._id))}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-zinc-400">Invoice</div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      my
                        ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                    }`}
                  >
                    {my ? "Bidded" : "Open"}
                  </span>
                </div>
                <div className="text-zinc-100 font-medium">
                  {l.invoice.invoiceNumber}
                </div>
                <div className="text-2xl font-bold text-zinc-100 mt-1">
                  {formatCurrency(l.invoice.totalAmount)}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-zinc-300">
                  <div>
                    <span className="text-zinc-400">Organization</span>
                    <div className="truncate">{orgName || "—"}</div>
                  </div>
                  <div>
                    <span className="text-zinc-400">Total Bids</span>
                    <div>{totalBids}</div>
                  </div>
                </div>
                {my ? (
                  <div className="mt-3 text-xs text-emerald-300">
                    Your bid: {formatCurrency(my.amount)}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      {selected && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpenId(null)}
          />
          <div className="absolute left-1/2 top-10 -translate-x-1/2 w-[min(780px,95vw)] rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-zinc-400">Invoice</div>
                <div className="text-xl font-semibold text-zinc-100">
                  {selected.invoice.invoiceNumber}
                </div>
                <div className="text-3xl font-bold text-zinc-100 mt-1">
                  {formatCurrency(selected.invoice.totalAmount)}
                </div>
                <div className="text-sm text-zinc-400 mt-1">
                  Organization:{" "}
                  {typeof selected.organization === "string"
                    ? "—"
                    : selected.organization?.name || "—"}
                </div>
              </div>
              <button
                className="text-zinc-400 hover:text-zinc-200"
                onClick={() => setOpenId(null)}
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <div className="text-sm text-zinc-300 mb-2">Bids</div>
                  <div className="space-y-2 max-h-44 overflow-auto pr-1">
                    {selected.bids.length === 0 ? (
                      <div className="text-sm text-zinc-500">
                        No bids yet. Be the first to bid.
                      </div>
                    ) : (
                      selected.bids.map((b) => {
                        const name =
                          b.financer?.profile?.companyName ||
                          [
                            b.financer?.profile?.firstName,
                            b.financer?.profile?.lastName,
                          ]
                            .filter(Boolean)
                            .join(" ") ||
                          "Financer";
                        const tag =
                          b.status === "active"
                            ? "text-emerald-300"
                            : b.status === "cancelled"
                            ? "text-zinc-500"
                            : b.status === "rejected"
                            ? "text-red-300"
                            : "text-blue-300";
                        return (
                          <div
                            key={String(b._id)}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className={`truncate ${tag}`}>{name}</div>
                            <div className={`font-medium ${tag}`}>
                              {formatCurrency(b.amount)}
                            </div>
                          </div>
                        );
                      })
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
    </div>
  );
}
