"use client";

import { useState } from "react";
import { requestVerification } from "./actions";

export interface RequestVerificationDialogProps {
  /** All quarter periods on the rep's card (sorted oldest → newest) */
  quarterPeriods: string[];
  /** Which periods are already verified — we still allow re-verification, but pre-uncheck them */
  alreadyVerified: string[];
}

export function RequestVerificationDialog({
  quarterPeriods,
  alreadyVerified,
}: RequestVerificationDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ verifierEmail: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // form fields
  const [verifierEmail, setVerifierEmail] = useState("");
  const [verifierName, setVerifierName] = useState("");
  const [relationship, setRelationship] = useState("manager");

  const verifiedSet = new Set(alreadyVerified);
  const [selectedPeriods, setSelectedPeriods] = useState<Set<string>>(
    new Set(quarterPeriods.filter(p => !verifiedSet.has(p))),
  );

  const togglePeriod = (p: string) => {
    setSelectedPeriods(prev => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const openDialog = () => {
    setOpen(true);
    setError(null);
    setDone(null);
  };
  const closeDialog = () => {
    setOpen(false);
    setError(null);
    if (done) {
      // reset form once they've sent and closed
      setVerifierEmail("");
      setVerifierName("");
      setRelationship("manager");
      setSelectedPeriods(new Set(quarterPeriods.filter(p => !verifiedSet.has(p))));
      setDone(null);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await requestVerification({
        verifierEmail,
        verifierName: verifierName || undefined,
        relationship,
        periods: Array.from(selectedPeriods),
      });
      if (res.ok) {
        setDone({ verifierEmail: res.verifierEmail });
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError((err as Error).message || "Something went wrong. Try again?");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:border-[#0A66C2] hover:text-[#0A66C2] text-gray-700 font-semibold px-5 py-2.5 rounded-full transition"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        Request verification
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeDialog(); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-7 relative animate-[fadeIn_0.18s_ease]">
            <button
              type="button"
              onClick={closeDialog}
              aria-label="Close"
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>

            {done ? (
              <div className="text-center py-2">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h3 className="text-xl font-black tracking-tight mb-2">Verification request sent</h3>
                <p className="text-gray-700 text-sm mb-1">
                  We emailed <strong>{done.verifierEmail}</strong> with a link to confirm your numbers.
                </p>
                <p className="text-gray-500 text-xs mt-3">
                  They&apos;ll see your name and the numbers, and click one button. Your card updates as soon as they confirm.
                </p>
                <button
                  type="button"
                  onClick={closeDialog}
                  className="mt-6 inline-flex items-center gap-2 bg-[#0A66C2] hover:bg-[#1E5A9C] text-white font-semibold px-6 py-2.5 rounded-full transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="text-xs tracking-widest font-bold text-[#0A66C2] uppercase mb-2">Verification</div>
                <h2 className="text-2xl font-black tracking-tight mb-1">Who can verify your numbers?</h2>
                <p className="text-gray-600 text-sm mb-5">
                  We&apos;ll send them an email with your numbers and a one-click confirm link. No login required for them.
                </p>

                <form onSubmit={onSubmit} className="space-y-4">
                  <label className="block">
                    <div className="text-sm font-bold text-gray-700 mb-1.5">Verifier email <span className="text-red-500">*</span></div>
                    <input
                      type="email"
                      required
                      placeholder="manager@yourcompany.com"
                      value={verifierEmail}
                      onChange={e => setVerifierEmail(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:outline-none focus:border-[#0A66C2]"
                    />
                  </label>

                  <label className="block">
                    <div className="text-sm font-bold text-gray-700 mb-1.5">Verifier name <span className="text-gray-400 font-normal">(optional)</span></div>
                    <input
                      type="text"
                      placeholder="e.g. Jordan Smith"
                      value={verifierName}
                      onChange={e => setVerifierName(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:outline-none focus:border-[#0A66C2]"
                    />
                  </label>

                  <label className="block">
                    <div className="text-sm font-bold text-gray-700 mb-1.5">Relationship</div>
                    <select
                      value={relationship}
                      onChange={e => setRelationship(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:outline-none focus:border-[#0A66C2] bg-white"
                    >
                      <option value="manager">Current or former manager</option>
                      <option value="peer">Peer rep</option>
                      <option value="ops">RevOps / Sales Ops</option>
                      <option value="other">Other</option>
                    </select>
                  </label>

                  <div>
                    <div className="text-sm font-bold text-gray-700 mb-2">Which quarters?</div>
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      {quarterPeriods.map((p) => {
                        const checked = selectedPeriods.has(p);
                        const isVerified = verifiedSet.has(p);
                        return (
                          <label
                            key={p}
                            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 cursor-pointer text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePeriod(p)}
                              className="rounded border-gray-300"
                            />
                            <span className="font-bold text-gray-900">{p}</span>
                            {isVerified && (
                              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                                already verified
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-1">
                    <button
                      type="button"
                      onClick={closeDialog}
                      className="text-gray-600 hover:bg-gray-100 font-semibold px-4 py-2 rounded-full"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || selectedPeriods.size === 0}
                      className="inline-flex items-center gap-2 bg-[#0A66C2] hover:bg-[#1E5A9C] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold px-6 py-2.5 rounded-full transition"
                    >
                      {submitting ? "Sending..." : "Send verification email →"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
