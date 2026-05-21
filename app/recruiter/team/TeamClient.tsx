"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOrg, addOrInviteMember, revokeMember, revokeInvite } from "./actions";

interface MemberRow {
  membershipId: string;
  name: string;
  email: string;
  role: string;
  joined: string;
  isYou: boolean;
}
interface InviteRow {
  id: string;
  email: string;
  role: string;
  joinUrl: string;
  expires: string;
}
export interface TeamData {
  name: string;
  plan: string;
  isOwner: boolean;
  canManage: boolean;
  seatsUsed: number;
  seatsReserved: number;
  seatLimit: number;
  seatsAvailable: number;
  members: MemberRow[];
  invites: InviteRow[];
}

export function TeamClient({ data }: { data: TeamData | null }) {
  if (!data) return <CreateTeam />;
  return <ManageTeam data={data} />;
}

// ---------------------------------------------------------------------------
// No org yet -> create one
// ---------------------------------------------------------------------------
function CreateTeam() {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await createOrg(name);
    // On success createOrg redirects; we only get here on error.
    if (res && !res.ok) {
      setErr(res.error);
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-16">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        <div className="text-xs tracking-widest font-bold text-[#3478C0] uppercase mb-2">
          Recruiter teams
        </div>
        <h1 className="text-2xl font-black tracking-tight mb-2">Create your team</h1>
        <p className="text-gray-600 text-sm mb-6">
          Spin up a shared recruiting workspace. Invite teammates by email or add reps who
          already have a SalesCard account. Everyone on the team shares one search and one
          analytics view.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Team name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Talent Partners"
              className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3478C0]"
            />
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-gray-900 text-white font-semibold rounded-full py-3 hover:bg-gray-800 transition disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create team"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Org exists -> manage seats
// ---------------------------------------------------------------------------
function ManageTeam({ data }: { data: TeamData }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await addOrInviteMember({ email, role });
    setBusy(false);
    if (!res.ok) {
      setMsg({ kind: "err", text: res.error });
      return;
    }
    setEmail("");
    setMsg({
      kind: "ok",
      text:
        res.mode === "added"
          ? `Added ${res.email} to the team.`
          : `Invite created for ${res.email}. Copy their join link below.`,
    });
    router.refresh();
  }

  async function removeMember(id: string, label: string) {
    if (!confirm(`Remove ${label} from the team?`)) return;
    const res = await revokeMember(id);
    if (!res.ok) {
      setMsg({ kind: "err", text: res.error });
      return;
    }
    router.refresh();
  }

  async function cancelInvite(id: string, label: string) {
    if (!confirm(`Revoke the invite for ${label}?`)) return;
    const res = await revokeInvite(id);
    if (!res.ok) {
      setMsg({ kind: "err", text: res.error });
      return;
    }
    router.refresh();
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setMsg({ kind: "ok", text: "Join link copied to clipboard." });
    } catch {
      setMsg({ kind: "err", text: "Couldn't copy — select and copy the link manually." });
    }
  }

  const pct = data.seatLimit > 0 ? Math.min(100, Math.round((data.seatsUsed / data.seatLimit) * 100)) : 0;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="text-xs tracking-widest font-bold text-[#3478C0] uppercase mb-1">
          Team
        </div>
        <h1 className="text-3xl font-black tracking-tight">{data.name}</h1>
      </div>

      {/* Seat usage */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <div className="text-sm font-bold text-gray-700">Seats</div>
          <div className="text-sm text-gray-500">
            <span className="font-black text-gray-900">{data.seatsUsed}</span> used
            {data.seatsReserved > 0 && <> · {data.seatsReserved} pending</>} ·{" "}
            {data.seatLimit} total
          </div>
        </div>
        <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#10B981] rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        {data.seatsAvailable === 0 && (
          <p className="text-xs text-amber-600 mt-2 font-semibold">
            All seats are in use. Free up a seat to add someone new.
          </p>
        )}
      </div>

      {/* Add teammate */}
      {data.canManage && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="text-sm font-bold text-gray-700 mb-1">Add a teammate</div>
          <p className="text-xs text-gray-500 mb-4">
            If they already have a SalesCard account, they join instantly. Otherwise we create
            an invite link you can send them.
          </p>
          <form onSubmit={add} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@company.com"
              className="flex-1 border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3478C0]"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "MEMBER" | "ADMIN")}
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#3478C0]"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button
              type="submit"
              disabled={busy || data.seatsAvailable <= 0}
              className="bg-gray-900 text-white font-semibold rounded-lg px-5 py-2.5 hover:bg-gray-800 transition disabled:opacity-50 whitespace-nowrap"
            >
              {busy ? "Adding…" : "Add / Invite"}
            </button>
          </form>
          {msg && (
            <p className={`text-sm mt-3 ${msg.kind === "ok" ? "text-emerald-600" : "text-red-600"}`}>
              {msg.text}
            </p>
          )}
        </div>
      )}

      {/* Members */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <div className="text-sm font-bold text-gray-700 mb-4">
          Members ({data.members.length})
        </div>
        <div className="space-y-2">
          {data.members.map((m) => (
            <div
              key={m.membershipId}
              className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0"
            >
              <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-black text-xs flex-shrink-0">
                {initials(m.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 truncate">
                  {m.name}
                  {m.isYou && <span className="text-gray-400 font-normal"> (you)</span>}
                </div>
                <div className="text-xs text-gray-500 truncate">{m.email}</div>
              </div>
              <RoleBadge role={m.role} />
              {data.canManage && m.role !== "OWNER" && !m.isYou && (
                <button
                  onClick={() => removeMember(m.membershipId, m.name)}
                  className="text-xs font-semibold text-gray-400 hover:text-red-600 transition"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pending invites */}
      {data.invites.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="text-sm font-bold text-gray-700 mb-4">
            Pending invites ({data.invites.length})
          </div>
          <div className="space-y-3">
            {data.invites.map((i) => (
              <div key={i.id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{i.email}</div>
                    <div className="text-xs text-gray-500">
                      Expires {i.expires} · {i.role.toLowerCase()}
                    </div>
                  </div>
                  <span className="text-xs font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    Pending
                  </span>
                  {data.canManage && (
                    <button
                      onClick={() => cancelInvite(i.id, i.email)}
                      className="text-xs font-semibold text-gray-400 hover:text-red-600 transition"
                    >
                      Revoke
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <code className="flex-1 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1.5 truncate">
                    {i.joinUrl}
                  </code>
                  <button
                    onClick={() => copy(i.joinUrl)}
                    className="text-xs font-semibold text-[#3478C0] hover:underline whitespace-nowrap"
                  >
                    Copy link
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    OWNER: "bg-gray-900 text-white",
    ADMIN: "bg-[#3478C0] text-white",
    MEMBER: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full ${
        map[role] || map.MEMBER
      }`}
    >
      {role}
    </span>
  );
}

function initials(s: string): string {
  const parts = (s || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
