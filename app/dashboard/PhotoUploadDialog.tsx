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
          className="group rel
