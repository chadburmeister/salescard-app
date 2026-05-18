"use client";

import { useState, useRef, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Props {
  currentImage: string | null;
  userName: string;
  /** "avatar" (default) shows the small circular trigger; "button" shows a labeled button. */
  variant?: "avatar" | "button";
  buttonLabel?: string;
}

export function PhotoUploadDialog({
  currentImage,
  userName,
  variant = "avatar",
  buttonLabel = "Change my photo",
}: Props) {
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
      {variant === "button" ? (
        <button
          type="button"
          onClick={openDialog}
          className="inline-flex items-center gap-2 text-[#3478C0] hover:text-[#1E5A9C] hover:bg-blue-50 font-semibold text-sm px-4 py-2 rounded-full transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
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
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-
