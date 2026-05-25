// /api/birthday/upload-photo
// Accepts multipart/form-data with "photo" (file) + "contactId" (string),
// uploads the recipient's source photo to Vercel Blob, and saves the URL to
// BirthdayContact.photoUrl. The Card Studio then cartoonizes it.

import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
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
  const contactId = formData.get("contactId");
  if (typeof contactId !== "string" || !contactId) {
    return NextResponse.json({ error: "Missing contact." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing photo." }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Photo must be JPEG, PNG, or WebP." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Photo is empty." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Photo must be under 8 MB." }, { status: 400 });
  }

  // Ownership check — only the rep who owns this contact can attach a photo.
  const contact = await db.birthdayContact.findFirst({
    where: { id: contactId, userId: session.user.id },
  });
  if (!contact) {
    return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  }

  const ext =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const key = `birthday-photos/${session.user.id}-${contactId}-${Date.now()}.${ext}`;

  try {
    const blob = await put(key, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type,
    });
    await db.birthdayContact.update({
      where: { id: contactId },
      data: { photoUrl: blob.url },
    });
    return NextResponse.json({ ok: true, url: blob.url });
  } catch (err) {
    console.error("[birthday/upload-photo] failed:", err);
    return NextResponse.json({ error: "Couldn't upload the photo. Try again." }, { status: 500 });
  }
}
