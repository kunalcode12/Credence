"use client";

import { useEffect, useState } from "react";
import { apiFetch, MeResponse } from "@/lib/api";

export function useCurrentUser() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MeResponse["data"] | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiFetch<MeResponse>("/auth/me", { auth: true });
        if (mounted) setData(res.data);
      } catch (e: unknown) {
        if (mounted)
          setError(e instanceof Error ? e.message : "Failed to load user");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { loading, error, data };
}
