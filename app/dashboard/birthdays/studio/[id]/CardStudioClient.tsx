"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Wand2,
  Sparkles,
  Cake,
  Loader2,
  Check,
  RefreshCw,
} from "lucide-react";
import {
  CARTOON_STYLES,
  CARD_TONES,
  DEFAULT_CARTOON_STYLE,
  DEFAULT_CARD_TONE,
  CARTOON_SCENES,
  DEFAULT_CARTOON_SCENE,
  firstName,
  birthdayMessage,
  type GroupKey,
  type CartoonStyle,
  type CardTone,
  type CartoonScene,
} from "@/lib/birthday";
import {
  generateCartoonForContact,
  generateCardWordsForContact,
  saveCard,
} from "./actions";

const ROSE_GRADIENT = "linear-gradient(135deg, #F43F5E, #FB923C)";

// Shrink large photos in the browser before upload. Phone photos are often
// 5-15 MB, well over the server's upload limit; this downscales to <=1280px and
// re-encodes as JPEG (typically a few hundred KB). Returns null if the browser
// can't process the file (e.g. HEIC), in which case we upload the original.
async function downscaleImage(file: File, maxDim = 1280, quality = 0.85): Promise<Blob | null> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return null;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, w, h);
    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
    );
  } catch {
    return null;
  }
}

interface StudioContact {
  id: string;
  name: string;
  email: string;
  group: GroupKey;
  groupLabel: string;
  birthdayLabel: string | null;
  photoUrl: string | null;
  cartoonUrl: string | null;
  cardMessage: string | null;
  cartoonStyle: string | null;
}

export function CardStudioClient({ contact }: { contact: StudioContact }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const first = firstName(contact.name);

  const [photoUrl, setPhotoUrl] = useState<string | null>(contact.photoUrl);
  const [cartoonUrl, setCartoonUrl] = useState<string | null>(contact.cartoonUrl);
  const [style, setStyle] = useState<CartoonStyle>(
    (contact.cartoonStyle as CartoonStyle) || DEFAULT_CARTOON_STYLE,
  );
  const [scene, setScene] = useState<CartoonScene>(DEFAULT_CARTOON_SCENE);
  const [customDesc, setCustomDesc] = useState("");
  const [message, setMessage] = useState<string>(
    contact.cardMessage?.trim() || birthdayMessage(contact.group, contact.name),
  );
  const [tone, setTone] = useState<CardTone>(DEFAULT_CARD_TONE);
  const [notes, setNotes] = useState("");

  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [writing, setWriting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }

  async function onPickPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      // Shrink big photos client-side so they fit under the upload size limit.
      let blob: Blob = file;
      let filename = file.name || "photo.jpg";
      const small = await downscaleImage(file);
      if (small && small.size < file.size) {
        blob = small;
        filename = "photo.jpg";
      }

      const fd = new FormData();
      fd.append("photo", blob, filename);
      fd.append("contactId", contact.id);

      const res = await fetch("/api/birthday/upload-photo", { method: "POST", body: fd });
      const raw = await res.text();
      let data: { url?: string; error?: string } | null = null;
      try {
        data = raw ? (JSON.parse(raw) as { url?: string; error?: string }) : null;
      } catch {
        data = null;
      }
      if (!res.ok || !data?.url) {
        const msg =
          data?.error ||
          (res.status === 413
            ? "That photo is too large. Please pick one under about 4 MB."
            : "Couldn't upload that photo. Try a different one.");
        throw new Error(msg);
      }
      setPhotoUrl(data.url);
      flash("Photo uploaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload that photo.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onGenerate() {
    if (!photoUrl) {
      setError("Upload a photo first.");
      return;
    }
    if (scene === "custom" && style !== "original" && !customDesc.trim()) {
      setError("Describe what you'd like the picture to be.");
      return;
    }
    setError(null);
    setGenerating(true);
    try {
      const res = await generateCartoonForContact({
        contactId: contact.id,
        style,
        scene,
        customPrompt: customDesc,
      });
      if (res.ok) {
        setCartoonUrl(res.url);
        flash("Cartoon ready!");
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate the cartoon.");
    } finally {
      setGenerating(false);
    }
  }

  async function onWrite() {
    setError(null);
    setWriting(true);
    try {
      const res = await generateCardWordsForContact({ contactId: contact.id, tone, notes });
      if (res.ok) {
        setMessage(res.message);
        flash("Words drafted");
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't write the words.");
    } finally {
      setWriting(false);
    }
  }

  async function onSave() {
    setError(null);
    setSaving(true);
    try {
      await saveCard(contact.id, { cardMessage: message, includeCartoon: !!cartoonUrl });
      flash("Card saved");
      router.push("/dashboard/birthdays");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the card.");
      setSaving(false);
    }
  }

  const stepNum =
    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white";

  return (
    <main className="min-h-screen" style={{ background: "#FFF7F5" }}>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-white"
            style={{ background: ROSE_GRADIENT }}
          >
            <Sparkles className="h-3.5 w-3.5" /> Card Studio
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900">
            Design {first}&apos;s birthday card
          </h1>
          <p className="mt-1 text-gray-500">
            {contact.groupLabel}
            {contact.birthdayLabel ? ` · 🎂 ${contact.birthdayLabel}` : ""} · {contact.email}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          {/* ---------------- Controls ---------------- */}
          <div className="space-y-8">
            {/* Step 1 — photo */}
            <section>
              <div className="mb-3 flex items-center gap-2">
                <span className={stepNum} style={{ background: ROSE_GRADIENT }}>1</span>
                <h2 className="text-lg font-bold text-gray-900">Upload a photo of {first}</h2>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onPickPhoto}
                className="hidden"
              />
              <div className="flex items-center gap-4">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-rose-100 bg-white">
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt="Source" className="h-full w-full object-cover" />
                  ) : (
                    <Upload className="h-7 w-7 text-rose-300" />
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-50 disabled:opacity-60"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {photoUrl ? "Replace photo" : "Choose photo"}
                  </button>
                  <p className="mt-2 text-xs text-gray-400">A clear, front-facing photo works best. JPEG, PNG, or WebP, up to 8&nbsp;MB.</p>
                </div>
              </div>
            </section>

            {/* Step 2 — style + generate */}
            <section>
              <div className="mb-3 flex items-center gap-2">
                <span className={stepNum} style={{ background: ROSE_GRADIENT }}>2</span>
                <h2 className="text-lg font-bold text-gray-900">Choose the image &amp; create it</h2>
              </div>

              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">What should the picture be?</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CARTOON_SCENES.map((sc) => (
                  <button
                    key={sc.key}
                    type="button"
                    onClick={() => setScene(sc.key)}
                    className={
                      "rounded-xl border px-3 py-2.5 text-sm font-semibold transition " +
                      (scene === sc.key
                        ? "border-rose-400 bg-rose-50 text-rose-700 ring-2 ring-rose-100"
                        : "border-gray-200 bg-white text-gray-600 hover:border-rose-200")
                    }
                  >
                    {sc.label}
                  </button>
                ))}
              </div>

              {scene === "custom" && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={customDesc}
                    onChange={(e) => setCustomDesc(e.target.value)}
                    placeholder="e.g. riding a bike through a confetti parade"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                  />
                  <p className="mt-1 text-xs text-gray-400">Keep it friendly — no R-rated images.</p>
                </div>
              )}

              <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-gray-400">Art style</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CARTOON_STYLES.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setStyle(s.key)}
                    className={
                      "rounded-xl border px-3 py-2.5 text-sm font-semibold transition " +
                      (style === s.key
                        ? "border-rose-400 bg-rose-50 text-rose-700 ring-2 ring-rose-100"
                        : "border-gray-200 bg-white text-gray-600 hover:border-rose-200")
                    }
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              {style === "original" && (
                <p className="mt-2 text-xs text-gray-400">Uses your uploaded photo as the card image — no AI changes.</p>
              )}
              <button
                type="button"
                onClick={onGenerate}
                disabled={generating || !photoUrl}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: ROSE_GRADIENT }}
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : cartoonUrl ? (
                  <RefreshCw className="h-4 w-4" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                {generating ? (style === "original" ? "Using photo…" : "Creating image…") : style === "original" ? "Use original photo" : cartoonUrl ? "Regenerate image" : "Create image"}
              </button>
              {!photoUrl && (
                <p className="mt-2 text-xs text-gray-400">Upload a photo above to enable this.</p>
              )}
            </section>

            {/* Step 3 — words */}
            <section>
              <div className="mb-3 flex items-center gap-2">
                <span className={stepNum} style={{ background: ROSE_GRADIENT }}>3</span>
                <h2 className="text-lg font-bold text-gray-900">Write the words</h2>
              </div>

              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Tone</span>
                {CARD_TONES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTone(t.key)}
                    className={
                      "rounded-full px-3 py-1 text-xs font-semibold transition " +
                      (tone === t.key
                        ? "bg-rose-100 text-rose-700 ring-1 ring-rose-200"
                        : "bg-white text-gray-500 ring-1 ring-gray-200 hover:bg-gray-50")
                    }
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional: anything to mention? (e.g. just got promoted, loves golf)"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
              />

              <button
                type="button"
                onClick={onWrite}
                disabled={writing}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-50 disabled:opacity-60"
              >
                {writing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {writing ? "Writing…" : "Write with AI"}
              </button>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="mt-3 w-full resize-y rounded-xl border border-gray-200 px-4 py-3 text-[15px] leading-relaxed text-gray-900 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
              />
            </section>
          </div>

          {/* ---------------- Live preview ---------------- */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Live preview</p>
            <div
              className="overflow-hidden rounded-3xl border bg-white shadow-sm"
              style={{ borderColor: "#FBE4DD" }}
            >
              {cartoonUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cartoonUrl} alt="Cartoon preview" className="aspect-square w-full object-cover" />
              ) : (
                <div
                  className="flex aspect-square w-full flex-col items-center justify-center text-white"
                  style={{ background: ROSE_GRADIENT }}
                >
                  <Cake className="h-12 w-12" />
                  <p className="mt-3 px-6 text-center text-sm text-rose-50">
                    Your cartoon will appear here once you create it.
                  </p>
                </div>
              )}
              <div className="px-6 py-6">
                <p className="text-center text-2xl font-black tracking-tight" style={{ color: "#F43F5E" }}>
                  Happy Birthday, {first}!
                </p>
                <p className="mt-3 whitespace-pre-wrap text-center text-[15px] leading-relaxed text-gray-700">
                  {message || "Your card message will appear here…"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
              style={{ background: ROSE_GRADIENT }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? "Saving…" : "Save card to " + first}
            </button>
            <p className="mt-2 text-center text-xs text-gray-400">
              This card is what {first} receives on their birthday — after you approve it.
            </p>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}
