"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";

interface Props {
  currentImage: string | null;
  userName: string;
  variant?: "avatar" | "button";
  buttonLabel?: string;
}

export function PhotoUploadDialog({
  currentImage,
  userName,
  variant = "avatar",
  buttonLabel = "Change my photo",
}: Props) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "redirecting">("idle");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const initials = getInitials(userName);
  const openDialog = () => setOpen(true);

  const onReimportLinkedIn = async () => {
    setState("redirecting");
    await signIn("linkedin", { callbackUrl: "/dashboard" });
  };

  return (
    <>
      {variant === "button" ? (
        <button
          type="button"
          onClick={openDialog}
          className="inline-flex items-center gap-2 text-[#3478C0] hover:text-[#1E5A9C] hover:bg-blue-50 font-semibold text-sm px-4 py-2 rounded-full transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          {buttonLabel}
        </button>
      ) : (
        <button
          type="button"
          onClick={openDialog}
          className="group relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-white shadow-sm hover:ring-[#3478C0] transition"
          aria-label="Update profile photo"
        >
          {currentImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentImage} alt={userName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#3478C0] to-[#10B981] text-white font-black flex items-center justify-center text-sm">
              {initials}
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/45 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </div>
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 backdrop-blur-[3px] p-5"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 flex items-center justify-center"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="text-xs tracking-widest font-bold text-[#3478C0] uppercase mb-1">Your photo</div>
            <h2 className="text-2xl font-black tracking-tight mb-1">Profile photo</h2>
            <p className="text-sm text-gray-600 mb-6">
              Your card photo is pulled from your LinkedIn profile. Re-import to refresh it.
            </p>

            <div className="flex items-center justify-center mb-6">
              <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-gray-100 shadow-sm bg-gray-50">
                {currentImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentImage} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#3478C0] to-[#10B981] text-white font-black flex items-center justify-center text-4xl">
                    {initials}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onReimportLinkedIn}
              disabled={state === "redirecting"}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#0A66C2] hover:bg-[#08539d] disabled:opacity-60 text-white font-bold px-5 py-3 rounded-xl transition"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5V8h3v11zM6.5 6.7a1.74 1.74 0 110-3.48 1.74 1.74 0 010 3.48zM19 19h-3v-5.6c0-3.37-4-3.12-4 0V19h-3V8h3v1.76c1.4-2.59 7-2.78 7 2.48V19z" />
              </svg>
              {state === "redirecting" ? "Redirecting…" : "Re-import from LinkedIn"}
            </button>

            <p className="text-xs text-gray-500 text-center pt-3">
              Custom uploads are coming soon. For now we use your LinkedIn photo so it stays in sync with your real profile.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function getInitials(s: string): string {
  const cleaned = (s || "").trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/[\s@.]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
