"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCustomerOverview, customerActions } from "@/hooks/useCustomer";
import type { CustomerProfile } from "@/lib/customer";

export default function CustomerUpdatePage() {
  const router = useRouter();
  const { profile } = useCustomerOverview();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<
    Partial<CustomerProfile & { notes?: string }>
  >({});

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  async function save() {
    setSaving(true);
    try {
      await customerActions.updateProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        address: form.address,
        preferredPaymentMethod: form.preferredPaymentMethod,
        notes: form.notes,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-white">Update profile</h1>

      <div className="grid gap-4 rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-white/60">
              First name
            </label>
            <input
              value={form.firstName || ""}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/60">
              Last name
            </label>
            <input
              value={form.lastName || ""}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-white/60">Street</label>
          <input
            value={form.address?.street || ""}
            onChange={(e) =>
              setForm({
                ...form,
                address: { ...form.address, street: e.target.value },
              })
            }
            className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-white/60">City</label>
            <input
              value={form.address?.city || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  address: { ...form.address, city: e.target.value },
                })
              }
              className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/60">State</label>
            <input
              value={form.address?.state || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  address: { ...form.address, state: e.target.value },
                })
              }
              className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-white/60">Country</label>
            <input
              value={form.address?.country || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  address: { ...form.address, country: e.target.value },
                })
              }
              className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/60">Zip</label>
            <input
              value={form.address?.zipCode || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  address: { ...form.address, zipCode: e.target.value },
                })
              }
              className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-white/60">
            Preferred payment method
          </label>
          <select
            value={form.preferredPaymentMethod || "bank_transfer"}
            onChange={(e) =>
              setForm({ ...form, preferredPaymentMethod: e.target.value })
            }
            className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white"
          >
            <option value="credit_card">Credit Card</option>
            <option value="debit_card">Debit Card</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={() => router.back()}
            className="rounded-md px-4 py-2 text-sm text-white/80 ring-1 ring-white/15 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
