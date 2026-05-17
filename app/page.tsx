import Link from "next/link";
import { SalesCardFront } from "@/components/salescard/SalesCardFront";
import { SalesCardBack } from "@/components/salescard/SalesCardBack";

// Placeholder home — eventually redirects to /dashboard (if signed in)
// or /sign-in. For now, shows a preview of the two cards so we can iterate.
export default function Home() {
  const sampleQuarters = [
    { period: "Q3 24", closedWon: "$580K", quota: "88%",  winRate: "24%", pipeline: "$1.6M", avgDeal: "$72K", agents: "—", agentPipe: "—" },
    { period: "Q4 24", closedWon: "$640K", quota: "96%",  winRate: "26%", pipeline: "$1.8M", avgDeal: "$76K", agents: "—", agentPipe: "—" },
    { period: "Q1 25", closedWon: "$720K", quota: "110%", winRate: "27%", pipeline: "$1.9M", avgDeal: "$80K", agents: "1", agentPipe: "$50K"  },
    { period: "Q2 25", closedWon: "$810K", quota: "120%", winRate: "28%", pipeline: "$2.0M", avgDeal: "$82K", agents: "2", agentPipe: "$130K" },
    { period: "Q3 25", closedWon: "$880K", quota: "132%", winRate: "30%", pipeline: "$2.2M", avgDeal: "$84K", agents: "2", agentPipe: "$220K" },
    { period: "Q4 25", closedWon: "$940K", quota: "140%", winRate: "31%", pipeline: "$2.3M", avgDeal: "$86K", agents: "3", agentPipe: "$340K" },
    { period: "Q1 26", closedWon: "$1.0M", quota: "148%", winRate: "33%", pipeline: "$2.4M", avgDeal: "$88K", agents: "4", agentPipe: "$480K" },
    { period: "Q2 26", closedWon: "$1.1M", quota: "156%", winRate: "35%", pipeline: "$2.5M", avgDeal: "$90K", agents: "4", agentPipe: "$580K" },
  ];
  const totals = { period: "TOTAL", closedWon: "$6.67M", quota: "124%", winRate: "29%", pipeline: "$16.7M", avgDeal: "$82K", agents: "4", agentPipe: "$1.8M" };

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center mb-12">
          <div className="text-sm tracking-widest font-bold text-[#3478C0] mb-3">SALESCARD · APP</div>
          <h1 className="text-5xl font-black tracking-tight">
            <span className="text-[#3478C0]">Sales</span>
            <span className="text-[#10B981]">Card</span>
          </h1>
          <p className="text-gray-600 mt-3 text-lg">
            The app skeleton is live. Sign in to claim your card.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 bg-[#3478C0] text-white font-semibold px-6 py-3 rounded-full hover:bg-[#1E5A9C] transition"
            >
              Sign in with LinkedIn →
            </Link>
            <a
              href="https://salescard.ai"
              className="inline-flex items-center gap-2 text-gray-700 font-semibold px-6 py-3 rounded-full hover:bg-gray-100 transition"
            >
              ← Back to landing
            </a>
          </div>
        </div>

        <div className="text-center text-sm font-bold tracking-widest text-gray-400 uppercase mb-6">
          Sample card preview
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div>
            <div className="text-xs font-bold tracking-widest text-gray-400 mb-3 text-center">FRONT</div>
            <SalesCardFront
              name="Morgan Lee"
              role="Senior AE"
              score={92}
              linkedinHandle="morgan-lee"
              subGrades={{ PIPELINE: 9.4, WIN_RATE: 9.0, QUOTA: 9.6, TENURE: 8.8 }}
            />
          </div>
          <div>
            <div className="text-xs font-bold tracking-widest text-gray-400 mb-3 text-center">BACK</div>
            <SalesCardBack
              name="Morgan Lee"
              role="Senior AE"
              score={92}
              quarters={sampleQuarters}
              totals={totals}
              scoutReport="Lee's 8-quarter ascent from 88% to 156% quota marks eight consecutive quarters of growth. Adoption of AI agents drove a 4× lift in pipeline leverage from FY25 to FY26. Closed-won and avg deal size hit career highs in Q2 26."
            />
          </div>
        </div>
      </div>
    </main>
  );
}
