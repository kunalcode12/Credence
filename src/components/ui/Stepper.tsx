"use client";

import React from "react";

type Step = {
  key: string;
  label: string;
};

export function Stepper({
  steps,
  activeIndex,
  orientation = "vertical",
}: {
  steps: Step[];
  activeIndex: number;
  orientation?: "horizontal" | "vertical";
}) {
  if (orientation === "horizontal") {
    return (
      <div className="flex items-center gap-3">
        {steps.map((step, idx) => {
          const isActive = idx === activeIndex;
          const isCompleted = idx < activeIndex;
          return (
            <div key={step.key} className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition ${
                  isCompleted
                    ? "bg-emerald-500 text-black"
                    : isActive
                    ? "bg-white text-black"
                    : "bg-white/10 text-white/60"
                }`}
              >
                {isCompleted ? "✓" : idx + 1}
              </div>
              <div
                className={`text-sm ${
                  isActive ? "text-white" : "text-white/60"
                }`}
              >
                {step.label}
              </div>
              {idx < steps.length - 1 && (
                <div className="h-px w-10 bg-white/10" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <ol className="relative ml-4 border-l border-white/10">
      {steps.map((step, idx) => {
        const isActive = idx === activeIndex;
        const isCompleted = idx < activeIndex;
        return (
          <li key={step.key} className="mb-6 ml-6">
            <span
              className={`absolute -left-4 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ring-2 transition ${
                isCompleted
                  ? "bg-emerald-500 text-black ring-emerald-400/40"
                  : isActive
                  ? "bg-white text-black ring-white/30"
                  : "bg-white/10 text-white/60 ring-white/10"
              }`}
            >
              {isCompleted ? "✓" : idx + 1}
            </span>
            <h3
              className={`text-sm font-medium ${
                isActive ? "text-white" : "text-white/70"
              }`}
            >
              {step.label}
            </h3>
          </li>
        );
      })}
    </ol>
  );
}
