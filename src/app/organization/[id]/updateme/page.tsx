"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useOrganizationOverview,
  organizationActions,
} from "@/hooks/useOrganization";
import type { OrganizationProfile } from "@/lib/organization";

export default function OrganizationUpdatePage() {
  const router = useRouter();
  const { profile } = useOrganizationOverview();
  const [saving, setSaving] = useState(false);
  type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
  };
  const [form, setForm] = useState<DeepPartial<OrganizationProfile>>({});

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  async function save() {
    setSaving(true);
    try {
      const update: Partial<OrganizationProfile> = {};
      if (form.name !== undefined) update.name = form.name as string;
      if (form.gstId !== undefined) update.gstId = form.gstId as string;
      if (form.panNumber !== undefined)
        update.panNumber = form.panNumber as string;
      if (form.address) {
        const base = profile?.address ?? {
          street: "",
          city: "",
          state: "",
          country: "",
          zipCode: "",
        };
        update.address = {
          street: form.address.street ?? base.street,
          city: form.address.city ?? base.city,
          state: form.address.state ?? base.state,
          country: form.address.country ?? base.country,
          zipCode: form.address.zipCode ?? base.zipCode,
        };
      }
      await organizationActions.updateProfile(update);
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-white">
        Update organization
      </h1>

      <div className="grid gap-4 rounded-xl border border-white/10 bg-white/5 p-6">
        <div>
          <label className="mb-1 block text-xs text-white/60">
            Organization name
          </label>
          <input
            value={form.name || ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-white/60">GST ID</label>
            <input
              value={form.gstId || ""}
              onChange={(e) =>
                setForm({ ...form, gstId: e.target.value.toUpperCase() })
              }
              className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/60">
              PAN Number
            </label>
            <input
              value={form.panNumber || ""}
              onChange={(e) =>
                setForm({ ...form, panNumber: e.target.value.toUpperCase() })
              }
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

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={() => router.back()}
            className="rounded-md px-4 py-2 text-sm text-white/80 ring-1 ring-white/15 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
