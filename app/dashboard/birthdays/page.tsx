import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BirthdaysClient } from "./BirthdaysClient";
import { type BirthdayContactDTO, toGroupKey } from "@/lib/birthday";
import { Logo } from "@/components/Logo";

export default async function BirthdaysPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { birthdayContacts: { orderBy: { createdAt: "asc" } } },
  });
  if (!user) {
    redirect("/sign-in");
  }

  const contacts: BirthdayContactDTO[] = user.birthdayContacts.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    company: c.company,
    birthday: c.birthday ? c.birthday.toISOString() : null,
    group: toGroupKey(c.group),
    includeCartoon: c.includeCartoon,
    photoUrl: c.photoUrl,
    cartoonUrl: c.cartoonUrl,
    cardMessage: c.cardMessage,
    cartoonStyle: c.cartoonStyle,
  }));

  return (
    <>
      <BirthdaysHeader name={user.name ?? user.email} />
      <BirthdaysClient initialContacts={contacts} repEmail={user.email} />
    </>
  );
}

function BirthdaysHeader({ name }: { name: string }) {
  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/dashboard">
          <Logo className="text-xl" />
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm font-semibold text-gray-700 hover:text-[#3478C0]">
            My Card
          </Link>
          <span className="text-sm font-semibold text-rose-600">Birthdays</span>
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
