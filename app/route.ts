// /api/profile/upload-photo
// Accepts multipart/form-data with a single "photo" file, uploads it to Vercel
// Blob storage, and saves the public URL to User.image so the dashboard and
// public profile pages can render it. Overwrites the user's existing photo
// (same blob key) so we don't accumulate stale files.

import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("photo");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing photo." }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Photo must be JPEG, PNG, or WebP." },
      { status: 400 }
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Photo is empty." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Photo must be under 5 MB." }, { status: 400 });
  }

  const ext =
    file.type === "image/png"  ? "png"  :
    file.type === "image/webp" ? "webp" :
                                  "jpg";

  // Cache-bust on every upload so the new image shows immediately.
  const key = `profile-photos/${session.user.id}-${Date.now()}.${ext}`;

  try {
    const blob = await put(key, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type,
    });

    await db.user.update({
      where: { id: session.user.id },
      data: { image: blob.url },
    });

    return NextResponse.json({ ok: true, url: blob.url });
  } catch (err) {
    console.error("[upload-photo] failed:", err);
    const message =
      err instanceof Error
        ? err.message
        : "Couldn't upload your photo. Try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
