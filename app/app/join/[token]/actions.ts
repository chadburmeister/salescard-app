"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Success redirects to /recruiter; only failures return a value.
export type AcceptResult = { ok: false; error: string };

export async function acceptInvite(token: string): Promise<AcceptResult | void> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Please sign in to accept this invite." };
  const userId = session.user.id;

  const invite = await db.orgInvite.findUnique({
    where: { token },
    include: { org: { include: { memberships: true } } },
  });
  if (!invite) return { ok: false, error: "This invite link is invalid." };
  if (invite.status !== "PENDING") return { ok: false, error: "This invite is no longer active." };
  if (invite.expiresAt.getTime() < Date.now()) {
    await db.orgInvite.update({ where: { id: invite.id }, data: { status: "EXPIRED" } });
    return { ok: false, error: "This invite has expired. Ask the team owner to send a new one." };
  }

  // Already a member of this org? Just mark accepted and continue.
  const existing = await db.orgMembership.findUnique({
    where: { orgId_userId: { orgId: invite.orgId, userId } },
  });
  if (existing) {
    await db.orgInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    redirect("/recruiter");
  }

  // Belongs to a different org?
  const other = await db.orgMembership.findFirst({ where: { userId } });
  if (other) {
    return { ok: false, error: "You already belong to another team. Leave it before joining a new one." };
  }

  // Seat capacity.
  if (invite.org.memberships.length >= invite.org.seatLimit) {
    return { ok: false, error: "This team is full. Ask the owner to free up a seat." };
  }

  await db.orgMembership.create({
    data: { orgId: invite.orgId, userId, role: invite.role },
  });
  await db.orgInvite.update({
    where: { id: invite.id },
    data: { status: "ACCEPTED", acceptedAt: new Date() },
  });
  await db.user.update({ where: { id: userId }, data: { isRecruiter: true } });

  revalidatePath("/recruiter");
  redirect("/recruiter");
}
