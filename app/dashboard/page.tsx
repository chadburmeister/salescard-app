import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { currentPeriods } from "@/lib/quarters";
import { KpiForm } from "./KpiForm";
import { CardView } from "./CardView";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      card: {
        include: {
          quarters: true,
          verifications: { orderBy: { sentAt: "desc" } },
        },
      },
    },
  });
  if (!user) {
    redirect("/sign-in");
  }

  // Recruiters get the search app, not the rep dashboard.
  if (user.isRecruiter) {
    redirect("/recruiter");
  }

  const hasData = user.card && user.card.quarters.length > 0;

  if (hasData && user.card) {
    return (
      <>
        <DashboardHeader name={user.name ?? user.email} />
        <CardView user={user} card={user.card} />
      </>
    );
  }

  // First-time user — show the KPI form
  const quarters = currentPeriods();
  return (
    <>
      <DashboardHeader name={user.name ?? user.email} />
      <main className="min-h-screen bg-white">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="mb-8">
            <div className="text-xs tracking-widest font-bold text-[#3478C0] uppercase mb-2">Step 1 of 1</div>
            <h1 className="text-4xl font-black tracking-tight mb-3">
              Welcome, {firstName(user.name ?? user.email)}.
            </h1>
            <p className="text-gray-700 text-lg max-w-2xl">
              Fill in your recent quarters of stats and we&apos;ll generate your SalesCard. You can edit anything later, and you control who sees it.
            </p>
            <p className="text-sm text-gray-500 mt-3">
              Leave any field blank if you don&apos;t have the number. Your <b>SalesCard Score</b> is calculated from what you provide.
            </p>
          </div>
          <KpiForm quarters={quarters} initialRole="AE" />
        </div>
      </main>
    </>
  );
}

function DashboardHeader({ name }: { name: string }) {
  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="font-black text-xl tracking-tight">
          <span className="text-[#3478C0]">Sales</span>
          <span className="text-[#10B981]">Card</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 hidden sm:inline">{name}</span>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
            <button type="submit" className="text-sm font-semibold text-gray-700 hover:text-[#3478C0]">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

function firstName(name: string): string {
  return name.split(/\s+/)[0] || name;
}
