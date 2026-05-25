import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { JoinClient } from "./JoinClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="font-black text-xl tracking-tight">
            <span className="text-[#0A66C2]">Sales</span>
            <span className="text-[#10B981]">Card</span>
          </Link>
        </div>
        {children}
      </div>
    </main>
  );
}

function InfoCard({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: boolean;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
      <h1 className="text-xl font-black tracking-tight mb-2">{title}</h1>
      <p className="text-gray-600 text-sm">{body}</p>
      {cta && (
        <Link
          href="/recruiter"
          className="inline-block mt-5 bg-gray-900 text-white font-semibold rounded-full px-5 py-2.5 hover:bg-gray-800 transition"
        >
          Go to recruiter workspace
        </Link>
      )}
    </div>
  );
}

export default async function JoinPage({ params }: PageProps) {
  const { token } = await params;

  const invite = await db.orgInvite.findUnique({
    where: { token },
    include: { org: true },
  });

  if (!invite) {
    return (
      <Shell>
        <InfoCard title="Invite not found" body="This link is invalid or has already been used." />
      </Shell>
    );
  }
  if (invite.status === "ACCEPTED") {
    return (
      <Shell>
        <InfoCard title="Already accepted" body="This invite has already been used." cta />
      </Shell>
    );
  }
  if (invite.status === "REVOKED") {
    return (
      <Shell>
        <InfoCard title="Invite revoked" body="The team owner revoked this invite." />
      </Shell>
    );
  }
  if (invite.status === "EXPIRED" || invite.expiresAt.getTime() < Date.now()) {
    return (
      <Shell>
        <InfoCard title="Invite expired" body="Ask the team owner to send you a fresh invite." />
      </Shell>
    );
  }

  const session = await auth();

  if (!session?.user?.id) {
    const callback = encodeURIComponent(`/join/${token}`);
    return (
      <Shell>
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
          <div className="text-xs tracking-widest font-bold text-[#0A66C2] uppercase mb-2">
            Team invitation
          </div>
          <h1 className="text-xl font-black tracking-tight mb-2">
            You&apos;re invited to join {invite.org.name}
          </h1>
          <p className="text-gray-600 text-sm mb-6">
            Sign in to accept and start searching verified sales talent with your team.
          </p>
          <Link
            href={`/sign-in?callbackUrl=${callback}`}
            className="inline-block bg-gray-900 text-white font-semibold rounded-full px-6 py-3 hover:bg-gray-800 transition"
          >
            Sign in to accept
          </Link>
          <p className="text-xs text-gray-400 mt-4">
            Invitation sent to {invite.email}
          </p>
        </div>
      </Shell>
    );
  }

  const userId = session.user.id;

  const mine = await db.orgMembership.findUnique({
    where: { orgId_userId: { orgId: invite.orgId, userId } },
  });
  if (mine) {
    return (
      <Shell>
        <InfoCard
          title="You're on this team"
          body={`You're already a member of ${invite.org.name}.`}
          cta
        />
      </Shell>
    );
  }

  const other = await db.orgMembership.findFirst({ where: { userId } });
  if (other) {
    return (
      <Shell>
        <InfoCard
          title="You're on another team"
          body="You already belong to a different team. Leave it before joining a new one."
        />
      </Shell>
    );
  }

  const me = await db.user.findUnique({ where: { id: userId } });

  return (
    <Shell>
      <JoinClient
        token={token}
        orgName={invite.org.name}
        role={invite.role}
        inviteEmail={invite.email}
        myEmail={me?.email ?? ""}
      />
    </Shell>
  );
}
