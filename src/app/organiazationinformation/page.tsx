"use client";

import { useEffect, useMemo, useState } from "react";
import { Stepper } from "@/components/ui/Stepper";
import { LoaderOverlay } from "@/components/ui/LoaderOverlay";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";

type OrganizationPayload = {
  name: string;
  gstId: string;
  panNumber: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  bankDetails?: {
    accountNumber?: string;
    accountHolderName?: string;
    bankName?: string;
    ifscCode?: string;
    swiftCode?: string;
  };
};

export default function OrganiazationInformationPage() {
  const router = useRouter();
  const me = useCurrentUser();
  const steps = useMemo(
    () => [
      { key: "legal", label: "Legal" },
      { key: "address", label: "Address" },
      { key: "banking", label: "Banking" },
    ],
    []
  );
  const [active, setActive] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<OrganizationPayload>({
    name: "",
    gstId: "",
    panNumber: "",
    address: { street: "", city: "", state: "", country: "", zipCode: "" },
    bankDetails: {},
  });

  function next() {
    setError(null);
    setActive((i) => Math.min(i + 1, steps.length - 1));
  }
  function back() {
    setActive((i) => Math.max(i - 1, 0));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch<{
        success: boolean;
        data: { organization: { user: string; _id: string } };
      }>("/organization/profile", { method: "POST", body: data, auth: true });
      setSuccess(true);
      setTimeout(() => {
        router.replace(`/organization/${res.data.organization._id}`);
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
    if (me.data?.profile?.exists && me.data.profile.type === "organization") {
      router.replace(`/organization/${me.data.profile.id}`);
    }
  }, [me.data, router]);

  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 px-4 py-10 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <div className="sticky top-20 rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/60">
            Onboarding
          </div>
          <Stepper steps={steps} activeIndex={active} orientation="vertical" />
          <div className="mt-6 text-sm text-white/60">
            {active === 0 && "Company details and compliance."}
            {active === 1 && "Registered business address."}
            {active === 2 && "Banking for settlements."}
          </div>
          <div className="mt-6 rounded-lg border border-white/10 bg-black/40 p-4">
            <div className="text-xs uppercase tracking-wide text-white/40">
              Signed in
            </div>
            <div className="mt-1 text-sm text-white/90">
              {me.data?.user.email || "—"}
            </div>
            <div className="text-sm text-white/60">
              {me.data?.user.phoneNumber || "—"}
            </div>
          </div>
        </div>
      </div>
      <div className="lg:col-span-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h1 className="mb-1 text-xl font-semibold text-white">
            Organization setup
          </h1>
          <p className="mb-6 text-sm text-white/60">
            Provide your organization details.
          </p>

          {error ? (
            <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {active === 0 && (
            <div className="grid gap-4">
              <div>
                <label className="mb-1 block text-xs text-white/60">
                  Organization name
                </label>
                <input
                  value={data.name}
                  onChange={(e) => setData({ ...data, name: e.target.value })}
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                  placeholder="Acme Pvt Ltd"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-white/60">
                    GST ID
                  </label>
                  <input
                    value={data.gstId}
                    onChange={(e) =>
                      setData({ ...data, gstId: e.target.value.toUpperCase() })
                    }
                    className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="22AAAAA0000A1Z5"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/60">
                    PAN Number
                  </label>
                  <input
                    value={data.panNumber}
                    onChange={(e) =>
                      setData({
                        ...data,
                        panNumber: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="ABCDE1234F"
                  />
                </div>
              </div>
            </div>
          )}

          {active === 1 && (
            <div className="grid gap-4">
              <div>
                <label className="mb-1 block text-xs text-white/60">
                  Street
                </label>
                <input
                  value={data.address.street}
                  onChange={(e) =>
                    setData({
                      ...data,
                      address: { ...data.address, street: e.target.value },
                    })
                  }
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                  placeholder="123 Corporate Park"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-white/60">
                    City
                  </label>
                  <input
                    value={data.address.city}
                    onChange={(e) =>
                      setData({
                        ...data,
                        address: { ...data.address, city: e.target.value },
                      })
                    }
                    className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="Bengaluru"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/60">
                    State
                  </label>
                  <input
                    value={data.address.state}
                    onChange={(e) =>
                      setData({
                        ...data,
                        address: { ...data.address, state: e.target.value },
                      })
                    }
                    className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="Karnataka"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-white/60">
                    Country
                  </label>
                  <input
                    value={data.address.country}
                    onChange={(e) =>
                      setData({
                        ...data,
                        address: { ...data.address, country: e.target.value },
                      })
                    }
                    className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="India"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/60">
                    Zip code
                  </label>
                  <input
                    value={data.address.zipCode}
                    onChange={(e) =>
                      setData({
                        ...data,
                        address: { ...data.address, zipCode: e.target.value },
                      })
                    }
                    className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="560001"
                  />
                </div>
              </div>
            </div>
          )}

          {active === 2 && (
            <div className="grid gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-white/60">
                    Account number
                  </label>
                  <input
                    value={data.bankDetails?.accountNumber || ""}
                    onChange={(e) =>
                      setData({
                        ...data,
                        bankDetails: {
                          ...data.bankDetails,
                          accountNumber: e.target.value,
                        },
                      })
                    }
                    className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="000111222333"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/60">
                    Account holder name
                  </label>
                  <input
                    value={data.bankDetails?.accountHolderName || ""}
                    onChange={(e) =>
                      setData({
                        ...data,
                        bankDetails: {
                          ...data.bankDetails,
                          accountHolderName: e.target.value,
                        },
                      })
                    }
                    className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="John Doe"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-white/60">
                    Bank name
                  </label>
                  <input
                    value={data.bankDetails?.bankName || ""}
                    onChange={(e) =>
                      setData({
                        ...data,
                        bankDetails: {
                          ...data.bankDetails,
                          bankName: e.target.value,
                        },
                      })
                    }
                    className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="HDFC Bank"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/60">
                    IFSC
                  </label>
                  <input
                    value={data.bankDetails?.ifscCode || ""}
                    onChange={(e) =>
                      setData({
                        ...data,
                        bankDetails: {
                          ...data.bankDetails,
                          ifscCode: e.target.value,
                        },
                      })
                    }
                    className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="HDFC0000001"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/60">
                    SWIFT
                  </label>
                  <input
                    value={data.bankDetails?.swiftCode || ""}
                    onChange={(e) =>
                      setData({
                        ...data,
                        bankDetails: {
                          ...data.bankDetails,
                          swiftCode: e.target.value,
                        },
                      })
                    }
                    className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="HDFCINBBXXX"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={back}
              disabled={active === 0}
              className="rounded-md px-4 py-2 text-sm text-white/80 ring-1 ring-white/15 hover:bg-white/5 hover:text-white disabled:opacity-50"
            >
              Back
            </button>
            {active < steps.length - 1 ? (
              <button
                onClick={next}
                className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
              >
                Next
              </button>
            ) : (
              <button
                onClick={submit}
                className="rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-300"
              >
                Create profile
              </button>
            )}
          </div>
        </div>
      </div>

      <LoaderOverlay
        show={submitting || success}
        title={
          success ? "Profile ready" : "Preparing your organization profile"
        }
        subtitle={success ? "Redirecting you to your dashboard" : "Please wait"}
        success={success}
      />
    </div>
  );
}
