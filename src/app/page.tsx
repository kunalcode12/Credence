"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function Home() {
  const router = useRouter();
  const { data } = useCurrentUser();

  useEffect(() => {
    if (
      data?.user &&
      data.profile?.exists &&
      data.profile.id &&
      data.profile.type
    ) {
      const type = data.profile.type;
      router.replace(`/${type}/${data.profile.id}`);
    }
  }, [data, router]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="grid gap-6">
        <h1 className="text-4xl font-semibold tracking-tight text-white">
          Financial operations, simplified.
        </h1>
        <p className="max-w-2xl text-white/60">
          InvoicePro helps organizations issue invoices and customers pay
          securely. Sign up to get started.
        </p>
        <div className="mt-2 flex items-center gap-3">
          <a
            href="/signup"
            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
          >
            Get started
          </a>
          <a
            href="/signup?tab=login"
            className="rounded-md px-4 py-2 text-sm font-medium text-white/80 ring-1 ring-white/15 hover:bg-white/5 hover:text-white"
          >
            I already have an account
          </a>
        </div>
      </div>
    </div>
  );
}
