"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { customerActions } from "@/hooks/useCustomer";
import { LoaderOverlay } from "@/components/ui/LoaderOverlay";
import type { Invoice } from "@/lib/customer";
import { getCustomerInvoice } from "@/lib/customer";

export default function PayBillPage() {
  const router = useRouter();
  const params = useParams<{ id: string; billId: string }>();
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [amount, setAmount] = useState<number | "">("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await getCustomerInvoice(params.billId);
        setInvoice(res.data.invoice);
        const remaining =
          (res.data.invoice?.totalAmount || 0) -
          (res.data.invoice?.paidAmount || 0);
        setAmount(remaining > 0 ? remaining : "");
      } finally {
        setLoading(false);
      }
    })();
  }, [params.billId]);

  async function pay() {
    if (typeof amount !== "number" || amount <= 0) return;
    setBusy(true);
    try {
      await customerActions.payInvoice(params.billId, amount);
      setDone(true);
      setTimeout(() => router.replace(`/customer/${params.id}`), 1200);
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-white/70">Loading…</div>
    );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Pay invoice</h1>
        <p className="text-sm text-white/60">
          Invoice {invoice?.invoiceNumber}
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-white/60">Organization</div>
            <div className="text-white">
              {invoice?.organization?.name || "—"}
            </div>
            <div className="text-xs text-white/60">
              {(invoice as any)?.organization?.user?.email || ""}
            </div>
          </div>
          <div>
            <div className="text-white/60">Due date</div>
            <div className="text-white">
              {invoice?.dueDate
                ? new Date(invoice.dueDate).toLocaleDateString()
                : "—"}
            </div>
          </div>
          <div>
            <div className="text-white/60">Total</div>
            <div className="text-white">
              ₹ {invoice?.totalAmount?.toLocaleString?.()}
            </div>
          </div>
          <div>
            <div className="text-white/60">Paid</div>
            <div className="text-white">
              ₹ {invoice?.paidAmount?.toLocaleString?.()}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-xs text-white/60">
            Amount to pay
          </label>
          <input
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value || 0))}
            type="number"
            min={1}
            className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => router.back()}
            className="rounded-md px-4 py-2 text-sm text-white/80 ring-1 ring-white/15 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={pay}
            className="rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-300"
          >
            Pay now
          </button>
        </div>
      </div>

      <LoaderOverlay
        show={busy || done}
        success={done}
        title={done ? "Paid successfully" : "Processing payment"}
        subtitle={done ? "Redirecting to your profile" : "Please wait"}
      />
    </div>
  );
}
