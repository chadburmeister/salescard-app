"use client";

import { useState, useEffect } from "react";

interface Props {
  repName: string;
  score: number;
  tierLabel: string;
  username: string;
  /** Optional override; defaults to https://app.salescard.ai/u/{username} */
  cardUrl?: string;
}

export function ShareDialog({ repName, score, tierLabel, username, cardUrl }: Props) {
  const url = cardUrl || `https://app.salescard.ai/u/${username}`;
  const defaultCaption = buildDefaultCaption({ repName, score, tierLabel, url });

  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState(defaultCaption);
  const [copied, setCopied] = useState<"caption" | "url" | null>(null);

  // Reset state when reopening
  useEffect(() => {
    if (open) {
      setCaption(defaultCaption);
      setCopied(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const copyTo = async (text: string, which: "caption" | "url") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      // ignore; fallback below
    }
  };

  const openLinkedIn = async () => {
    // LinkedIn auto-unfurls the URL into a rich card using our OG image.
    // Their share dialog no longer accepts pre-filled text, so we copy the
    // caption first so the user can paste it.
    await copyTo(caption, "caption");
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=720,height=640");
  };

  const openTwitter = () => {
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}`;
    window.open(intent, "_blank", "noopener,noreferrer,width=620,height=640");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-[#0A66C2] hover:bg-[#08539d] text-white font-semibold px-5 py-2.5 rounded-full transition"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5V8h3v11zM6.5 6.7a1.74 1.74 0 110-3.48 1.74 1.74 0 010 3.48zM19 19h-3v-5.6c0-3.37-4-3.12-4 0V19h-3V8h3v1.76c1.4-2.59 7-2.78 7 2.48V19z" />
        </svg>
        Share my card
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 backdrop-blur-[3px] p-5"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 sm:p-9 shadow-2xl relative">
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

            <div className="text-xs tracking-widest font-bold text-[#3478C0] uppercase mb-1">
              Put your numbers in front of recruiters
            </div>
            <h2 className="text-2xl font-black tracking-tight mb-2">Share your SalesCard.</h2>
            <p className="text-gray-600 text-sm mb-5">
              Pick a channel. Your card&apos;s preview image and verified score will unfurl automatically when posted.
            </p>

            {/* Caption editor */}
            <label className="block mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-bold text-gray-700">Suggested caption</span>
                <button
                  type="button"
                  onClick={() => copyTo(caption, "caption")}
                  className="text-xs font-bold text-[#3478C0] hover:underline"
                >
                  {copied === "caption" ? "Copied!" : "Copy"}
                </button>
              </div>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={6}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm leading-relaxed focus:outline-none focus:border-[#3478C0] bg-white resize-y"
              />
            </label>

            {/* URL row */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 flex items-center justify-between gap-3 mb-5">
              <code className="text-xs text-gray-700 truncate flex-1">{url}</code>
              <button
                type="button"
                onClick={() => copyTo(url, "url")}
                className="text-xs font-bold text-[#3478C0] hover:underline whitespace-nowrap"
              >
                {copied === "url" ? "Copied!" : "Copy URL"}
              </button>
            </div>

            {/* Share targets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={openLinkedIn}
                className="inline-flex items-center justify-center gap-2 bg-[#0A66C2] hover:bg-[#08539d] text-white font-bold px-4 py-3 rounded-xl transition"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5V8h3v11zM6.5 6.7a1.74 1.74 0 110-3.48 1.74 1.74 0 010 3.48zM19 19h-3v-5.6c0-3.37-4-3.12-4 0V19h-3V8h3v1.76c1.4-2.59 7-2.78 7 2.48V19z" />
                </svg>
                Post to LinkedIn
              </button>
              <button
                type="button"
                onClick={openTwitter}
                className="inline-flex items-center justify-center gap-2 bg-[#0F0F0F] hover:bg-black text-white font-bold px-4 py-3 rounded-xl transition"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Post to X
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-5">
              LinkedIn doesn&apos;t accept pre-filled captions — we copied yours to the clipboard. Just paste it in the post box.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function buildDefaultCaption({
  repName,
  score,
  tierLabel,
  url,
}: {
  repName: string;
  score: number;
  tierLabel: string;
  url: string;
}): string {
  const first = repName.split(/\s+/)[0] || repName;
  const tierClean = (tierLabel || "").trim();
  const tierLine = tierClean ? `Tier: ${tierClean}` : "";

  return [
    `Every sales rep says they're "top 10%."`,
    `I finally got receipts.`,
    ``,
    `My SalesCard Score: ${score} / 100`,
    tierLine,
    `Eight quarters. Verified by my managers and peers.`,
    ``,
    `Numbers don't lie. Reps shouldn't have to either.`,
    ``,
    `${url}`,
    ``,
    `#sales #salescareer`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}
