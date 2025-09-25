"use client";

import { useEffect, useMemo, useState } from "react";
import { Stepper } from "@/components/ui/Stepper";
import { LoaderOverlay } from "@/components/ui/LoaderOverlay";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";

// Matches backend financerModel.profile
type FinancerProfilePayload = {
  firstName: string;
  lastName: string;
  companyName?: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  documents: Array<{ label: string; url: string }>;
};

export default function FinancerInformationPage() {
  const router = useRouter();
  const me = useCurrentUser();
  const steps = useMemo(
    () => [
      { key: "basic", label: "Basic" },
      { key: "company", label: "Company" },
      { key: "address", label: "Address" },
      { key: "documents", label: "Documents" },
    ],
    []
  );
  const [active, setActive] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<FinancerProfilePayload>({
    firstName: "",
    lastName: "",
    companyName: "",
    address: {},
    documents: [],
  });

  function next() {
    setError(null);
    setActive((i) => Math.min(i + 1, steps.length - 1));
  }
  function back() {
    setActive((i) => Math.max(i - 1, 0));
  }

  function canProceed(idx: number) {
    if (idx === 0) {
      return (
        data.firstName.trim().length > 0 && data.lastName.trim().length > 0
      );
    }
    if (idx === 2) {
      // address step validation
      const addr = data.address || {};
      return (
        Boolean(addr.street) &&
        Boolean(addr.city) &&
        Boolean(addr.state) &&
        Boolean(addr.country) &&
        Boolean(addr.zipCode)
      );
    }
    return true;
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch<{
        success: boolean;
        data: { financer: { _id: string; user?: string; profile?: unknown } };
      }>("/financer/profile", {
        method: "POST",
        body: { profile: data },
        auth: true,
      });

      // Store minimal financer info locally for quick access
      try {
        if (typeof window !== "undefined") {
          const payload = {
            id: res.data.financer._id,
            profile: data,
          };
          localStorage.setItem("financer_profile", JSON.stringify(payload));
        }
      } catch {}

      setSuccess(true);
      setTimeout(() => {
        router.replace(`/financer/${res.data.financer._id}`);
      }, 1200);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Failed to create profile";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    // If user already has a profile, you may redirect; financer type is not in union, so avoid strict match
    if (me.data?.profile?.exists) {
      router.replace("/");
    }
  }, [me.data, router]);

  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 px-4 py-10 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="mb-3 text-sm font-semibold tracking-wide text-white/70">
            Financer profile
          </div>
          <Stepper steps={steps} activeIndex={active} />

          <div className="mt-8 space-y-4 text-sm">
            <div className="flex items-center gap-2 text-white/60">
              <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
              <span>Progress auto-saves before submit.</span>
            </div>
            <div className="flex items-center gap-2 text-white/60">
              <span className="h-2 w-2 rounded-full bg-white/30" />
              <span>Use Next to proceed. All required fields glow.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h1 className="mb-1 text-xl font-semibold text-white">
            Financer setup
          </h1>
          <p className="mb-6 text-sm text-white/60">
            Complete your financer profile to proceed.
          </p>

          {error ? (
            <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {active === 0 && (
            <div className="grid gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-white/60">
                    First name
                  </label>
                  <input
                    value={data.firstName}
                    onChange={(e) =>
                      setData({ ...data, firstName: e.target.value })
                    }
                    className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/60">
                    Last name
                  </label>
                  <input
                    value={data.lastName}
                    onChange={(e) =>
                      setData({ ...data, lastName: e.target.value })
                    }
                    className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="Doe"
                  />
                </div>
              </div>
            </div>
          )}

          {active === 1 && (
            <div className="grid gap-4">
              <div>
                <label className="mb-1 block text-xs text-white/60">
                  Company name
                </label>
                <input
                  value={data.companyName || ""}
                  onChange={(e) =>
                    setData({ ...data, companyName: e.target.value })
                  }
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                  placeholder="Acme Capital Pvt Ltd"
                />
              </div>
            </div>
          )}

          {active === 2 && (
            <div className="grid gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-white/60">
                    Street
                  </label>
                  <input
                    value={data.address.street || ""}
                    onChange={(e) =>
                      setData({
                        ...data,
                        address: { ...data.address, street: e.target.value },
                      })
                    }
                    className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="221B Baker Street"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/60">
                    City
                  </label>
                  <input
                    value={data.address.city || ""}
                    onChange={(e) =>
                      setData({
                        ...data,
                        address: { ...data.address, city: e.target.value },
                      })
                    }
                    className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="London"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-white/60">
                    State
                  </label>
                  <input
                    value={data.address.state || ""}
                    onChange={(e) =>
                      setData({
                        ...data,
                        address: { ...data.address, state: e.target.value },
                      })
                    }
                    className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="England"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/60">
                    Country
                  </label>
                  <input
                    value={data.address.country || ""}
                    onChange={(e) =>
                      setData({
                        ...data,
                        address: { ...data.address, country: e.target.value },
                      })
                    }
                    className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="United Kingdom"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/60">
                    ZIP / Postal code
                  </label>
                  <input
                    value={data.address.zipCode || ""}
                    onChange={(e) =>
                      setData({
                        ...data,
                        address: { ...data.address, zipCode: e.target.value },
                      })
                    }
                    className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="NW1 6XE"
                  />
                </div>
              </div>
            </div>
          )}

          {active === 3 && (
            <div className="grid gap-4">
              <div className="rounded-lg border border-white/10 bg-black/30">
                {data.documents.length === 0 ? (
                  <div className="p-4 text-sm text-white/60">
                    No documents added.
                  </div>
                ) : (
                  <ul className="divide-y divide-white/10">
                    {data.documents.map((doc, idx) => (
                      <li key={idx} className="flex items-center gap-3 p-3">
                        <input
                          value={doc.label}
                          onChange={(e) => {
                            const docs = [...data.documents];
                            docs[idx] = { ...docs[idx], label: e.target.value };
                            setData({ ...data, documents: docs });
                          }}
                          placeholder="Label (e.g., PAN Card)"
                          className="w-40 rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                        />
                        <input
                          value={doc.url}
                          onChange={(e) => {
                            const docs = [...data.documents];
                            docs[idx] = { ...docs[idx], url: e.target.value };
                            setData({ ...data, documents: docs });
                          }}
                          placeholder="Document URL"
                          className="flex-1 rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                        />
                        <button
                          onClick={() => {
                            const docs = data.documents.filter(
                              (_, i) => i !== idx
                            );
                            setData({ ...data, documents: docs });
                          }}
                          className="rounded-md px-2 py-1 text-sm text-white/80 ring-1 ring-white/15 hover:bg-white/5"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <button
                  onClick={() =>
                    setData({
                      ...data,
                      documents: [...data.documents, { label: "", url: "" }],
                    })
                  }
                  className="rounded-md px-3 py-1.5 text-sm text-white/90 ring-1 ring-white/15 hover:bg-white/5"
                >
                  + Add document
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={back}
              disabled={active === 0}
              className="rounded-md px-3 py-1.5 text-sm text-white/80 ring-1 ring-white/15 disabled:opacity-50 hover:bg-white/5"
            >
              Back
            </button>
            {active < steps.length - 1 ? (
              <button
                onClick={next}
                disabled={!canProceed(active)}
                className="rounded-md bg-white px-4 py-1.5 text-sm font-semibold text-black disabled:opacity-50"
              >
                Next
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={!canProceed(2) || submitting}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-400 px-4 py-1.5 text-sm font-semibold text-black hover:bg-emerald-300 disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Finish setup"}
              </button>
            )}
          </div>
        </div>
      </div>

      <LoaderOverlay
        show={submitting || success}
        title={success ? "Profile created" : "Creating profile"}
        success={success}
      />
    </div>
  );
}
