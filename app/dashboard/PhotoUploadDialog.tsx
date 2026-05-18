"use client";

import { useState, useRef, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Props {
  currentImage: string | null;
  userName: string;
  /** Optional custom trigger. If omitted, renders the default avatar button. */
  children?: (open: () => void) => React.ReactNode;
}

export function PhotoUploadDialog({ currentImage, userName, children }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [state, setState] = useState<"idle" | "uploading" | "redirecting" | "error" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && state !== "uploading") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, state]);

  const initials = getInitials(userName);

  const reset = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    setError(null);
    setState("idle");
    if (fileRef.current) fileRef.current.value = "";
  };

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      setError("Photo must be a JPEG, PNG, or WebP image.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("Photo must be under 5 MB.");
      return;
    }
    setError(null);
    setSelectedFile(f);
    if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const onUpload = async () => {
    if (!selectedFile) return;
    setState("uploading");
    setError(null);
    try {
      const fd = new FormData();
      fd.append("photo", selectedFile);
      const res = await fetch("/api/profile/upload-photo", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Upload failed.");
      setState("success");
      router.refresh();
      setTimeout(() => { setOpen(false); reset(); }, 900);
    } catch (err) {
      setError((err as Error).message || "Upload failed. Try again.");
      setState("error");
    }
  };

  const onReimportLinkedIn = async () => {
    setState("redirecting");
    await signIn("linkedin", { callbackUrl: "/dashboard" });
  };

  const openDialog = () => setOpen(true);

  return (
    <>
      {children ? (
        children(openDialog)
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
          onClick={(e) => {
            if (e.target === e.currentTarget && state !== "uploading") {
              setOpen(false);
              reset();
            }
          }}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative">
            <button
              type="button"
              onClick={() => { setOpen(false); reset(); }}
              disabled={state === "uploading"}
              className="absolute top-4 right-4 w-9 h-9 rounded-lg hover:bg-gray-100 disabled:opacity-40 text-gray-500 hover:text-gray-900 flex items-center justify-center"
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
              Used on your dashboard and your public SalesCard. JPEG, PNG, or WebP up to 5 MB.
            </p>

            <div className="flex items-center justify-center mb-6">
              <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-gray-100 shadow-sm bg-gray-50">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : currentImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentImage} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#3478C0] to-[#10B981] text-white font-black flex items-center justify-center text-4xl">
                    {initials}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 mb-4">
                {error}
              </div>
            )}

            {state === "success" && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 mb-4 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Photo updated.
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onFilePick}
            />

            <div className="space-y-2.5">
              {!selectedFile ? (
                <>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#3478C0] hover:bg-[#1E5A9C] text-white font-bold px-5 py-3 rounded-xl transition"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Upload from computer
                  </button>
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
                  <p className="text-xs text-gray-500 text-center pt-2">
                    Re-importing from LinkedIn signs you in again and refreshes your photo from your LinkedIn profile.
                  </p>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onUpload}
                    disabled={state === "uploading" || state === "success"}
                    className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold px-5 py-3 rounded-xl transition"
                  >
                    {state === "uploading" ? "Uploading…" : state === "success" ? "Saved" : "Use this photo"}
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    disabled={state === "uploading"}
                    className="w-full text-gray-700 hover:bg-gray-100 disabled:opacity-60 font-semibold px-5 py-2.5 rounded-xl transition"
                  >
                    Pick a different photo
                  </button>
                </>
              )}
            </div>
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
