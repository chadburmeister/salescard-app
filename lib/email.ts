// Resend email helpers.
// Uses the Resend HTTP API directly (no SDK dependency on @react-email since we
// already removed it). Env vars expected:
//   RESEND_API_KEY  — API key from resend.com/api-keys
//   EMAIL_FROM      — "SalesCard <verify@salescard.ai>" or similar
//   NEXTAUTH_URL    — used to build absolute links back to the app
//     (defaults to https://app.salescard.ai if unset in prod)
const RESEND_ENDPOINT = "https://api.resend.com/emails";
function fromAddress(): string {
  return process.env.EMAIL_FROM || "SalesCard <verify@salescard.ai>";
}
function baseUrl(): string {
  // NEXTAUTH_URL is set in Vercel env vars; fall back to the prod URL.
  return (process.env.NEXTAUTH_URL || "https://app.salescard.ai").replace(/\/$/, "");
}
async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }
  const body = {
    from: fromAddress(),
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
  };
  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Resend email failed: ${res.status} ${errText}`);
  }
}
// =========================================================================
// VERIFICATION REQUEST — sent to the verifier
// =========================================================================
export interface VerificationEmailPayload {
  verifierEmail: string;
  verifierName?: string | null;
  repName: string;
  repEmail: string;          // used for reply-to so verifier can reach the rep
  relationship?: string | null; // "manager" / "peer" / "ops"
  quarters: Array<{
    period: string;
    closedWon?: string | null;
    quota?: string | null;
    winRate?: string | null;
    pipeline?: string | null;
  }>;
  token: string;
}
export async function sendVerificationRequest(p: VerificationEmailPayload): Promise<void> {
  const url = `${baseUrl()}/verify/${p.token}`;
  const greeting = p.verifierName ? `Hi ${firstName(p.verifierName)},` : "Hi,";
  const relPhrase = p.relationship ? ` ${describeRelationship(p.relationship)}` : "";
  const intro = `${p.repName} is building their SalesCard — a verified record of their sales performance — and listed you as${relPhrase ? relPhrase : " someone"} who can confirm their numbers.`;
  const quartersTextLines = p.quarters.map(q => {
    const parts: string[] = [];
    if (q.closedWon) parts.push(`closed-won ${q.closedWon}`);
    if (q.quota)     parts.push(`quota ${q.quota}`);
    if (q.winRate)   parts.push(`win ${q.winRate}`);
    if (q.pipeline)  parts.push(`pipeline ${q.pipeline}`);
    return `  • ${q.period}${parts.length ? ` — ${parts.join(", ")}` : ""}`;
  }).join("\n");
  const text = (
    `${greeting}\n\n` +
    `${intro}\n\n` +
    `Quarters they're asking you to verify:\n` +
    `${quartersTextLines}\n\n` +
    `Click here to confirm or flag any discrepancy (takes 30 seconds, no login):\n` +
    `${url}\n\n` +
    `If you weren't expecting this email, you can ignore it — no action taken.\n\n` +
    `Thanks,\n` +
    `SalesCard\n`
  );
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
<div style="max-width:580px;margin:32px auto;background:white;border-radius:16px;padding:36px 32px;">
  <div style="margin-bottom:24px;">
    <span style="font-weight:900;font-size:22px;letter-spacing:-0.02em;">
      <span style="color:#3478C0;">Sales</span><span style="color:#10B981;">Card</span>
    </span>
  </div>
  <h1 style="font-size:22px;line-height:1.2;letter-spacing:-0.02em;font-weight:900;margin:0 0 12px;">
    Verify ${escapeHtml(p.repName)}'s sales numbers
  </h1>
  <p style="font-size:15px;line-height:1.55;color:#374151;margin:0 0 18px;">
    ${greeting === "Hi," ? "" : escapeHtml(greeting) + "<br><br>"}${escapeHtml(intro)}
  </p>
  <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:18px 22px;margin:18px 0;">
    <div style="font-size:11px;font-weight:800;letter-spacing:0.1em;color:#6B7280;margin-bottom:10px;text-transform:uppercase;">
      Quarters they're asking you to verify
    </div>
    ${p.quarters.map(q => `
      <div style="padding:10px 0;border-top:1px solid #E5E7EB;">
        <div style="font-weight:700;font-size:14px;color:#111827;">${escapeHtml(q.period)}</div>
        <div style="font-size:13px;color:#6B7280;margin-top:2px;">
          ${[
            q.closedWon ? `Closed-won <b style="color:#111827;">${escapeHtml(q.closedWon)}</b>` : null,
            q.quota     ? `Quota <b style="color:#111827;">${escapeHtml(q.quota)}</b>` : null,
            q.winRate   ? `Win rate <b style="color:#111827;">${escapeHtml(q.winRate)}</b>` : null,
            q.pipeline  ? `Pipeline <b style="color:#111827;">${escapeHtml(q.pipeline)}</b>` : null,
          ].filter(Boolean).join(" · ") || "(no data)"}
        </div>
      </div>
    `).join("")}
  </div>
  <div style="margin:28px 0;text-align:center;">
    <a href="${url}" style="display:inline-block;background:#3478C0;color:white;font-weight:700;font-size:15px;padding:14px 28px;border-radius:999px;text-decoration:none;">
      Confirm or flag these numbers
    </a>
  </div>
  <p style="font-size:13px;line-height:1.55;color:#6B7280;margin:18px 0 0;">
    Takes ~30 seconds. No login required. You'll see ${escapeHtml(p.repName)}'s name and the numbers — confirm with one click, or report a discrepancy.
  </p>
  <hr style="border:0;border-top:1px solid #e5e7eb;margin:28px 0;">
  <p style="font-size:12px;color:#9ca3af;margin:0;">
    If you weren't expecting this email, you can ignore it — no action taken. Sent by SalesCard at the request of ${escapeHtml(p.repName)}.
  </p>
</div>
</body></html>`;
  await sendEmail({
    to: p.verifierEmail,
    subject: `${p.repName} asked you to verify their sales numbers`,
    html,
    text,
    replyTo: p.repEmail,
  });
}
// =========================================================================
// VERIFICATION RESULT — sent to the rep when verifier responds
// =========================================================================
export interface VerificationResultPayload {
  repEmail: string;
  repName: string;
  verifierName?: string | null;
  verifierEmail: string;
  approved: boolean;
  rejectionReason?: string | null;
  approvedPeriods: string[];
  cardUrl: string;  // absolute URL to /dashboard
}
export async function sendVerificationResult(p: VerificationResultPayload): Promise<void> {
  const subject = p.approved
    ? `Your SalesCard quarters got verified ✓`
    : `Your SalesCard verification was flagged`;
  const verifierLabel = p.verifierName ? `${p.verifierName} (${p.verifierEmail})` : p.verifierEmail;
  const text = p.approved
    ? `Good news — ${verifierLabel} just confirmed your numbers for ${p.approvedPeriods.join(", ")}. ` +
      `Those quarters now carry full weight in your SalesCard Score. ` +
      `View your updated card: ${p.cardUrl}`
    : `${verifierLabel} flagged your verification request${p.rejectionReason ? ` with this note: "${p.rejectionReason}"` : ""}. ` +
      `Your numbers stay on your card at half weight until verified by someone else. ` +
      `View your card: ${p.cardUrl}`;
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
<div style="max-width:560px;margin:32px auto;background:white;border-radius:16px;padding:36px 32px;">
  <div style="margin-bottom:24px;font-weight:900;font-size:22px;letter-spacing:-0.02em;">
    <span style="color:#3478C0;">Sales</span><span style="color:#10B981;">Card</span>
  </div>
  ${p.approved ? `
    <h1 style="font-size:22px;line-height:1.2;font-weight:900;margin:0 0 12px;">
      Your quarters got verified ✓
    </h1>
    <p style="font-size:15px;line-height:1.55;color:#374151;">
      <strong>${escapeHtml(verifierLabel)}</strong> just confirmed your numbers for <strong>${escapeHtml(p.approvedPeriods.join(", "))}</strong>.
      Those quarters now carry full weight in your SalesCard Score.
    </p>
  ` : `
    <h1 style="font-size:22px;line-height:1.2;font-weight:900;margin:0 0 12px;">
      Your verification was flagged
    </h1>
    <p style="font-size:15px;line-height:1.55;color:#374151;">
      <strong>${escapeHtml(verifierLabel)}</strong> flagged your verification request${p.rejectionReason ? `:` : "."}
      ${p.rejectionReason ? `<br><em style="color:#6B7280;">"${escapeHtml(p.rejectionReason)}"</em>` : ""}
    </p>
    <p style="font-size:14.5px;color:#6B7280;">
      Your numbers stay on your card at half weight until verified by someone else.
    </p>
  `}
  <div style="margin:24px 0 0;text-align:center;">
    <a href="${p.cardUrl}" style="display:inline-block;background:#3478C0;color:white;font-weight:700;padding:12px 24px;border-radius:999px;text-decoration:none;">
      View my SalesCard →
    </a>
  </div>
</div>
</body></html>`;
  await sendEmail({
    to: p.repEmail,
    subject,
    html,
    text,
  });
}
// =========================================================================
// ORG INVITE — sent to a teammate invited to a recruiter team
// =========================================================================
export interface OrgInviteEmailPayload {
  inviteeEmail: string;
  inviterName: string;
  inviterEmail?: string | null;
  orgName: string;
  role: string; // "MEMBER" | "ADMIN"
  token: string;
}
export async function sendOrgInvite(p: OrgInviteEmailPayload): Promise<void> {
  const url = `${baseUrl()}/join/${p.token}`;
  const roleWord = p.role && p.role.toUpperCase() === "ADMIN" ? "an admin" : "a member";
  const intro =
    `${p.inviterName} invited you to join ${p.orgName} on SalesCard as ${roleWord}. ` +
    `SalesCard lets your team search a pool of sales reps with verified, quarter-by-quarter numbers — ` +
    `so you stop taking resumes at face value.`;
  const text = (
    `Hi,\n\n` +
    `${intro}\n\n` +
    `Accept your invite (sign in with LinkedIn — takes a minute):\n` +
    `${url}\n\n` +
    `If you weren't expecting this, you can ignore it — no action taken.\n\n` +
    `Thanks,\n` +
    `SalesCard\n`
  );
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
<div style="max-width:560px;margin:32px auto;background:white;border-radius:16px;padding:36px 32px;">
  <div style="margin-bottom:24px;font-weight:900;font-size:22px;letter-spacing:-0.02em;">
    <span style="color:#3478C0;">Sales</span><span style="color:#10B981;">Card</span>
  </div>
  <h1 style="font-size:22px;line-height:1.2;letter-spacing:-0.02em;font-weight:900;margin:0 0 12px;">
    Join ${escapeHtml(p.orgName)} on SalesCard
  </h1>
  <p style="font-size:15px;line-height:1.55;color:#374151;margin:0 0 18px;">
    ${escapeHtml(intro)}
  </p>
  <div style="margin:28px 0;text-align:center;">
    <a href="${url}" style="display:inline-block;background:#3478C0;color:white;font-weight:700;font-size:15px;padding:14px 28px;border-radius:999px;text-decoration:none;">
      Accept invitation
    </a>
  </div>
  <p style="font-size:13px;line-height:1.55;color:#6B7280;margin:18px 0 0;">
    You'll sign in with LinkedIn to accept. This unlocks your team's recruiter search and analytics.
  </p>
  <hr style="border:0;border-top:1px solid #e5e7eb;margin:28px 0;">
  <p style="font-size:12px;color:#9ca3af;margin:0;">
    If you weren't expecting this email, you can ignore it — no action taken. Sent by SalesCard at the request of ${escapeHtml(p.inviterName)}.
  </p>
</div>
</body></html>`;
  await sendEmail({
    to: p.inviteeEmail,
    subject: `${p.inviterName} invited you to join ${p.orgName} on SalesCard`,
    html,
    text,
    replyTo: p.inviterEmail || undefined,
  });
}
// helpers
function firstName(name: string): string {
  return name.split(/\s+/)[0] || name;
}
function describeRelationship(r: string): string {
  const lower = r.toLowerCase();
  if (lower.includes("manager")) return "their current or former manager";
  if (lower.includes("peer"))    return "a peer rep";
  if (lower.includes("ops") || lower.includes("rev")) return "a RevOps partner";
  return r;
}
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
