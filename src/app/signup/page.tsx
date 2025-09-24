"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, LoginResponse, SignupResponse } from "@/lib/api";
import { saveAuthToken } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const params = useSearchParams();
  const initialTab = params?.get("tab") === "login" ? "login" : "signup";
  const [tab, setTab] = useState<"signup" | "login">(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = params?.get("tab");
    if (t === "login" || t === "signup") setTab(t);
  }, [params]);

  const Title = useMemo(
    () => (tab === "signup" ? "Create your account" : "Welcome back"),
    [tab]
  );

  async function handleSignup(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      const email = String(formData.get("email") || "");
      const phoneNumber = String(formData.get("phoneNumber") || "");
      const password = String(formData.get("password") || "");
      const confirmPassword = String(formData.get("confirmPassword") || "");

      const res = await apiFetch<SignupResponse>("/auth/signup", {
        method: "POST",
        body: { email, password, confirmPassword, phoneNumber },
      });
      console.log(res);
      saveAuthToken(res.data.token);
      router.replace("/signup/rolepick");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to sign up";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      const email = String(formData.get("email") || "");
      const password = String(formData.get("password") || "");
      const res = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      saveAuthToken(res.data.token);

      if (res.data.user.role !== "pending") {
        router.replace(`/${res.data.user.role}/${res.data.user.id}`);
      } else {
        router.replace(`/signup/rolepick`);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to log in";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-white">{Title}</h1>
        <p className="mt-1 text-sm text-white/50">
          Secure access to your invoices and payments
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 rounded-lg bg-white/5 p-1 ring-1 ring-white/10">
        <button
          onClick={() => setTab("signup")}
          className={`rounded-md px-3 py-2 text-sm font-medium transition ${
            tab === "signup"
              ? "bg-white text-black"
              : "text-white/70 hover:text-white"
          }`}
        >
          Sign up
        </button>
        <button
          onClick={() => setTab("login")}
          className={`rounded-md px-3 py-2 text-sm font-medium transition ${
            tab === "login"
              ? "bg-white text-black"
              : "text-white/70 hover:text-white"
          }`}
        >
          Log in
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {tab === "signup" ? (
        <form
          action={handleSignup}
          className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-5"
        >
          <div>
            <label className="mb-1 block text-xs text-white/60">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/60">Phone</label>
            <input
              name="phoneNumber"
              inputMode="numeric"
              required
              className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
              placeholder="9876543210"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-white/60">
                Password
              </label>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/60">
                Confirm
              </label>
              <input
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                placeholder="••••••••"
              />
            </div>
          </div>
          <button
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
      ) : (
        <form
          action={handleLogin}
          className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-5"
        >
          <div>
            <label className="mb-1 block text-xs text-white/60">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/60">Password</label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
              placeholder="••••••••"
            />
          </div>
          <button
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      )}
    </div>
  );
}
