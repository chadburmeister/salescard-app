"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  orgName: string | null;
  hasOrg: boolean;
}

export function RecruiterNav({ orgName, hasOrg }: Props) {
  const path = usePathname() || "/recruiter";

  const tabs = hasOrg
    ? [
        { href: "/recruiter", label: "Find talent" },
        { href: "/recruiter/team", label: "Team" },
        { href: "/recruiter/analytics", label: "Analytics" },
      ]
    : [
        { href: "/recruiter", label: "Find talent" },
        { href: "/recruiter/team", label: "Create team" },
      ];

  const isActive = (href: string) =>
    href === "/recruiter" ? path === "/recruiter" : path.startsWith(href);

  return (
    <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/recruiter" className="font-black tracking-tight whitespace-nowrap">
            <span className="text-[#3478C0]">Sales</span>
            <span className="text-[#10B981]">Card</span>
            <span className="text-gray-400 font-bold"> · Recruiter</span>
          </Link>
          {orgName && (
            <span className="hidden sm:inline-block text-sm text-gray-500 truncate border-l border-gray-200 pl-3">
              {orgName}
            </span>
          )}
        </div>

        <nav className="flex items-center gap-1">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={
                "px-3.5 py-1.5 rounded-full text-sm font-semibold transition " +
                (isActive(t.href)
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100")
              }
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
