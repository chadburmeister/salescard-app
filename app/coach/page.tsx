import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CoachChat } from "./CoachChat";

// ===========================================================================
// SKIP — the goals coach, at /coach. Server component guards access; the chat
// itself runs in the CoachChat client component (talks to /api/coach on Claude).
// Private to the signed-in rep.
// ===========================================================================
export default async function CoachPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const firstName = (session.user.name || "").trim().split(/\s+/)[0] || "there";

  return <CoachChat firstName={firstName} />;
}
