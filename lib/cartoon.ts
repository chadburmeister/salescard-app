// Turns an uploaded photo of a birthday recipient into a cartoon portrait using
// the Gemini image model, then stores the result in Vercel Blob.
//
// Server-only (imports @vercel/blob). Env vars:
//   GEMINI_API_KEY      — key from Google AI Studio
//   GEMINI_IMAGE_MODEL  — optional model override (default below). Lets us swap
//                         models without a code change if Google renames it.

import { put } from "@vercel/blob";

const DEFAULT_MODEL = "gemini-3.1-flash-image-preview";

function endpoint(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

// Style key -> the descriptive phrase fed to the image model.
const STYLE_PROMPTS: Record<string, string> = {
  cartoon:
    "a warm, friendly hand-illustrated cartoon greeting-card style with clean bold outlines and soft cheerful colors",
  pixar:
    "a glossy 3D animated-movie character style with soft studio lighting, big expressive eyes, cute and polished",
  caricature:
    "a playful caricature with gently exaggerated, good-natured features — lighthearted and fun, never unflattering",
  watercolor:
    "a soft watercolor painted portrait style with gentle washes, light texture, and a warm hand-painted feel",
};

export function stylePrompt(style: string | null | undefined): string {
  return STYLE_PROMPTS[style ?? "cartoon"] ?? STYLE_PROMPTS.cartoon;
}

// Strict content guardrail applied to EVERY generated image.
const SAFETY =
  "Keep the image wholesome, warm, and strictly family-friendly. Absolutely no nudity, sexual, suggestive, violent, gory, hateful, or otherwise R-rated content. If a request would require any of that, instead produce a tasteful, celebratory birthday image.";
const CARD =
  "Roughly square composition, suitable for the front of a birthday greeting card. Do not put any text, letters, or words in the image.";

function buildPrompt(opts: { scene: string; style: string; customPrompt?: string }): string {
  const { scene, style, customPrompt } = opts;

  if (scene === "silhouette") {
    return [
      "Create a clean, elegant black silhouette of the person in this photo — a solid dark figure (head and shoulders) set against a bright, cheerful birthday background with soft balloons and a little confetti.",
      "Capture their recognizable outline: hairstyle and posture.",
      CARD,
      SAFETY,
    ].join(" ");
  }

  if (scene === "silhouette-cake") {
    return [
      "Create a clean, elegant black silhouette of the person in this photo beside a birthday cake topped with lit candles — a solid dark figure against a bright, cheerful celebratory background with balloons and confetti.",
      "Capture their recognizable outline: hairstyle and posture.",
      CARD,
      SAFETY,
    ].join(" ");
  }

  if (scene === "custom" && customPrompt && customPrompt.trim()) {
    return [
      `Illustrate a warm, fully-rendered birthday scene as ${stylePrompt(style)} — full color and detail, NOT a plain silhouette or outline.`,
      `The scene to depict: ${customPrompt.trim()}.`,
      "Make the person from the provided photo the clear main character with a recognizable, happy face; draw any other people as friendly, fully-illustrated background characters (not shadows).",
      CARD,
      SAFETY,
    ].join(" ");
  }

  // portrait (default)
  return [
    `Transform the real person in this photo into ${stylePrompt(style)}.`,
    "Keep their likeness clearly recognizable — hair, skin tone, glasses, facial hair, and other distinctive features — but make it a flattering, joyful birthday portrait with a big happy smile.",
    "Surround them with a cheerful birthday scene: a party hat or balloons, a little confetti, and a warm festive background.",
    "Head-and-shoulders.",
    CARD,
    SAFETY,
  ].join(" ");
}

interface GeminiInlineData {
  data?: string;
  mimeType?: string;   // REST responses use camelCase
  mime_type?: string;  // requests / some shapes use snake_case
}
interface GeminiInlinePart {
  text?: string;
  inlineData?: GeminiInlineData;
  inline_data?: GeminiInlineData;
}
interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: GeminiInlinePart[] } }>;
}

export interface GenerateCartoonInput {
  photoUrl: string; // public URL of the uploaded source photo (Vercel Blob)
  style: string;
  scene: string; // portrait | silhouette | silhouette-cake | custom
  customPrompt?: string; // free-text description when scene === "custom"
  ownerId: string; // signed-in rep, used in the blob key
  contactId: string;
}

/** Generate a cartoon from the source photo and return the stored blob URL. */
export async function generateCartoon(input: GenerateCartoonInput): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Cartoon generation isn't set up yet (missing GEMINI_API_KEY).");
  }
  const model = process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL;

  // 1) Read the source photo bytes.
  const srcRes = await fetch(input.photoUrl);
  if (!srcRes.ok) {
    throw new Error("Couldn't read the uploaded photo. Try uploading it again.");
  }
  const srcBuf = Buffer.from(await srcRes.arrayBuffer());
  const srcMime = srcRes.headers.get("content-type") || "image/jpeg";

  // 2) Ask Gemini to cartoonize it.
  const body = {
    contents: [
      {
        parts: [
          { text: buildPrompt({ scene: input.scene, style: input.style, customPrompt: input.customPrompt }) },
          { inline_data: { mime_type: srcMime, data: srcBuf.toString("base64") } },
        ],
      },
    ],
    generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
  };

  const res = await fetch(endpoint(model), {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[cartoon] Gemini error", res.status, detail);
    if (res.status === 429) {
      throw new Error(
        "Google's image service is over its quota right now. Make sure billing is enabled on your Gemini key, then try again in a minute.",
      );
    }
    if (res.status === 400 || res.status === 403) {
      throw new Error(
        "Google rejected the image request — check that your Gemini API key is valid and has image generation enabled.",
      );
    }
    throw new Error(`The image service hit a snag (${res.status}). Try again in a moment.`);
  }

  const data = (await res.json()) as GeminiResponse;
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const imgPart = parts.find((pt) => pt.inlineData?.data || pt.inline_data?.data);
  const inline = imgPart?.inlineData || imgPart?.inline_data;
  if (!inline?.data) {
    throw new Error("The image service didn't return a picture. Try a clearer photo or a different style.");
  }
  const outMime = inline.mimeType || inline.mime_type || "image/png";
  const outBuf = Buffer.from(inline.data, "base64");

  // 3) Store it and return the public URL.
  const ext = outMime.includes("png") ? "png" : outMime.includes("webp") ? "webp" : "jpg";
  const key = `birthday-cartoons/${input.ownerId}-${input.contactId}-${Date.now()}.${ext}`;
  const blob = await put(key, outBuf, {
    access: "public",
    addRandomSuffix: false,
    contentType: outMime,
  });
  return blob.url;
}
