"use server";
 
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrgContext } from "@/lib/org";
import { sendOrgInvite } from "@/lib/email";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { OrgRole } from "@prisma/client";
 
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
 
// ===========================================================================
// CREATE TEAM — turns the current recruiter into the owner of a new org.
// The owner gets an OWNER membership so all org lookups go through membership.
// ===========================================================================
export async function createOrg(name: string) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: "Not signed in." };
  const userId = session.user.id;
 
  const existing = await db.orgMembership.findFirst({ where: { userId } });
  if (existing) return { ok: false as const, error: "You already belong to a team." };
 
  const cleanName = (name || "").trim() || "My Recruiting Team";
 
  await db.organization.create({
    data: {
      name: cleanName,
      ownerId: userId,
      memberships: { create: { userId, role: "OWNER" } },
    },
  });
 
  // Owner always has recruiter access.
  await db.user.update({ where: { id: userId }, data: { isRecruiter: true } });
 
  revalidatePath("/recruiter");
  redirect("/recruiter/team");
}
 
// ===========================================================================
// ADD OR INVITE A SEAT
//   - if a SalesCard user with that email exists -> add them directly
//   - otherwise -> create a pending invite they can accept via a join link
// Only the owner or an admin can do this.
// ===========================================================================
export type AddSeatResult =
  | { ok: true; mode: "added" | "invited"; email: string }
  | { ok: false; error: string };
 
export async function addOrInviteMember(input: {
  email: string;
  role?: OrgRole;
}): Promise<AddSeatResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };
  const me = session.user.id;
 
  const ctx = await getOrgContext(me);
  if (!ctx) return { ok: false, error: "Create a team first." };
  if (!ctx.canManage) return { ok: false, error: "Only the owner or an admin can add seats." };
 
  const email = (input.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email address." };
 
  const role: OrgRole = input.role === "ADMIN" ? "ADMIN" : "MEMBER";
 
  if (ctx.seatsAvailable <= 0) {
    return { ok: false, error: "No seats left on your plan. Free up a seat or raise your seat limit." };
  }
 
  const existingUser = await db.user.findUnique({ where: { email } });
 
  if (existingUser) {
    if (existingUser.id === me) return { ok: false, error: "You're already on the team." };
 
    const already = await db.orgMembership.findUnique({
      where: { orgId_userId: { orgId: ctx.id, userId: existingUser.id } },
    });
    if (already) return { ok: false, error: "They're already on your team." };
 
    const otherTeam = await db.orgMembership.findFirst({ where: { userId: existingUser.id } });
    if (otherTeam) return { ok: false, error: "That person already belongs to another team." };
 
    await db.orgMembership.create({
      data: { orgId: ctx.id, userId: existingUser.id, role },
    });
    await db.user.update({ where: { id: existingUser.id }, data: { isRecruiter: true } });
 
    revalidatePath("/recruiter/team");
    return { ok: true, mode: "added", email };
  }
 
  // No account yet -> pending invite.
  const dupe = await db.orgInvite.findFirst({
    where: { orgId: ctx.id, email, status: "PENDING" },
  });
  if (dupe) return { ok: false, error: "There's already a pending invite for that email." };
 
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const invite = await db.orgInvite.create({
    data: { orgId: ctx.id, email, role, invitedById: me, expiresAt },
  });
 
  // Best-effort invite email — the join link also shows in the UI as a fallback.
  try {
    const inviter = ctx.members.find((m) => m.userId === ctx.myUserId);
    await sendOrgInvite({
      inviteeEmail: email,
      inviterName: inviter?.name ?? "A teammate",
      inviterEmail: inviter?.email ?? null,
      orgName: ctx.name,
      role,
      token: invite.token,
    });
  } catch (err) {
    console.error("[addOrInviteMember] invite email failed:", err);
  }
 
  revalidatePath("/recruiter/team");
  return { ok: true, mode: "invited", email };
}
 
// ===========================================================================
// REVOKE A MEMBER (remove a seat). Owner can't be removed.
// ===========================================================================
export async function revokeMember(membershipId: string) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: "Not signed in." };
  const me = session.user.id;
 
  const ctx = await getOrgContext(me);
  if (!ctx) return { ok: false as const, error: "No team found." };
  if (!ctx.canManage) return { ok: false as const, error: "Only the owner or an admin can remove seats." };
 
  const m = await db.orgMembership.findUnique({ where: { id: membershipId } });
  if (!m || m.orgId !== ctx.id) return { ok: false as const, error: "That seat isn't on your team." };
  if (m.role === "OWNER") return { ok: false as const, error: "You can't remove the team owner." };
 
  await db.orgMembership.delete({ where: { id: membershipId } });
  revalidatePath("/recruiter/team");
  return { ok: true as const };
}
 
// ===========================================================================
// REVOKE A PENDING INVITE
// ===========================================================================
export async function revokeInvite(inviteId: string) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: "Not signed in." };
  const me = session.user.id;
 
  const ctx = await getOrgContext(me);
  if (!ctx) return { ok: false as const, error: "No team found." };
  if (!ctx.canManage) return { ok: false as const, error: "Only the owner or an admin can revoke invites." };
 
  const inv = await db.orgInvite.findUnique({ where: { id: inviteId } });
  if (!inv || inv.orgId !== ctx.id) return { ok: false as const, error: "That invite isn't on your team." };
 
  await db.orgInvite.update({ where: { id: inviteId }, data: { status: "REVOKED" } });
  revalidatePath("/recruiter/team");
  return { ok: true as const };
}
