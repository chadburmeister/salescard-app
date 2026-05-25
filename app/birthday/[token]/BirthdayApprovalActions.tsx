"use client";

import { useState } from "react";
import { approveBirthday, skipBirthday } from "./actions";

const ROSE_GRADIENT = "linear-gradient(90deg,#F43F5E,#FB923C)";

interface Props {
  token: string;
  recipientFirst: string;
  bdayLabel: string;
  initialMessage: string;
}

export function BirthdayApprovalActions({ token, recipientFirst, bdayLabel, initialMessage }: Props) {
  const [message, setMessage] = useState(initialMessage);
  const [state, setState] = useState<
    "idle" | "loading-approve" | "loading-skip" | "approved" | "sent" | "skipped" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setState("loading-approve");
    setError(null);
    try {
      const res = await approveBirthday(token, message);
      if (res.ok) {
        setState(res.status === "SENT" ? "sent" : "approved");
      } else {
        setError(res.error);
        setState("error");
      }
    } catch (err) {
      setError((err as Error).message || "Something went wrong.");
      setState("error");
    }
  };

  const handleSkip = async () => {
    if (!confirm(`Skip ${recipientFirst}'s birthday this year? Nothing will be sent.`)) return;
    setState("loading-skip");
    setError(null);
    try {
      const res = await skipBirthday(token);
      if (res.ok) {
        setState("skipped");
      } else {
        setError(res.error);
        setState("error");
      }
    } catch (err) {
      setError((err as Error).message || "Something went wrong.");
      setState("error");
    }
  };

  if (state === "sent") {
    return (
      <div className="text-center py-6">
        <div className="text-4xl mb-3">🎉</div>
        <h2 className="text-2xl font-black tracking-tight mb-2">Sent!</h2>
        <p className="text-gray-700 max-w-sm mx-auto">
          Your birthday message just went out to {recipientFirst}. Nice — you remembered.
        </p>
      </div>
    );
  }

  if (state === "approved") {
    return (
      <div className="text-center py-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 className="text-2xl font-black tracking-tight mb-2">Approved.</h2>
        <p className="text-gray-700 max-w-sm mx-auto">
          We&apos;ll send your message to {recipientFirst} on {bdayLabel}. Nothing more to do.
        </p>
      </div>
    );
  }

  if (state === "skipped") {
    return (
      <div className="text-center py-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </div>
        <h2 className="text-2xl font-black tracking-tight mb-2">Skipped.</h2>
        <p className="text-gray-700 max-w-sm mx-auto">
          No message will be sent to {recipientFirst} this year.
        </p>
      </div>
    );
  }

  const busy = state === "loading-approve" || state === "loading-skip";

  return (
    <div className="space-y-4">
      <label className="block">
        <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">
          Message — edit anything you like
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[15px] leading-relaxed text-gray-900 focus:outline-none focus:border-[#F43F5E] bg-white resize-y"
        />
      </label>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleApprove}
        disabled={busy}
        className="w-full inline-flex items-center justify-center gap-2 text-white font-bold px-6 py-3.5 rounded-full transition disabled:opacity-60"
        style={{ background: ROSE_GRADIENT }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        {state === "loading-approve" ? "Approving…" : "Approve & send"}
      </button>

      <button
        type="button"
        onClick={handleSkip}
        disabled={busy}
        className="w-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-semibold px-6 py-2.5 rounded-full transition disabled:opacity-60"
      >
        {state === "loading-skip" ? "Skipping…" : "Skip this one"}
      </button>

      <p className="text-xs text-gray-500 text-center pt-1">
        Nothing is sent to {recipientFirst} until you approve it.
      </p>
    </div>
  );
}
