"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CARD_BACKGROUND_THEMES } from "@/lib/cardThemes";
import { setCardBackground } from "./actions";

interface Props {
  currentTheme: string | null;
}

export function CardThemeDialog({ currentTheme }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string>(currentTheme ?? "stadium");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, isPending]);

  useEffect(() => {
    if (open) setSelected(currentTheme ?? "stadium");
  }, [open, currentTheme]);

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const res = await setCardBackground(selected);
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
        className="inline-flex items-center gap-2 text-[#3478C0] hover:text-[#1E5A9C] hover:bg-blue-50 font-semibold text-sm px-4 py-2 rounded-full transition"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="13.5" cy="6.5" r="2.5" />
          <circle cx="19" cy="13" r="2.5" />
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="10" cy="20" r="2.5" />
          <path d="M2 12c0-5.5 4.5-10 10-10s10 4.5 10 10c0 1.7-1.3 3-3 3s-3-1.3-3-3 1.3-3 3-3" />
        </svg>
        Change card background
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
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
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

            <div className="text-xs tracking-widest font-bold text-[#3478C0] uppercase mb-1">Card background</div>
            <h2 className="text-2xl font-black tracking-tight mb-2">Pick a theme.</h2>
            <p className="text-sm text-gray-600 mb-6">
              The theme applies to the photo zone on the front of your card. Shown on both your dashboard and your public card.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {CARD_BACKGROUND_THEMES.map((theme) => {
                const isSelected = selected === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setSelected(theme.id)}
                    className={`relative rounded-2xl border-2 transition text-left overflow-hidden ${
                      isSelected
                        ? "border-[#3478C0] shadow-lg ring-4 ring-[#3478C0]/15"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <div
                      className="h-24 flex items-center justify-center relative"
                      style={{ background: theme.photoBg }}
                    >
                      <div
                        className="w-12 h-12 rounded-full"
                        style={{
                          background: theme.accent || "#3478C0",
                          boxShadow: `inset 0 0 0 4px ${theme.photoBg}`,
                        }}
                      />
                      {theme.accent ? (
                        <>
                          <div
                            className="absolute top-1 left-2 right-2 h-[2px] opacity-50"
                            style={{ background: theme.accent }}
                          />
                          <div
                            className="absolute bottom-1 left-2 right-2 h-[2px] opacity-50"
                            style={{ background: theme.accent }}
                          />
                        </>
                      ) : null}
                    </div>
                    <div className="p-3 bg-white">
                      <div className="font-black text-sm tracking-tight">{theme.name}</div>
                      <div className="text-[11px] text-gray-500 leading-tight mt-0.5">
                        {theme.description}
                      </div>
                    </div>
                    {isSelected ? (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#3478C0] text-white flex items-center justify-center shadow">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>

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
                className="inline-flex items-center gap-2 bg-[#3478C0] hover:bg-[#1E5A9C] disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-full transition"
              >
                {isPending ? "Saving…" : "Save theme"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
