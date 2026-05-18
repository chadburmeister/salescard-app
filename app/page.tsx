import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Home: signed-in users go to their dashboard; everyone else goes to sign-in.
// The marketing landing page lives at salescard.ai (not app.salescard.ai).
export default async function Home() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/dashboard");
  }
  redirect("/sign-in");
}
