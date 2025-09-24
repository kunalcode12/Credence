"use client";

import React from "react";

export function LoaderOverlay({
  show,
  title,
  subtitle,
  success,
}: {
  show: boolean;
  title: string;
  subtitle?: string;
  success?: boolean;
}) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-black/60 p-6 text-center ring-1 ring-white/10">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-white/5">
          {success ? (
            <span className="text-2xl text-emerald-400">✓</span>
          ) : (
            <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}
        </div>
        <div className="text-base font-semibold text-white">{title}</div>
        {subtitle ? (
          <div className="mt-1 text-sm text-white/60">{subtitle}</div>
        ) : null}
      </div>
    </div>
  );
}
