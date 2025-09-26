"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useOrganizationOverview,
  organizationActions,
} from "@/hooks/useOrganization";
import { LoaderOverlay } from "@/components/ui/LoaderOverlay";
import { downloadInvoicePdf } from "@/lib/invoiceDownload";

export default function OrganizationDashboardPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { loading, error, profile, invoices, revenue, refresh } =
    useOrganizationOverview();
  const [tab, setTab] = useState<
    | "profile"
    | "all"
    | "sent"
    | "paid"
    | "created"
    | "overdue"
    | "filter"
    | "bids"
    | "financed"
  >("profile");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sendCtx, setSendCtx] = useState<{
    open: boolean;
    invoiceId: string | null;
    emailQuery: string;
    picked?: { id: string; email: string } | null;
    results: Array<{ id: string; email: string }>;
  }>({
    open: false,
    invoiceId: null,
    emailQuery: "",
    picked: null,
    results: [],
  });
  const [invoiceDetails, setInvoiceDetails] = useState<{
    open: boolean;
    invoice: {
      _id: string;
      invoiceNumber: string;
      dueDate: string;
      issueDate: string;
      status: string;
      subtotal: number;
      discountAmount: number;
      taxAmount: number;
      totalAmount: number;
      notes?: string;
      termsAndConditions?: string;
      items: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        discount: number;
        tax: number;
        total: number;
      }>;
      customer?: {
        firstName: string;
        lastName: string;
        user?: { email: string };
      } | null;
      isOnBid?: boolean;
    } | null;
    loading: boolean;
  }>({
    open: false,
    invoice: null,
    loading: false,
  });
  const [filterEmailQuery, setFilterEmailQuery] = useState("");
  const [filterEmailResults, setFilterEmailResults] = useState<
    Array<{ id: string; email: string }>
  >([]);

  const list = useMemo(() => {
    if (tab === "all") return invoices.all || [];
    if (tab === "sent") return invoices.sent || [];
    if (tab === "paid") return invoices.paid || [];
    if (tab === "created") return invoices.createdUnsent || [];
    if (tab === "overdue")
      return (invoices.all || []).filter(
        (i: { status: string }) => i.status === "overdue"
      );
    if (tab === "financed") return (invoices as any).financed || [];
    return [];
  }, [tab, invoices]);

  console.log("list", list);

  async function runFilter() {
    setBusy(true);
    try {
      const res = await organizationActions.filterInvoices(filters);
      // quick view overlay replacement for All tab
      invoices.all = res.data.invoices;
    } finally {
      setBusy(false);
    }
  }

  async function searchEmail(q: string) {
    setSendCtx((s) => ({ ...s, emailQuery: q }));
    if (!q) return setSendCtx((s) => ({ ...s, results: [] }));
    const res = await organizationActions.searchCustomers(q);
    console.log(res);
    setSendCtx((s) => ({ ...s, results: res.data.results }));
  }

  async function searchFilterEmail(q: string) {
    setFilterEmailQuery(q);
    if (!q) return setFilterEmailResults([]);
    const res = await organizationActions.searchCustomers(q);
    setFilterEmailResults(res.data.results);
  }

  async function loadInvoiceDetails(invoiceId: string) {
    setInvoiceDetails({ open: true, invoice: null, loading: true });
    try {
      const res = await organizationActions.getInvoiceById(invoiceId);
      setInvoiceDetails({
        open: true,
        invoice: res.data.invoice as typeof invoiceDetails.invoice,
        loading: false,
      });
    } catch {
      setInvoiceDetails({ open: false, invoice: null, loading: false });
    }
  }

  async function doSend() {
    if (!sendCtx.invoiceId || !sendCtx.picked) return;
    setBusy(true);
    try {
      await organizationActions.sendInvoice(
        sendCtx.invoiceId,
        sendCtx.picked.id
      );
      setSendCtx({
        open: false,
        invoiceId: null,
        emailQuery: "",
        picked: null,
        results: [],
      });
      await refresh();
      setTab("sent");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            {profile?.name || "Organization"}
          </h1>
          <p className="text-sm text-white/60">Manage invoices and customers</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              router.push(`/organization/${params.id}/listonmarket`)
            }
            className="rounded-md px-3 py-1.5 text-sm text-white/90 ring-1 ring-white/15 hover:bg-white/5"
          >
            List invoices in marketplace
          </button>
          <button
            onClick={() =>
              router.push(`/organization/${params.id}/createinvoice`)
            }
            className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-black hover:bg-white/90"
          >
            Create invoice
          </button>
          <button
            onClick={() => router.push(`/organization/${params.id}/updateme`)}
            className="rounded-md px-3 py-1.5 text-sm text-white/90 ring-1 ring-white/15 hover:bg-white/5"
          >
            Update profile
          </button>
        </div>
      </div>

      {/* Revenue Summary */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="text-xs text-white/60">Total Revenue</div>
          <div className="mt-1 text-xl font-semibold text-white">
            ₹ {revenue?.total?.toLocaleString?.() ?? 0}
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg:white/5 p-4">
          <div className="text-xs text-white/60">Pending</div>
          <div className="mt-1 text-xl font-semibold text-white">
            ₹ {revenue?.pending?.toLocaleString?.() ?? 0}
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="text-xs text-white/60">Received</div>
          <div className="mt-1 text-xl font-semibold text:white">
            ₹ {revenue?.received?.toLocaleString?.() ?? 0}
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-white/10 bg-white/5 p-2">
            {(
              [
                "profile",
                "all",
                "sent",
                "paid",
                "created",
                "overdue",
                "filter",
                "bids",
                "financed",
              ] as const
            ).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`mb-1 w-full rounded-md px-3 py-2 text-left text-sm ${
                  tab === t
                    ? "bg-white text-black"
                    : "text-white/80 hover:text-white hover:bg-white/5"
                }`}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
            {tab === "bids" ? (
              <div className="mt-2 px-3">
                <button
                  onClick={() => router.push(`/organization/${params.id}/bids`)}
                  className="w-full rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-white/90"
                >
                  See more
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <div className="lg:col-span-4">
          {tab === "profile" ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
              <div>
                Name: <span className="text-white">{profile?.name}</span>
              </div>
              <div>
                GST: <span className="text-white">{profile?.gstId}</span>
              </div>
              <div>
                PAN: <span className="text-white">{profile?.panNumber}</span>
              </div>
              <div>
                Address:{" "}
                <span className="text-white">
                  {profile?.address?.street}, {profile?.address?.city}
                </span>
              </div>
            </div>
          ) : tab === "filter" ? (
            <div className="rounded-xl border border-white/10 bg:white/5 p-6">
              <h2 className="mb-4 text-lg font-semibold text-white">
                Filter Invoices
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text:white">
                    Customer Email
                  </label>
                  <div className="relative">
                    <input
                      placeholder="Search customer email"
                      value={filterEmailQuery}
                      className="w-full rounded-md border border-white/10 bg:black/40 px-3 py-2 text-white hover:border-white/20 focus:border-white/30 transition-colors"
                      onChange={(e) => searchFilterEmail(e.target.value)}
                    />
                    {filterEmailResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full rounded-md border border-white/10 bg-black/90 shadow-lg">
                        {filterEmailResults.map((customer) => (
                          <button
                            key={customer.id}
                            onClick={() => {
                              setFilters((f) => ({
                                ...f,
                                email: customer.email,
                              }));
                              setFilterEmailQuery(customer.email);
                              setFilterEmailResults([]);
                            }}
                            className="flex w-full items-center px-3 py-2 text-left text-sm text-white/80 hover:bg-white/5"
                          >
                            {customer.email}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Status
                  </label>
                  <select
                    className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white hover:border-white/20 focus:border-white/30 transition-colors"
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, status: e.target.value }))
                    }
                  >
                    <option value="">Any status</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text:white">
                    Due Before
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-white/10 bg:black/40 px-3 py-2 text-white hover:border-white/20 focus:border-white/30 transition-colors"
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, dueBefore: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text:white">
                    Due After
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-white/10 bg:black/40 px-3 py-2 text-white hover:border:white/20 focus:border:white/30 transition-colors"
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, dueAfter: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text:white">
                    Min Total (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full rounded-md border border-white/10 bg:black/40 px-3 py-2 text-white hover:border:white/20 focus:border-white/30 transition-colors"
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, minTotal: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text:white">
                    Max Total (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full rounded-md border border-white/10 bg:black/40 px-3 py-2 text-white hover:border:white/20 focus:border:white/30 transition-colors"
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, maxTotal: e.target.value }))
                    }
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="inline-flex items-center gap-2 text:white/80">
                    <input
                      type="checkbox"
                      className="rounded border-white/20 bg-black/40 text:white focus:ring-white/20"
                      onChange={(e) =>
                        setFilters((f) => ({
                          ...f,
                          unsentOnly: e.target.checked ? "true" : "",
                        }))
                      }
                    />
                    <span>Show only unsent invoices</span>
                  </label>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setFilters({});
                    setFilterEmailQuery("");
                    setFilterEmailResults([]);
                  }}
                  className="rounded-md px-4 py-2 text-sm text-white/80 ring-1 ring-white/15 hover:bg-white/5 transition-colors"
                >
                  Clear Filters
                </button>
                <button
                  onClick={runFilter}
                  className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          ) : tab === "bids" ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white/80">
              <div className="text-sm">
                Quick view of invoices that have bids. Use See more to manage
                bids.
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              {loading ? (
                <div className="text-white/60">Loading…</div>
              ) : (list?.length || 0) === 0 ? (
                <div className="text-white/60">No invoices.</div>
              ) : (
                <div className="grid gap-3">
                  {list.map((inv: any) => (
                    <div
                      key={inv._id}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-black/40 p-4 hover:bg:white/5 transition-colors cursor-pointer"
                      onClick={() => loadInvoiceDetails(inv._id)}
                    >
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-white flex items-center gap-2">
                          <span>{inv.invoiceNumber}</span>
                          {tab !== "financed" && inv.isOnBid ? (
                            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-400/30">
                              On bid
                            </span>
                          ) : null}
                          {tab === "all" && inv?.sold?.isSold ? (
                            <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-xs font-medium text-sky-300 ring-1 ring-sky-400/30">
                              Sold
                            </span>
                          ) : null}
                          {tab === "financed" ? (
                            <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-xs font-medium text-sky-300 ring-1 ring-sky-400/30">
                              Sold
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-white/60">
                          {tab === "financed" ? (
                            <>
                              Sold at{" "}
                              {inv?.sold?.soldAt
                                ? new Date(inv.sold.soldAt).toLocaleDateString()
                                : "—"}
                            </>
                          ) : (
                            <>
                              Due{" "}
                              {inv.dueDate
                                ? new Date(inv.dueDate).toLocaleDateString()
                                : "—"}
                            </>
                          )}
                          {inv.totalAmount && (
                            <span className="ml-2">
                              • ₹{inv.totalAmount.toLocaleString()}
                            </span>
                          )}
                        </div>
                        {tab === "financed" ? (
                          <div className="text-xs text-white/60">
                            Sold to:{" "}
                            {inv?.sold?.soldTo?.profile?.companyName ||
                              `${inv?.sold?.soldTo?.profile?.firstName || ""} ${
                                inv?.sold?.soldTo?.profile?.lastName || ""
                              }`.trim() ||
                              "Financer"}
                            {inv?.sold?.soldTo?.user?.email ? (
                              <span className="ml-1 text-white/40">
                                • {inv.sold.soldTo.user.email}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <div className="text-xs text-white/40 capitalize">
                            Status:{" "}
                            {inv?.sold?.isSold
                              ? "sold"
                              : inv.status.replace("_", " ")}
                          </div>
                        )}
                      </div>
                      <div
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {tab !== "financed" &&
                        !inv.customer &&
                        inv.status === "draft" ? (
                          <button
                            onClick={() =>
                              setSendCtx({
                                open: true,
                                invoiceId: inv._id,
                                emailQuery: "",
                                picked: null,
                                results: [],
                              })
                            }
                            className="rounded-md px-3 py-1.5 text-xs text-white/90 ring-1 ring-white/15 hover:bg:white/5"
                          >
                            Send
                          </button>
                        ) : null}
                        {tab !== "financed" &&
                        !inv.customer &&
                        inv.status === "draft" ? (
                          <button
                            onClick={() =>
                              router.push(
                                `/organization/${params.id}/createinvoice?edit=${inv._id}`
                              )
                            }
                            className="rounded-md px-3 py-1.5 text-xs text:white/90 ring-1 ring-white/15 hover:bg:white/5"
                          >
                            Update
                          </button>
                        ) : null}
                        {tab !== "financed" &&
                        !inv.customer &&
                        inv.status === "draft" ? (
                          <button
                            onClick={async () => {
                              await organizationActions.deleteInvoice(inv._id);
                              await refresh();
                            }}
                            className="rounded-md px-3 py-1.5 text-xs text-red-300 ring-1 ring-red-400/30 hover:bg-red-500/10"
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {sendCtx.open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-black/70 p-6">
            <div className="mb-2 text-lg font-semibold text-white">
              Send invoice
            </div>
            <input
              value={sendCtx.emailQuery}
              onChange={(e) => searchEmail(e.target.value)}
              placeholder="Search customer email"
              className="mb-3 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white"
            />
            <div className="mb-3 max-h-48 overflow-auto rounded-md border border:white/10">
              {(sendCtx.results || []).map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSendCtx((s) => ({ ...s, picked: r }))}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                    sendCtx.picked?.id === r.id
                      ? "bg-white text-black"
                      : "text-white/80 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>{r.email}</span>
                  {sendCtx.picked?.id === r.id ? <span>✓</span> : null}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() =>
                  setSendCtx({
                    open: false,
                    invoiceId: null,
                    emailQuery: "",
                    picked: null,
                    results: [],
                  })
                }
                className="rounded-md px-3 py-1.5 text-sm text:white/80 ring-1 ring-white/15 hover:bg:white/5"
              >
                Cancel
              </button>
              <button
                disabled={!sendCtx.picked}
                onClick={doSend}
                className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Invoice Details Dialog */}
      {invoiceDetails.open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-auto rounded-xl border border-white/10 bg-black/70 p-6">
            {invoiceDetails.loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-white/60">Loading invoice details...</div>
              </div>
            ) : invoiceDetails.invoice ? (
              <div>
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">
                    Invoice Details - {invoiceDetails.invoice.invoiceNumber}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadInvoicePdf(invoiceDetails.invoice)}
                      className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-black hover:bg-white/90"
                    >
                      Download
                    </button>
                    <button
                      onClick={() =>
                        setInvoiceDetails({
                          open: false,
                          invoice: null,
                          loading: false,
                        })
                      }
                      className="rounded-md px-3 py-1.5 text-sm text:white/80 ring-1 ring-white/15 hover:bg:white/5"
                    >
                      Close
                    </button>
                    {invoiceDetails.invoice.isOnBid ? (
                      <button
                        onClick={() =>
                          router.push(`/organization/${params.id}/bids`)
                        }
                        className="rounded-md px-3 py-1.5 text-sm text-white/90 ring-1 ring-white/15 hover:bg-white/5"
                      >
                        Check biddings
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* PDF-like Invoice View */}
                <div className="rounded-lg border border-white/10 bg-white p-8 text-black">
                  {/* Header */}
                  <div className="mb-8 flex justify-between">
                    <div>
                      <h1 className="text-2xl font-bold">INVOICE</h1>
                      <p className="text-gray-600">
                        #{invoiceDetails.invoice.invoiceNumber}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Issue Date</p>
                      <p className="font-semibold">
                        {new Date(
                          invoiceDetails.invoice.issueDate
                        ).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600 mt-2">Due Date</p>
                      <p className="font-semibold">
                        {new Date(
                          invoiceDetails.invoice.dueDate
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Organization Details */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-2">From:</h3>
                    <p className="font-semibold">{profile?.name}</p>
                    <p>{profile?.address?.street}</p>
                    <p>
                      {profile?.address?.city}, {profile?.address?.state}{" "}
                      {profile?.address?.zipCode}
                    </p>
                    <p>{profile?.address?.country}</p>
                    <p>GST: {profile?.gstId}</p>
                    <p>PAN: {profile?.panNumber}</p>
                  </div>

                  {/* Customer Details */}
                  {invoiceDetails.invoice.customer && (
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold mb-2">To:</h3>
                      <p className="font-semibold">
                        {invoiceDetails.invoice.customer.firstName}{" "}
                        {invoiceDetails.invoice.customer.lastName}
                      </p>
                      <p>{invoiceDetails.invoice.customer.user?.email}</p>
                    </div>
                  )}

                  {/* Items Table */}
                  <div className="mb-8">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b-2 border-gray-300">
                          <th className="text-left py-2">Description</th>
                          <th className="text-right py-2">Qty</th>
                          <th className="text-right py-2">Unit Price</th>
                          <th className="text-right py-2">Discount</th>
                          <th className="text-right py-2">Tax</th>
                          <th className="text-right py-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceDetails.invoice.items?.map(
                          (item, index: number) => (
                            <tr
                              key={index}
                              className="border-b border-gray-200"
                            >
                              <td className="py-2">{item.description}</td>
                              <td className="text-right py-2">
                                {item.quantity}
                              </td>
                              <td className="text-right py-2">
                                ₹{item.unitPrice.toFixed(2)}
                              </td>
                              <td className="text-right py-2">
                                {item.discount}%
                              </td>
                              <td className="text-right py-2">{item.tax}%</td>
                              <td className="text-right py-2">
                                ₹
                                {(
                                  item.total || item.unitPrice * item.quantity
                                ).toFixed(2)}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals */}
                  <div className="ml-auto w-64">
                    <div className="flex justify-between py-1">
                      <span>Subtotal:</span>
                      <span>
                        ₹{invoiceDetails.invoice.subtotal?.toFixed(2) || "0.00"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Discount:</span>
                      <span>
                        ₹
                        {invoiceDetails.invoice.discountAmount?.toFixed(2) ||
                          "0.00"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Tax:</span>
                      <span>
                        ₹
                        {invoiceDetails.invoice.taxAmount?.toFixed(2) || "0.00"}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 text-lg font-bold border-t-2 border-gray-300">
                      <span>Total:</span>
                      <span>
                        ₹
                        {invoiceDetails.invoice.totalAmount?.toFixed(2) ||
                          "0.00"}
                      </span>
                    </div>
                  </div>

                  {/* Notes and Terms */}
                  {(invoiceDetails.invoice.notes ||
                    invoiceDetails.invoice.termsAndConditions) && (
                    <div className="mt-8">
                      {invoiceDetails.invoice.notes && (
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold mb-2">Notes:</h3>
                          <p className="text-gray-700">
                            {invoiceDetails.invoice.notes}
                          </p>
                        </div>
                      )}
                      {invoiceDetails.invoice.termsAndConditions && (
                        <div>
                          <h3 className="text-lg font-semibold mb-2">
                            Terms & Conditions:
                          </h3>
                          <p className="text-gray-700">
                            {invoiceDetails.invoice.termsAndConditions}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-white/60">
                  Failed to load invoice details
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <LoaderOverlay show={busy} title="Working" subtitle="Please wait" />
    </div>
  );
}
