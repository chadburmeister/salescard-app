import { auth, signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ForRecruitersPage() {
  const session = await auth();

  // Already a recruiter? Straight to the workspace.
  if (session?.user?.id) {
    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (user?.isRecruiter) {
      redirect("/recruiter");
    }
  }

  const signedIn = !!session?.user?.id;

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="text-xs tracking-widest font-bold text-[#0A66C2] uppercase mb-3">
          For recruiters
        </div>
        <h1 className="text-4xl font-black tracking-tight">
          <span className="text-[#0A66C2]">Sales</span>
          <span className="text-[#10B981]">Card</span>
        </h1>
        <p className="text-gray-600 mt-3 mb-10">
          Search a pool of sales reps with verified, quarter-by-quarter numbers — and stop
          taking resumes at face value.
        </p>

        {signedIn ? (
          <>
            <form
              action={async () => {
                "use server";
                const s = await auth();
                if (s?.user?.id) {
                  await db.user.update({
                    where: { id: s.user.id },
                    data: { isRecruiter: true },
                  });
                }
                redirect("/recruiter");
              }}
            >
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 bg-gray-900 text-white font-semibold px-6 py-3.5 rounded-full hover:bg-gray-800 transition"
              >
                Enter recruiter workspace →
              </button>
            </form>
            <p className="text-xs text-gray-500 mt-6">
              You&apos;re signed in. This unlocks the recruiter search and team tools.
            </p>
          </>
        ) : (
          <>
            <form
              action={async () => {
                "use server";
                await signIn("linkedin", { redirectTo: "/for-recruiters" });
              }}
            >
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-3 bg-[#0A66C2] text-white font-semibold px-6 py-3.5 rounded-full hover:bg-[#084d92] transition"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                  <path d="M20.5 2h-17C2.7 2 2 2.7 2 3.5v17c0 .8.7 1.5 1.5 1.5h17c.8 0 1.5-.7 1.5-1.5v-17c0-.8-.7-1.5-1.5-1.5zM8 19H5V9h3v10zm-1.5-11.3c-1 0-1.7-.8-1.7-1.7s.7-1.7 1.7-1.7 1.7.8 1.7 1.7-.8 1.7-1.7 1.7zM19 19h-3v-5c0-1.2-.9-2-2-2s-2 .8-2 2v5h-3V9h3v1.4c.5-.8 1.5-1.4 2.7-1.4 2.1 0 3.3 1.4 3.3 3.6V19z"/>
                </svg>
                Sign in with LinkedIn
              </button>
            </form>
            <p className="text-xs text-gray-500 mt-6">
              Same LinkedIn sign-in — this door sets you up as a recruiter.
            </p>
          </>
        )}

        <div className="mt-12 text-sm">
          <a href="https://salescard.ai" className="text-gray-500 hover:text-[#0A66C2]">
            ← Back to salescard.ai
          </a>
        </div>
      </div>
    </main>
  );
}
