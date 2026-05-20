"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function setRecruiterOptIn(optIn: boolean) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: "Not signed in." };

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { card: true },
  });
  if (!user?.card) return { ok: false as const, error: "Build your card first." };

  await db.card.update({
    where: { id: user.card.id },
    data: { recruiterOptIn: optIn },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/u/${user.card.username}`);
  return { ok: true as const };
}
