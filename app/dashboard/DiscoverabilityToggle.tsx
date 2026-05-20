"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setRecruiterOptIn } from "./discoverability";

interface Props {
  initialOptIn: boolean;
}

export function DiscoverabilityToggle({ initialOptIn }: Props) {
  const router = useRouter();
  const [optIn, setOptIn] = useState(initialOptIn);
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    const next = !optIn;
    setOptIn(next); // optimistic
    startTransition(async () => {
      const res = await setRecruiterOptIn(next);
      if (!res.ok) {
        setOptIn(!next); // revert on failure
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-10 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: optIn ? "rgba(16,185,129,0.12)" : "rgba(107,114,128,0.10)" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={optIn ? "#10B981" : "#6B7280"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <div>
          <div className="font-black tracking-tight text-lg">List me in recruiter search</div>
          <div className="text-sm text-gray-600 max-w-md">
            Let verified recruiters discover your card. You stay in control — turn this off any time.
            {optIn ? (
              <span className="text-emerald-600 font-semibold"> You&apos;re currently discoverable.</span>
            ) : (
              <span className="text-gray-500 font-semibold"> You&apos;re currently hidden from search.</span>
            )}
          </div>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={optIn}
        onClick={toggle}
        disabled={isPending}
        className={`relative w-14 h-8 rounded-full transition flex-shrink-0 ${optIn ? "bg-emerald-500" : "bg-gray-300"} ${isPending ? "opacity-60" : ""}`}
        aria-label="Toggle recruiter discoverability"
      >
        <span className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${optIn ? "translate-x-6" : ""}`} />
      </button>
    </div>
  );
}
