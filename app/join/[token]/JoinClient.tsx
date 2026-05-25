"use client";

import { useState } from "react";
import { acceptInvite } from "./actions";

interface Props {
  token: string;
  orgName: string;
  role: string;
  inviteEmail: string;
  myEmail: string;
}

export function JoinClient({ token, orgName, role, inviteEmail, myEmail }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const mismatch =
    inviteEmail && myEmail && inviteEmail.toLowerCase() !== myEmail.toLowerCase();

  async function accept() {
    setBusy(true);
    setErr(null);
    const res = await acceptInvite(token);
    // On success acceptInvite redirects; we only land here on error.
    if (res && !res.ok) {
      setErr(res.error);
      setBusy(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
      <div className="text-xs tracking-widest font-bold text-[#0A66C2] uppercase mb-2">
        Team invitation
      </div>
      <h1 className="text-xl font-black tracking-tight mb-2">Join {orgName}</h1>
      <p className="text-gray-600 text-sm mb-6">
        You&apos;ve been invited as a{" "}
        <span className="font-semibold">{role.toLowerCase()}</span>. Accept to share this
        team&apos;s talent search and analytics.
      </p>

      {mismatch && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-4">
          This invite was sent to {inviteEmail}, but you&apos;re signed in as {myEmail}.
          You can still accept with this account.
        </p>
      )}

      <button
        onClick={accept}
        disabled={busy}
        className="w-full bg-gray-900 text-white font-semibold rounded-full py-3 hover:bg-gray-800 transition disabled:opacity-50"
      >
        {busy ? "Joining…" : "Accept invitation"}
      </button>

      {err && <p className="text-sm text-red-600 mt-3">{err}</p>}

      <p className="text-xs text-gray-400 mt-4">Signed in as {myEmail}</p>
    </div>
  );
}
