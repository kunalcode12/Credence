"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getOrgSentInvoicesFull,
  getOrgInvoiceById,
  type OrgInvoice,
} from "@/lib/organization";
import { apiFetch } from "@/lib/api";

export default function ListOnMarketPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<OrgInvoice[]>([]);
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [details, setDetails] = useState<{
    open: boolean;
    invoice: OrgInvoice | null;
    loading: boolean;
  }>({ open: false, invoice: null, loading: false });
  const [listed, setListed] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await getOrgSentInvoicesFull();
      console.log("res", res);
      setInvoices(res.data.invoices || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }

  async function openInvoice(id: string) {
    setDetails({ open: true, invoice: null, loading: true });
    try {
      const res = await getOrgInvoiceById(id);
      setDetails({
        open: true,
        invoice: res.data.invoice as OrgInvoice,
        loading: false,
      });
    } catch {
      setDetails({ open: false, invoice: null, loading: false });
    }
  }

  async function listOne(invoiceId: string) {
    setBusy(true);
    setActiveId(invoiceId);
    try {
      await apiFetch<{ success: boolean; data?: unknown }>(`/marketplace`, {
        method: "POST",
        auth: true,
        body: { invoiceId, organizationId: params.id },
      });
      setListed((prev) => new Set([...Array.from(prev), invoiceId]));
    } finally {
      setActiveId(null);
      setBusy(false);
    }
  }

  async function listAll() {
    setBusy(true);
    try {
      await apiFetch<{ success: boolean; data: { listed: number } }>(
        `/marketplace`,
        {
          method: "POST",
          auth: true,
          body: { organizationId: params.id },
        }
      );
      setListed(new Set(invoices.map((i) => i._id)));
      setToast("Listed all eligible invoices");
      setTimeout(() => router.replace(`/organization/${params.id}`), 1200);
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
      <div className="mb-6 flex items:center justify-between">
        <div>
          <div className="text-2xl font-semibold text-white">
            List on marketplace
          </div>
          <div className="text-sm text-white/60">
            Sent invoices eligible for listing
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="rounded-md px-3 py-1.5 text-sm text-white/90 ring-1 ring-white/15 hover:bg-white/5"
          >
            Back
          </button>
          <button
            onClick={listAll}
            className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-50"
            disabled={
              busy || (invoices.length <= 0 && invoices.every((i) => i.isOnBid))
            }
          >
            List all
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        {loading ? (
          <div className="text-white/60">Loading…</div>
        ) : error ? (
          <div className="text-red-300">{error}</div>
        ) : invoices.length === 0 ? (
          <div className="text-white/60">No sent invoices.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {invoices.map((inv) => {
              const alreadyListed = Boolean(inv.isOnBid) || listed.has(inv._id);
              return (
                <div
                  key={inv._id}
                  className={`flex items-center justify-between rounded-lg border p-4 transition ${
                    alreadyListed
                      ? "border-emerald-400/40 bg-emerald-500/10"
                      : "border-white/10 bg-black/40 hover:bg-white/5"
                  }`}
                >
                  <div className="text-sm text-white">
                    <div className="font-semibold">{inv.invoiceNumber}</div>
                    <div className="text-white/60 text-xs">
                      ₹{inv.totalAmount?.toLocaleString?.() ?? 0}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openInvoice(inv._id)}
                      className="rounded-md px-3 py-1.5 text-xs text-white/90 ring-1 ring-white/15 hover:bg-white/5"
                    >
                      Preview
                    </button>
                    {alreadyListed ? null : (
                      <button
                        onClick={() => listOne(inv._id)}
                        disabled={busy}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                          alreadyListed
                            ? "bg-emerald-400 text-black"
                            : "bg-white text-black hover:bg-white/90"
                        }`}
                      >
                        {activeId === inv._id
                          ? "Listing…"
                          : alreadyListed
                          ? "Listed"
                          : "Add to marketplace"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {details.open ? (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-white/10 bg-black/70">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <div className="text-sm font-semibold text-white">
                Invoice preview
              </div>
              <button
                onClick={() =>
                  setDetails({ open: false, invoice: null, loading: false })
                }
                className="rounded-md px-2 py-1 text-xs text-white/90 ring-1 ring-white/15 hover:bg-white/5"
              >
                Close
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto p-5">
              {details.loading ? (
                <div className="text-white/60">Loading…</div>
              ) : !details.invoice ? (
                <div className="text-white/60">No invoice found.</div>
              ) : (
                <div className="rounded-lg border border-white/10 bg-white p-6 text-black">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <div className="text-xl font-semibold">Invoice</div>
                      <div className="text-sm text-black/60">
                        #{details.invoice.invoiceNumber}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      {details.invoice.dueDate ? (
                        <div>
                          <span className="text-black/60">Due:</span>{" "}
                          {new Date(
                            details.invoice.dueDate
                          ).toLocaleDateString()}
                        </div>
                      ) : null}
                      <div>
                        <span className="text-black/60">Status:</span>{" "}
                        {details.invoice.status}
                      </div>
                    </div>
                  </div>
                  <div className="mb-4 overflow-hidden rounded-md border border-black/10">
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
                        {(details.invoice.items || []).map((it, idx) => (
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
                              ₹
                              {(
                                it.total || it.quantity * it.unitPrice
                              ).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-start justify-end gap-6 text-sm">
                    <div>
                      <div className="mt-2 flex items-center justify-between gap-10 border-t border-black/10 pt-2 text-base">
                        <div className="font-semibold">Total</div>
                        <div className="font-semibold">
                          ₹
                          {details.invoice.totalAmount?.toLocaleString?.() ?? 0}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-6 right-6 rounded-md bg-black/80 px-4 py-2 text-sm text-white/90 ring-1 ring-white/15">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
