"use client";

import Link from "next/link";
import { NotificationsBell } from "@/components/notifications/NotificationsBell";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function HeaderBar() {
  const { data } = useCurrentUser();

  async function logout() {
    try {
      await fetch(
        (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/v1") +
          "/auth/logout",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
          },
        }
      );
    } catch {}
    localStorage.removeItem("auth_token");
    window.location.href = "/";
  }

  return (
    <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
      <Link
        href="/"
        className="flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white"
      >
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
        InvoicePro
      </Link>
      <nav className="flex items-center gap-2">
        {data?.user && <NotificationsBell />}
        {data?.user ? (
          <>
            <button
              onClick={logout}
              className="rounded-md bg-white text-black px-3 py-1.5 text-sm font-semibold hover:bg-white/90"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              href="/signup"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-white/90 ring-1 ring-white/15 hover:bg-white/5 hover:text-white"
            >
              Sign up
            </Link>
            <Link
              href="/signup?tab=login"
              className="rounded-md bg-white text-black px-3 py-1.5 text-sm font-semibold hover:bg-white/90"
            >
              Log in
            </Link>
          </>
        )}
      </nav>
    </div>
  );
}
