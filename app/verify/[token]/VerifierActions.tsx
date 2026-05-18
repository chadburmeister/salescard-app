"use client";

import { useState } from "react";
import { approveVerification, rejectVerification } from "./actions";

interface Props {
  token: string;
  repName: string;
}

export function VerifierActions({ token, repName }: Props) {
  const [state, setState] = useState<"idle" | "loading-approve" | "loading-reject" | "approved" | "rejected" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleApprove = async () => {
    if (!confirm(`Confirm that ${repName}'s numbers are accurate?`)) return;
    setState("loading-approve");
    setError(null);
    try {
      const res = await approveVerification(token);
      if (res.ok) {
        setState("approved");
      } else {
        setError(res.error);
        setState("error");
      }
    } catch (err) {
      setError((err as Error).message || "Something went wrong.");
      setState("error");
    }
  };

  const handleReject = async () => {
    setState("loading-reject");
    setError(null);
    try {
      const res = await rejectVerification(token, rejectionReason);
      if (res.ok) {
        setState("rejected");
      } else {
        setError(res.error);
        setState("error");
      }
    } catch (err) {
      setError((err as Error).message || "Something went wrong.");
      setState("error");
    }
  };

  if (state === "approved") {
    return (
      <div className="text-center py-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 className="text-2xl font-black tracking-tight mb-2">Thanks for verifying.</h2>
        <p className="text-gray-700 max-w-sm mx-auto">
          {repName}&apos;s SalesCard has been updated with verified quarters. They&apos;ll get an email shortly.
        </p>
      </div>
    );
  }

  if (state === "rejected") {
    return (
      <div className="text-center py-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
        </div>
        <h2 className="text-2xl font-black tracking-tight mb-2">Reported as inaccurate.</h2>
        <p className="text-gray-700 max-w-sm mx-auto">
          We&apos;ve let {repName} know. Those quarters stay on their card at half weight until verified by someone else.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleApprove}
        disabled={state.startsWith("loading")}
        className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold px-6 py-3.5 rounded-full transition"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        {state === "loading-approve" ? "Confirming..." : "Confirm these numbers"}
      </button>

      {!showRejectInput ? (
        <button
          type="button"
          onClick={() => setShowRejectInput(true)}
          disabled={state.startsWith("loading")}
          className="w-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-semibold px-6 py-2.5 rounded-full transition"
        >
          These don&apos;t look right
        </button>
      ) : (
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
          <label className="block">
            <div className="text-sm font-bold text-gray-700 mb-1.5">
              What looks off? <span className="text-gray-400 font-normal">(optional, helps {repName} fix it)</span>
            </div>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              rows={3}
              placeholder="e.g. Q4 closed-won looks higher than what I remember"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#3478C0] bg-white"
            />
          </label>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              type="button"
              onClick={() => setShowRejectInput(false)}
              className="text-sm text-gray-600 hover:bg-gray-200 font-semibold px-3 py-1.5 rounded"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={state.startsWith("loading")}
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold px-4 py-1.5 rounded-full text-sm transition"
            >
              {state === "loading-reject" ? "Submitting..." : "Submit flag"}
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 text-center pt-2">
        This takes one click. {repName} sees only verifier name + outcome — no personal notes unless you write them above.
      </p>
    </div>
  );
}
