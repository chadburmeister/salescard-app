import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { formatBirthday, GROUP_LABEL, toGroupKey, firstName } from "@/lib/birthday";
import { BirthdayApprovalActions } from "./BirthdayApprovalActions";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function BirthdayApprovalPage({ params }: PageProps) {
  const { token } = await params;

  const dispatch = await db.birthdayDispatch.findUnique({
    where: { token },
    include: { contact: { include: { user: true } } },
  });

  if (!dispatch) notFound();

  const contact = dispatch.contact;
  const recipientFirst = firstName(contact.name);
  const groupKey = toGroupKey(contact.group);
  const bdayLabel = formatBirthday(contact.birthday) || "their birthday";

  const decided = dispatch.status !== "PENDING_APPROVAL";

  const extras: string[] = [];
  if (dispatch.includeCartoon) extras.push("a cartoon portrait");
  if (dispatch.includeGift) extras.push(dispatch.giftLabel || "a gift card");

  return (
    <main className="min-h-screen" style={{ background: "#FFF7F5" }}>
      <div className="max-w-xl mx-auto px-6 py-12">
        <div className="text-center mb-8 flex items-center justify-center gap-2.5">
          <Link href="/dashboard/birthdays" className="text-2xl">
            <Logo />
          </Link>
          <span
            className="text-[11px] font-bold uppercase tracking-wide text-white px-2.5 py-1 rounded-full"
            style={{ background: "linear-gradient(90deg,#F43F5E,#FB923C)" }}
          >
            Birthdays
          </span>
        </div>

        <div
          className="bg-white rounded-3xl shadow-sm border p-8"
          style={{ borderColor: "#FBE4DD" }}
        >
          {decided ? (
            <DecidedState
              status={dispatch.status}
              recipientFirst={recipientFirst}
              bdayLabel={bdayLabel}
            />
          ) : (
            <>
              <div
                className="text-xs tracking-widest font-bold uppercase mb-2"
                style={{ color: "#F43F5E" }}
              >
                Approval needed
              </div>
              <h1 className="text-2xl font-black tracking-tight mb-1.5">
                Send {recipientFirst} a happy birthday?
              </h1>
              <p className="text-gray-600 text-[15px] mb-6">
                Review the message below. Nothing is sent until you approve it.
              </p>

              {/* recipient summary */}
              <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 mb-6">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                  style={{ background: "linear-gradient(135deg,#F43F5E,#FB923C)" }}
                >
                  {recipientFirst.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-gray-900 truncate">{contact.name}</div>
                  <div className="text-sm text-gray-500 truncate">
                    🎂 {bdayLabel} · {GROUP_LABEL[groupKey]}
                    {contact.email ? ` · ${contact.email}` : ""}
                  </div>
                </div>
              </div>

              <BirthdayApprovalActions
                token={token}
                recipientFirst={recipientFirst}
                bdayLabel={bdayLabel}
                initialMessage={dispatch.message}
              />

              {extras.length > 0 && (
                <p className="text-xs text-gray-400 text-center mt-4">
                  You marked {recipientFirst} to also receive {extras.join(" and ")}.
                </p>
              )}
            </>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center mt-6 max-w-sm mx-auto">
          You&apos;re receiving this because you set up automated birthdays in SalesCard.
          Manage everything from your{" "}
          <Link href="/dashboard/birthdays" className="underline">
            Birthdays dashboard
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

function DecidedState({
  status,
  recipientFirst,
  bdayLabel,
}: {
  status: "APPROVED" | "SKIPPED" | "SENT" | "FAILED" | "PENDING_APPROVAL";
  recipientFirst: string;
  bdayLabel: string;
}) {
  if (status === "SENT") {
    return (
      <div className="text-center py-6">
        <div className="text-4xl mb-3">🎉</div>
        <h2 className="text-2xl font-black tracking-tight mb-2">Already sent.</h2>
        <p className="text-gray-700 max-w-sm mx-auto">
          Your birthday message went out to {recipientFirst}. Nothing more to do.
        </p>
      </div>
    );
  }
  if (status === "APPROVED") {
    return (
      <div className="text-center py-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 className="text-2xl font-black tracking-tight mb-2">Approved.</h2>
        <p className="text-gray-700 max-w-sm mx-auto">
          We&apos;ll send your message to {recipientFirst} on {bdayLabel}.
        </p>
      </div>
    );
  }
  if (status === "FAILED") {
    return (
      <div className="text-center py-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
        </div>
        <h2 className="text-2xl font-black tracking-tight mb-2">Something went wrong.</h2>
        <p className="text-gray-700 max-w-sm mx-auto">
          We couldn&apos;t send the message to {recipientFirst}. It&apos;s been logged — try again from your Birthdays dashboard.
        </p>
      </div>
    );
  }
  // SKIPPED
  return (
    <div className="text-center py-6">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </div>
      <h2 className="text-2xl font-black tracking-tight mb-2">Skipped.</h2>
      <p className="text-gray-700 max-w-sm mx-auto">
        No message will be sent to {recipientFirst} this year.
      </p>
    </div>
  );
}
