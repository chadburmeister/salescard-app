"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCurrentCompany } from "./actions";

interface Props {
  currentCompany: string | null;
}

export function EditCompanyDialog({ currentCompany }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentCompany ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(currentCompany ?? "");
      setError(null);
    }
  }, [open, currentCompany]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, isPending]);

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const res = await setCurrentCompany(value.trim() || null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
      setOpen(false);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-[#0A66C2] hover:text-[#1E5A9C] hover:bg-blue-50 font-semibold text-sm px-4 py-2 rounded-full transition"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18" />
          <path d="M5 21V7l8-4v18" />
          <path d="M19 21V11l-6-4" />
        </svg>
        Edit current company
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 backdrop-blur-[3px] p-5"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) setOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="absolute top-4 right-4 w-9 h-9 rounded-lg hover:bg-gray-100 disabled:opacity-40 text-gray-500 hover:text-gray-900 flex items-center justify-center"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="text-xs tracking-widest font-bold text-[#0A66C2] uppercase mb-1">Your profile</div>
            <h2 className="text-2xl font-black tracking-tight mb-1">Current company</h2>
            <p className="text-sm text-gray-600 mb-5">
              Shown on the back of your card. Leave blank to hide.
            </p>

            <label className="block mb-5">
              <div className="text-[11px] font-black tracking-widest text-gray-500 uppercase mb-1.5">
                Company name
              </div>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isPending) handleSave();
                }}
                placeholder="e.g. Acme Inc."
                autoFocus
                maxLength={200}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:border-[#0A66C2] bg-white"
              />
            </label>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 mb-4">
                {error}
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="text-gray-700 hover:bg-gray-100 disabled:opacity-50 font-semibold px-4 py-2 rounded-full transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="inline-flex items-center gap-2 bg-[#0A66C2] hover:bg-[#1E5A9C] disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-full transition"
              >
                {isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
