import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/org";
import { TeamClient } from "./TeamClient";

export const dynamic = "force-dynamic";

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const ctx = await getOrgContext(session.user.id);

  if (!ctx) {
    return <TeamClient data={null} />;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.salescard.ai";

  const data = {
    name: ctx.name,
    plan: ctx.plan,
    isOwner: ctx.isOwner,
    canManage: ctx.canManage,
    seatsUsed: ctx.seatsUsed,
    seatsReserved: ctx.seatsReserved,
    seatLimit: ctx.seatLimit,
    seatsAvailable: ctx.seatsAvailable,
    members: ctx.members.map((m) => ({
      membershipId: m.membershipId,
      name: m.name,
      email: m.email,
      role: m.role as string,
      joined: fmtDate(m.joinedAt),
      isYou: m.userId === ctx.myUserId,
    })),
    invites: ctx.pendingInvites.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role as string,
      joinUrl: `${baseUrl}/join/${i.token}`,
      expires: fmtDate(i.expiresAt),
    })),
  };

  return <TeamClient data={data} />;
}
