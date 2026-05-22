import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

// ===========================================================================
// SKIP — the goals coach. This is the landing/intro page at /coach.
// Step 2: page shell. The "Start with Skip" button lights up in step 3 once
// the chat backend (Claude) is wired. Everything here is private to the rep.
// ===========================================================================
export default async function CoachPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const firstName = (session.user.name || "").trim().split(/\s+/)[0] || "there";

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111827]">
      {/* top bar */}
      <header className="max-w-3xl mx-auto px-6 pt-6 flex items-center justify-between">
        <div className="font-black text-xl tracking-tight">
          <span className="text-[#3478C0]">Sales</span>
          <span className="text-[#10B981]">Card</span>
        </div>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">
          ← Dashboard
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* hero */}
        <span className="inline-block bg-[#e8f1fb] text-[#3478C0] font-bold text-xs tracking-widest uppercase px-3 py-1.5 rounded-full mb-5">
          Goals Coach
        </span>
        <h1 className="text-4xl font-black tracking-tight leading-tight mb-3">
          Hey {firstName} — meet Skip.
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-2xl">
          Skip is your goals coach. In a calm, one-question-at-a-time conversation,
          Skip helps you get clear on what you actually want, why it matters, and the
          very first step to get there — so you stop running fast in the wrong direction.
        </p>

        {/* what to expect */}
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="text-2xl mb-2">🔒</div>
            <div className="font-bold mb-1">Completely private</div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Everything you share stays on your account. Recruiters never see it.
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="text-2xl mb-2">💬</div>
            <div className="font-bold mb-1">One question at a time</div>
            <p className="text-sm text-gray-600 leading-relaxed">
              No forms. Just a conversation, at your pace — about 15–20 minutes.
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="text-2xl mb-2">📈</div>
            <div className="font-bold mb-1">Grounded in your numbers</div>
            <p className="text-sm text-gray-600 leading-relaxed">
              At the end, Skip can use your SalesCard score to show where you really stand.
            </p>
          </div>
        </div>

        {/* CTA — wired to the chat in step 3 */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="inline-flex items-center bg-[#3478C0] text-white font-bold text-base px-7 py-3.5 rounded-full hover:bg-[#2d68a8] transition-colors"
          >
            Start with Skip
          </button>
          <span className="text-sm text-gray-400">Takes about 15–20 minutes</span>
        </div>
      </main>
    </div>
  );
}
