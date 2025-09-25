"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCustomerOverview, customerActions } from "@/hooks/useCustomer";
import { LoaderOverlay } from "@/components/ui/LoaderOverlay";
import type { InvoiceSummary } from "@/lib/customer";
import { CustomerNotifications } from "@/components/notifications/CustomerNotifications";
import { getCustomerInvoice, lookupOrganizationsByEmail } from "@/lib/customer";
import { downloadInvoicePdf } from "@/lib/invoiceDownload";

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
  const [orgQuery, setOrgQuery] = useState("");
  const [orgOptions, setOrgOptions] = useState<
    { id: string; name: string; email: string }[]
  >([]);
  const [selectedOrgEmail, setSelectedOrgEmail] = useState<string>("");
  const [dialogInvoice, setDialogInvoice] = useState<any | null>(null);

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

  async function openPay(invoice: InvoiceSummary) {
    const res = await getCustomerInvoice(invoice._id);
    setDialogInvoice(res.data.invoice);
    setPayDialog({
      open: true,
      invoice: { ...invoice, ...res.data.invoice } as any,
    });
  }

  function goPay() {
    if (!payDialog.invoice) return;
    const need =
      (payDialog.invoice.totalAmount || 0) -
      (payDialog.invoice.paidAmount || 0);
    const available = balance?.balance ?? 0;
    if (available < need) {
      alert("Insufficient balance. Please add funds.");
      setPayDialog({ open: false, invoice: null });
      return;
    }
    router.push(`/customer/${params.id}/payBill/${payDialog.invoice._id}`);
  }

  useEffect(() => {
    let active = true;
    const v = orgQuery.trim();
    if (!v) {
      setOrgOptions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await lookupOrganizationsByEmail(v);
        if (!active) return;
        setOrgOptions(res.data.results || []);
      } catch {}
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [orgQuery]);

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
          <div className="relative">
            <input
              value={orgQuery}
              onChange={(e) => {
                setOrgQuery(e.target.value);
              }}
              placeholder="Filter by org email"
              className="w-56 rounded-md border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
            />
            {orgOptions.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-white/10 bg-black/80 p-1 text-sm text-white">
                {orgOptions.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => {
                      setSelectedOrgEmail(o.email);
                      setOrgQuery(o.email);
                      setOrgOptions([]);
                    }}
                    className="block w-full rounded px-2 py-1 text-left hover:bg-white/10"
                  >
                    {o.name} — {o.email}
                  </button>
                ))}
              </div>
            )}
          </div>
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
            {filteredInvoices
              .filter((i) => {
                if (!selectedOrgEmail) return true;
                const email = (i as any)?.organization?.user?.email || "";
                return email
                  .toLowerCase()
                  .includes(selectedOrgEmail.toLowerCase());
              })
              .map((inv: InvoiceSummary) => (
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
                    <div className="mt-1 text-[11px] text-white/60">
                      Sent by {(inv as any)?.organization?.name || "—"}{" "}
                      {((inv as any)?.organization?.user?.email &&
                        `(${(inv as any).organization.user.email})`) ||
                        ""}
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
                      {inv.status === "sent" ? "" : inv.status}
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
              <div className="rounded-md border border-white/10 bg-black/40 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-white">
                    {(dialogInvoice as any)?.organization?.name}{" "}
                    {(dialogInvoice as any)?.organization?.user?.email
                      ? `(${(dialogInvoice as any).organization.user.email})`
                      : ""}
                  </div>
                  <div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        (payDialog.invoice.status || "").toLowerCase() ===
                        "paid"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : (payDialog.invoice.status || "").toLowerCase() ===
                            "overdue"
                          ? "bg-red-500/20 text-red-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {payDialog.invoice.status}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-white/70">
                  <div>
                    Due:{" "}
                    {payDialog.invoice.dueDate
                      ? new Date(payDialog.invoice.dueDate).toLocaleDateString()
                      : "—"}
                  </div>
                  <div>Invoice: {payDialog.invoice.invoiceNumber}</div>
                  <div>
                    Total: ₹ {payDialog.invoice.totalAmount?.toLocaleString?.()}
                  </div>
                  <div>
                    Paid: ₹{" "}
                    {(
                      dialogInvoice?.paidAmount ??
                      payDialog.invoice.paidAmount ??
                      0
                    )?.toLocaleString?.()}
                  </div>
                </div>
                <div className="mt-3 overflow-hidden rounded-md border border-white/10">
                  <div className="grid grid-cols-12 bg-white/5 px-3 py-2 text-[11px] text-white/70">
                    <div className="col-span-6">Description</div>
                    <div className="col-span-1 text-right">Qty</div>
                    <div className="col-span-2 text-right">Unit</div>
                    <div className="col-span-1 text-right">Disc</div>
                    <div className="col-span-1 text-right">Tax</div>
                    <div className="col-span-1 text-right">Total</div>
                  </div>
                  {(dialogInvoice?.items || []).map((it: any, idx: number) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 border-t border-white/10 px-3 py-2 text-[12px] text-white/80"
                    >
                      <div className="col-span-6">{it?.description || "—"}</div>
                      <div className="col-span-1 text-right">
                        {Number(it?.quantity || 0)}
                      </div>
                      <div className="col-span-2 text-right">
                        ₹ {Number(it?.unitPrice || 0).toLocaleString()}
                      </div>
                      <div className="col-span-1 text-right">
                        {Number(it?.discount || 0)}%
                      </div>
                      <div className="col-span-1 text-right">
                        {Number(it?.tax || 0)}%
                      </div>
                      <div className="col-span-1 text-right">
                        ₹ {Number(it?.total || 0).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-end">
                  <div className="min-w-[220px] text-[12px]">
                    <div className="flex items-center justify-between py-1 text-white/70">
                      <div>Subtotal</div>
                      <div>
                        ₹ {(dialogInvoice?.subtotal ?? 0)?.toLocaleString?.()}
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-1 text-white/70">
                      <div>Discount</div>
                      <div>
                        ₹{" "}
                        {(
                          dialogInvoice?.discountAmount ?? 0
                        )?.toLocaleString?.()}
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-1 text-white/70">
                      <div>Tax</div>
                      <div>
                        ₹ {(dialogInvoice?.taxAmount ?? 0)?.toLocaleString?.()}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-white/10 py-2 text-white">
                      <div className="font-medium">Total</div>
                      <div className="font-semibold">
                        ₹{" "}
                        {(
                          dialogInvoice?.totalAmount ??
                          payDialog.invoice.totalAmount
                        )?.toLocaleString?.()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPayDialog({ open: false, invoice: null })}
                className="rounded-md px-3 py-1.5 text-sm text-white/80 ring-1 ring-white/15 hover:bg-white/5"
              >
                Close
              </button>
              <button
                onClick={() =>
                  downloadInvoicePdf(dialogInvoice || payDialog.invoice)
                }
                className="rounded-md px-3 py-1.5 text-sm font-semibold text-black bg-white hover:bg-white/90"
              >
                Download PDF
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
