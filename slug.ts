import { db } from "./db";

/** Make a URL-safe slug from a display name. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Find an unused card username slug, suffixing -2, -3 if needed. */
export async function uniqueUsername(name: string): Promise<string> {
  const base = slugify(name) || "rep";
  let candidate = base;
  let i = 2;
  while (true) {
    const exists = await db.card.findUnique({ where: { username: candidate } });
    if (!exists) return candidate;
    candidate = `${base}-${i++}`;
    if (i > 999) {
      // safety hatch — shouldn't ever happen
      return `${base}-${Math.random().toString(36).slice(2, 8)}`;
    }
  }
}
