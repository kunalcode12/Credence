"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCustomerOverview, customerActions } from "@/hooks/useCustomer";
import { LoaderOverlay } from "@/components/ui/LoaderOverlay";
import type { InvoiceSummary } from "@/lib/customer";
import { CustomerNotifications } from "@/components/notifications/CustomerNotifications";

export default function CustomerDashboardPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { loading, error, profile, balance, invoices } = useCustomerOverview();
  const [showAdd, setShowAdd] = useState(false);
  const [amount, setAmount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"all" | "unpaid" | "paid">("all");
  const [payDialog, setPayDialog] = useState<{
    open: boolean;
    invoice: InvoiceSummary | null;
  }>({ open: false, invoice: null });

  const filteredInvoices = useMemo<InvoiceSummary[]>(() => {
    if (!invoices?.all) return [];
    if (tab === "all") return invoices.all;
    if (tab === "paid")
      return invoices.all.filter((i: InvoiceSummary) => i.status === "paid");
    return invoices.all.filter(
      (i: InvoiceSummary) => i.status !== "paid" && i.status !== "cancelled"
    );
  }, [invoices, tab]);

  useEffect(() => {
    if (!params?.id || (profile && profile.user !== params.id)) {
      // If URL id mismatches, keep as is but ideally fetch by id; backend ties to auth user
    }
  }, [params, profile]);

  async function handleAddBalance() {
    setBusy(true);
    try {
      await customerActions.addBalance(amount);
      window.location.reload();
    } finally {
      setBusy(false);
      setShowAdd(false);
      setAmount(0);
    }
  }

  function openPay(invoice: InvoiceSummary) {
    if (invoice.status === "paid") return;
    setPayDialog({ open: true, invoice });
  }

  function goPay() {
    if (!payDialog.invoice) return;
    router.push(`/customer/${params.id}/payBill/${payDialog.invoice._id}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Welcome, {profile?.firstName || "Customer"}
          </h1>
          <p className="text-sm text-white/60">
            Manage your invoices and balance
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="text-white/60 text-xs">Balance</div>
          <div className="text-lg font-semibold text-white">
            ₹ {balance?.balance?.toLocaleString?.() ?? 0}
          </div>
          <div className="text-xs text-white/50">
            Available credit: ₹{" "}
            {balance?.availableCredit?.toLocaleString?.() ?? 0}
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="mb-4 flex items-center justify-between">
        <div className="inline-flex rounded-lg border border-white/10 bg-white/5 p-1">
          {(
            [
              { key: "all", label: "All" },
              { key: "unpaid", label: "Unpaid" },
              { key: "paid", label: "Paid" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                tab === t.key
                  ? "bg-white text-black"
                  : "text-white/80 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/customer/${params.id}/updateme`)}
            className="rounded-md px-3 py-1.5 text-sm text-white/90 ring-1 ring-white/15 hover:bg-white/5"
          >
            Update profile
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-400 px-3 py-1.5 text-sm font-semibold text-black hover:bg-emerald-300"
          >
            <span className="text-base">+</span> Add money
          </button>
        </div>
      </div>

      <div className="mb-6">
        <CustomerNotifications />
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        {loading ? (
          <div className="text-white/60">Loading…</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-white/60">No invoices yet.</div>
        ) : (
          <div className="grid gap-3">
            {filteredInvoices.map((inv: InvoiceSummary) => (
              <button
                key={inv._id}
                onClick={() => openPay(inv)}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-black/40 p-4 text-left hover:bg-black/30"
              >
                <div>
                  <div className="text-sm font-semibold text-white">
                    {inv.invoiceNumber}
                  </div>
                  <div className="text-xs text-white/60">
                    Due {new Date(inv.dueDate).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-white">
                    ₹ {inv.totalAmount?.toLocaleString?.()}
                  </div>
                  <div
                    className={`text-xs ${
                      inv.status === "paid"
                        ? "text-emerald-400"
                        : "text-white/60"
                    }`}
                  >
                    {inv.status}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showAdd ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-black/70 p-6">
            <div className="mb-2 text-lg font-semibold text-white">
              Add funds
            </div>
            <input
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value || 0))}
              type="number"
              min={1}
              className="mb-4 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/20"
              placeholder="Enter amount"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAdd(false)}
                className="rounded-md px-3 py-1.5 text-sm text-white/80 ring-1 ring-white/15 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBalance}
                className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-black hover:bg-white/90"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {payDialog.open && payDialog.invoice ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-black/70 p-6">
            <div className="mb-2 text-lg font-semibold text-white">
              Invoice {payDialog.invoice.invoiceNumber}
            </div>
            <div className="mb-4 text-sm text-white/70">
              Total: ₹ {payDialog.invoice.totalAmount?.toLocaleString?.()}
              <br />
              Status: {payDialog.invoice.status}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPayDialog({ open: false, invoice: null })}
                className="rounded-md px-3 py-1.5 text-sm text-white/80 ring-1 ring-white/15 hover:bg-white/5"
              >
                Close
              </button>
              {payDialog.invoice.status !== "paid" ? (
                <button
                  onClick={goPay}
                  className="rounded-md bg-emerald-400 px-3 py-1.5 text-sm font-semibold text-black hover:bg-emerald-300"
                >
                  Pay
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <LoaderOverlay show={busy} title="Processing" subtitle="Please wait" />
    </div>
  );
}
