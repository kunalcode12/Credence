"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { organizationActions } from "@/hooks/useOrganization";
import { LoaderOverlay } from "@/components/ui/LoaderOverlay";

type Item = {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
};

export default function CreateInvoicePage() {
  const router = useRouter();
  const sp = useSearchParams();
  const editId = sp?.get("edit") || null;
  const [items, setItems] = useState<Item[]>([
    {
      description: "",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      tax: 0,
      total: 0,
    },
  ]);
  const [dueDate, setDueDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [terms, setTerms] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sendCtx, setSendCtx] = useState<{
    emailQuery: string;
    picked?: { id: string; email: string } | null;
    results: Array<{ id: string; email: string }>;
  }>({ emailQuery: "", picked: null, results: [] });

  // Calculate item totals and overall totals
  const itemsWithTotals = useMemo(() => {
    return items.map((item) => {
      const itemTotal = item.quantity * item.unitPrice;
      const itemDiscount = (itemTotal * item.discount) / 100;
      const itemTax = ((itemTotal - itemDiscount) * item.tax) / 100;
      const total = itemTotal - itemDiscount + itemTax;

      return { ...item, total };
    });
  }, [items]);

  const subtotal = useMemo(
    () =>
      itemsWithTotals.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0),
    [itemsWithTotals]
  );

  const discountAmount = useMemo(
    () =>
      itemsWithTotals.reduce(
        (sum, it) => sum + (it.quantity * it.unitPrice * it.discount) / 100,
        0
      ),
    [itemsWithTotals]
  );

  const taxAmount = useMemo(
    () =>
      itemsWithTotals.reduce((sum, it) => {
        const itemTotal = it.quantity * it.unitPrice;
        const itemDiscount = (itemTotal * it.discount) / 100;
        return sum + ((itemTotal - itemDiscount) * it.tax) / 100;
      }, 0),
    [itemsWithTotals]
  );

  const totalAmount = useMemo(
    () => subtotal - discountAmount + taxAmount,
    [subtotal, discountAmount, taxAmount]
  );
  // Validation functions
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!dueDate) {
      newErrors.dueDate = "Due date is required";
    } else if (new Date(dueDate) <= new Date()) {
      newErrors.dueDate = "Due date must be in the future";
    }

    if (items.length === 0) {
      newErrors.items = "At least one item is required";
    }

    items.forEach((item, index) => {
      if (!item.description.trim()) {
        newErrors[`item_${index}_description`] = "Item description is required";
      }
      if (item.quantity <= 0) {
        newErrors[`item_${index}_quantity`] = "Quantity must be greater than 0";
      }
      if (item.unitPrice < 0) {
        newErrors[`item_${index}_unitPrice`] = "Unit price cannot be negative";
      }
      if (item.discount < 0 || item.discount > 100) {
        newErrors[`item_${index}_discount`] =
          "Discount must be between 0 and 100";
      }
      if (item.tax < 0) {
        newErrors[`item_${index}_tax`] = "Tax cannot be negative";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    async function loadForEdit() {
      if (!editId) return;
      setBusy(true);
      try {
        const res = await organizationActions.getInvoiceById(editId);
        const invoice = res.data.invoice;

        // Pre-fill form with existing invoice data
        const items = (invoice.items || []).map(
          (item: {
            description: string;
            quantity: number;
            unitPrice: number;
            discount?: number;
            tax?: number;
            total?: number;
          }) => ({
            description: item.description || "",
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            discount: item.discount || 0,
            tax: item.tax || 0,
            total: item.total || 0,
          })
        );
        setItems(items);
        setDueDate(
          invoice.dueDate
            ? new Date(invoice.dueDate).toISOString().split("T")[0]
            : ""
        );
        setNotes(invoice.notes || "");
        setTerms(invoice.termsAndConditions || "");
      } catch (error) {
        console.error("Failed to load invoice for editing:", error);
      } finally {
        setBusy(false);
      }
    }
    loadForEdit();
  }, [editId]);

  function addItem() {
    setItems((arr) => [
      ...arr,
      {
        description: "",
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        tax: 0,
        total: 0,
      },
    ]);
  }

  function updateItem(idx: number, next: Partial<Item>) {
    setItems((arr) =>
      arr.map((it, i) => (i === idx ? { ...it, ...next } : it))
    );
    // Clear related errors when updating
    const newErrors = { ...errors };
    Object.keys(newErrors).forEach((key) => {
      if (key.startsWith(`item_${idx}_`)) {
        delete newErrors[key];
      }
    });
    setErrors(newErrors);
  }

  function removeItem(idx: number) {
    setItems((arr) => arr.filter((_, i) => i !== idx));
    // Clear related errors when removing
    const newErrors = { ...errors };
    Object.keys(newErrors).forEach((key) => {
      if (key.startsWith(`item_${idx}_`)) {
        delete newErrors[key];
      }
    });
    setErrors(newErrors);
  }

  async function saveDraft() {
    if (!validateForm()) {
      setToast("Please fix the errors before saving");
      return;
    }

    setBusy(true);
    try {
      const invoiceData = {
        items: itemsWithTotals,
        dueDate,
        notes,
        termsAndConditions: terms,
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
      };
      console.log(invoiceData);

      if (editId) {
        await organizationActions.updateInvoice(editId, invoiceData);
        setToast("Invoice updated");
      } else {
        await organizationActions.createInvoice(invoiceData);
        setToast("Invoice created");
      }
      setTimeout(() => setToast(""), 2000);
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Failed to save invoice"
      );
    } finally {
      setBusy(false);
    }
  }

  async function searchEmail(q: string) {
    setSendCtx((s) => ({ ...s, emailQuery: q }));
    if (!q) return setSendCtx((s) => ({ ...s, results: [] }));
    const res = await organizationActions.searchCustomers(q);
    setSendCtx((s) => ({ ...s, results: res.data.results }));
  }

  async function sendNow() {
    if (!sendCtx.picked) return;

    if (!validateForm()) {
      setToast("Please fix the errors before sending");
      return;
    }

    setBusy(true);
    try {
      const invoiceData = {
        items: itemsWithTotals,
        dueDate,
        notes,
        termsAndConditions: terms,
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
      };

      if (!editId) {
        // create then send
        const created = await organizationActions.createInvoice(invoiceData);
        await organizationActions.sendInvoice(
          created.data.invoice._id,
          sendCtx.picked.id
        );
      } else {
        await organizationActions.updateInvoice(editId, invoiceData);
        await organizationActions.sendInvoice(editId, sendCtx.picked.id);
      }
      setToast("Invoice sent");
      setTimeout(() => router.back(), 800);
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Failed to send invoice"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">
          {editId ? "Update" : "Create"} Invoice
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={saveDraft}
            className="rounded-md px-4 py-2 text-sm font-medium text-white/90 ring-1 ring-white/15 hover:bg-white/5 transition-colors"
          >
            {editId ? "Update Draft" : "Save Draft"}
          </button>
          <button
            disabled={!sendCtx.picked}
            onClick={sendNow}
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send Invoice
          </button>
        </div>
      </div>

      {toast && (
        <div
          className={`mb-4 rounded-md px-4 py-3 text-sm ${
            toast.includes("error") ||
            toast.includes("Failed") ||
            toast.includes("fix")
              ? "border border-red-400/30 bg-red-400/10 text-red-300"
              : "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
          }`}
        >
          {toast}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Details */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Invoice Details
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Due Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    if (errors.dueDate) {
                      setErrors((prev) => ({ ...prev, dueDate: "" }));
                    }
                  }}
                  min={new Date().toISOString().split("T")[0]}
                  className={`w-full rounded-md border px-3 py-2 text-white transition-colors ${
                    errors.dueDate
                      ? "border-red-400 bg-red-400/10"
                      : "border-white/10 bg-black/40 hover:border-white/20 focus:border-white/30"
                  }`}
                />
                {errors.dueDate && (
                  <p className="mt-1 text-xs text-red-400">{errors.dueDate}</p>
                )}
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Currency
                </label>
                <input
                  value="INR"
                  disabled
                  className="w-full rounded-md border border-white/10 bg-gray-600/40 px-3 py-2 text-white/60 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Invoice Items
              </h2>
              <button
                onClick={addItem}
                className="rounded-md bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
              >
                + Add Item
              </button>
            </div>

            {errors.items && (
              <p className="mb-3 text-sm text-red-400">{errors.items}</p>
            )}

            <div className="space-y-4">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-white/5 bg-white/2 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-white">
                      Item {idx + 1}
                    </h3>
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItem(idx)}
                        className="rounded-md px-2 py-1 text-xs text-red-400 ring-1 ring-red-400/30 hover:bg-red-500/10 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                    <div className="sm:col-span-5">
                      <label className="mb-1 block text-xs font-medium text-white/80">
                        Description <span className="text-red-400">*</span>
                      </label>
                      <input
                        placeholder="Enter item description"
                        value={item.description}
                        onChange={(e) =>
                          updateItem(idx, { description: e.target.value })
                        }
                        className={`w-full rounded-md border px-3 py-2 text-white transition-colors ${
                          errors[`item_${idx}_description`]
                            ? "border-red-400 bg-red-400/10"
                            : "border-white/10 bg-black/40 hover:border-white/20 focus:border-white/30"
                        }`}
                      />
                      {errors[`item_${idx}_description`] && (
                        <p className="mt-1 text-xs text-red-400">
                          {errors[`item_${idx}_description`]}
                        </p>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-white/80">
                        Quantity <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(idx, {
                            quantity: Number(e.target.value || 1),
                          })
                        }
                        className={`w-full rounded-md border px-3 py-2 text-white transition-colors ${
                          errors[`item_${idx}_quantity`]
                            ? "border-red-400 bg-red-400/10"
                            : "border-white/10 bg-black/40 hover:border-white/20 focus:border-white/30"
                        }`}
                      />
                      {errors[`item_${idx}_quantity`] && (
                        <p className="mt-1 text-xs text-red-400">
                          {errors[`item_${idx}_quantity`]}
                        </p>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-white/80">
                        Unit Price <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(idx, {
                            unitPrice: Number(e.target.value || 0),
                          })
                        }
                        className={`w-full rounded-md border px-3 py-2 text-white transition-colors ${
                          errors[`item_${idx}_unitPrice`]
                            ? "border-red-400 bg-red-400/10"
                            : "border-white/10 bg-black/40 hover:border-white/20 focus:border-white/30"
                        }`}
                      />
                      {errors[`item_${idx}_unitPrice`] && (
                        <p className="mt-1 text-xs text-red-400">
                          {errors[`item_${idx}_unitPrice`]}
                        </p>
                      )}
                    </div>

                    <div className="sm:col-span-1">
                      <label className="mb-1 block text-xs font-medium text-white/80">
                        Discount %
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discount}
                        onChange={(e) =>
                          updateItem(idx, {
                            discount: Number(e.target.value || 0),
                          })
                        }
                        className={`w-full rounded-md border px-3 py-2 text-white transition-colors ${
                          errors[`item_${idx}_discount`]
                            ? "border-red-400 bg-red-400/10"
                            : "border-white/10 bg-black/40 hover:border-white/20 focus:border-white/30"
                        }`}
                      />
                      {errors[`item_${idx}_discount`] && (
                        <p className="mt-1 text-xs text-red-400">
                          {errors[`item_${idx}_discount`]}
                        </p>
                      )}
                    </div>

                    <div className="sm:col-span-1">
                      <label className="mb-1 block text-xs font-medium text-white/80">
                        Tax %
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={item.tax}
                        onChange={(e) =>
                          updateItem(idx, { tax: Number(e.target.value || 0) })
                        }
                        className={`w-full rounded-md border px-3 py-2 text-white transition-colors ${
                          errors[`item_${idx}_tax`]
                            ? "border-red-400 bg-red-400/10"
                            : "border-white/10 bg-black/40 hover:border-white/20 focus:border-white/30"
                        }`}
                      />
                      {errors[`item_${idx}_tax`] && (
                        <p className="mt-1 text-xs text-red-400">
                          {errors[`item_${idx}_tax`]}
                        </p>
                      )}
                    </div>

                    <div className="sm:col-span-1 flex items-end">
                      <div className="w-full rounded-md bg-white/5 px-3 py-2 text-right">
                        <div className="text-xs text-white/60">Total</div>
                        <div className="text-sm font-medium text-white">
                          ₹{itemsWithTotals[idx]?.total.toFixed(2) || "0.00"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Information */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Additional Information
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes for the invoice"
                  className="min-h-[100px] w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white hover:border-white/20 focus:border-white/30 transition-colors"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Terms and Conditions
                </label>
                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="Payment terms and conditions"
                  className="min-h-[100px] w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white hover:border-white/20 focus:border-white/30 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Invoice Summary */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">
              Invoice Summary
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/80">Subtotal</span>
                <span className="text-white">₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/80">Discount</span>
                <span className="text-white">
                  ₹{discountAmount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/80">Tax</span>
                <span className="text-white">
                  ₹{taxAmount.toLocaleString()}
                </span>
              </div>
              <div className="border-t border-white/10 pt-3">
                <div className="flex justify-between text-base font-semibold">
                  <span className="text-white">Total</span>
                  <span className="text-white">
                    ₹{totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Selection */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">
              Send To Customer
            </h3>
            <div className="space-y-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Search Customer
                </label>
                <input
                  value={sendCtx.emailQuery}
                  onChange={(e) => searchEmail(e.target.value)}
                  placeholder="Enter customer email"
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white hover:border-white/20 focus:border-white/30 transition-colors"
                />
              </div>

              {sendCtx.results.length > 0 && (
                <div className="max-h-40 overflow-auto rounded-md border border-white/10">
                  {sendCtx.results.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() =>
                        setSendCtx((s) => ({ ...s, picked: customer }))
                      }
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                        sendCtx.picked?.id === customer.id
                          ? "bg-emerald-500 text-white"
                          : "text-white/80 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <span>{customer.email}</span>
                      {sendCtx.picked?.id === customer.id && <span>✓</span>}
                    </button>
                  ))}
                </div>
              )}

              {sendCtx.picked && (
                <div className="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-3 py-2">
                  <div className="text-sm text-emerald-300">
                    Selected: {sendCtx.picked.email}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <LoaderOverlay
        show={busy}
        title="Processing"
        subtitle="Please wait while we process your request"
      />
    </div>
  );
}
