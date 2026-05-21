import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/org";
import { RecruiterNav } from "./RecruiterNav";

// Shared chrome + access guard for every /recruiter/* route.
// Access = the user is a recruiter OR belongs to a recruiter org.
export default async function RecruiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/sign-in");

  const ctx = await getOrgContext(user.id);
  const hasAccess = user.isRecruiter || !!ctx;
  if (!hasAccess) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      <RecruiterNav orgName={ctx?.name ?? null} hasOrg={!!ctx} />
      {children}
    </div>
  );
}
