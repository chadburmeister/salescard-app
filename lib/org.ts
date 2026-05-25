import { db } from "@/lib/db";
import type { OrgRole } from "@prisma/client";

// ===========================================================================
// Org context — the single source of truth for "which team is this user on".
// A user belongs to at most one org. The owner has an OrgMembership too
// (role OWNER), so membership lookups cover owners and members uniformly.
// ===========================================================================

export interface OrgMember {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: OrgRole;
  joinedAt: Date;
}

export interface OrgPendingInvite {
  id: string;
  email: string;
  role: OrgRole;
  token: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface OrgContext {
  id: string;
  name: string;
  ownerId: string;
  plan: string;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  currentPeriodEnd: Date | null;
  myUserId: string;
  myRole: OrgRole;
  isOwner: boolean;
  canManage: boolean; // owner or admin
  members: OrgMember[];
  pendingInvites: OrgPendingInvite[];
  seatsUsed: number; // active members (incl. owner)
  seatsReserved: number; // pending invites
  seatLimit: number;
  seatsAvailable: number; // max(0, limit - used - reserved)
}

/** Returns the org this user belongs to (as owner or member), or null. */
export async function getOrgContext(userId: string): Promise<OrgContext | null> {
  const membership = await db.orgMembership.findFirst({
    where: { userId },
    include: {
      org: {
        include: {
          memberships: { include: { user: true }, orderBy: { createdAt: "asc" } },
          invites: { where: { status: "PENDING" }, orderBy: { createdAt: "desc" } },
        },
      },
    },
  });
  if (!membership) return null;

  const org = membership.org;

  const members: OrgMember[] = org.memberships.map((m) => ({
    membershipId: m.id,
    userId: m.userId,
    name: m.user.name ?? m.user.email.split("@")[0],
    email: m.user.email,
    role: m.role,
    joinedAt: m.createdAt,
  }));

  const pendingInvites: OrgPendingInvite[] = org.invites.map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    token: i.token,
    createdAt: i.createdAt,
    expiresAt: i.expiresAt,
  }));

  const myRole = membership.role;
  const seatsUsed = members.length;
  const seatsReserved = pendingInvites.length;

  return {
    id: org.id,
    name: org.name,
    ownerId: org.ownerId,
    plan: org.plan,
    subscriptionStatus: org.subscriptionStatus,
    stripeCustomerId: org.stripeCustomerId,
    currentPeriodEnd: org.currentPeriodEnd,
    myUserId: userId,
    myRole,
    isOwner: myRole === "OWNER",
    canManage: myRole === "OWNER" || myRole === "ADMIN",
    members,
    pendingInvites,
    seatsUsed,
    seatsReserved,
    seatLimit: org.seatLimit,
    seatsAvailable: Math.max(0, org.seatLimit - seatsUsed - seatsReserved),
  };
}
