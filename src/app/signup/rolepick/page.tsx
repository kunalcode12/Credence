"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function RolePickPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(role: "customer" | "organization" | "financer") {
    setLoading(role);
    setError(null);
    try {
      await apiFetch("/auth/choose-role", {
        method: "POST",
        body: { role },
        auth: true,
      });
      if (role === "customer") {
        router.replace("/customerInformation");
      } else if (role === "financer") {
        router.replace("/financerInformation");
      } else {
        router.replace("/organizationinformation");
      }
    } catch (e) {
      setError(
        e instanceof Error && e.message ? e.message : "Failed to set role"
      );
      setLoading(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-white">Pick your role</h1>
        <p className="mt-1 text-sm text-white/50">
          Tailored setup for organizations and customers
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4">
        <button
          onClick={() => choose("customer")}
          disabled={loading !== null}
          className="group rounded-xl border border-white/10 bg-white/5 p-5 text-left hover:bg-white/10 disabled:opacity-60"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-semibold text-white">
                Im a Customer
              </div>
              <div className="text-sm text-white/60">
                Pay and manage your invoices
              </div>
            </div>
            <span className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-black">
              {loading === "customer" ? "Redirecting…" : "Choose"}
            </span>
          </div>
        </button>

        <button
          onClick={() => choose("organization")}
          disabled={loading !== null}
          className="group rounded-xl border border-white/10 bg-white/5 p-5 text-left hover:bg-white/10 disabled:opacity-60"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-semibold text-white">
                Im an Organization
              </div>
              <div className="text-sm text-white/60">
                Create and send invoices
              </div>
            </div>
            <span className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-black">
              {loading === "organization" ? "Redirecting…" : "Choose"}
            </span>
          </div>
        </button>

        <button
          onClick={() => choose("financer")}
          disabled={loading !== null}
          className="group rounded-xl border border-white/10 bg-white/5 p-5 text-left hover:bg-white/10 disabled:opacity-60"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-semibold text-white">
                Im an Financer
              </div>
              <div className="text-sm text-white/60">Finance invoices</div>
            </div>
            <span className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-black">
              {loading === "Financer" ? "Redirecting…" : "Choose"}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
