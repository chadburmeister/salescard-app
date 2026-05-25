import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import { toGroupKey, GROUP_LABEL, formatBirthday } from "@/lib/birthday";
import { CardStudioClient } from "./CardStudioClient";

// Cartoon generation can take a little while — give the server action room.
export const maxDuration = 60;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CardStudioPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const contact = await db.birthdayContact.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!contact) notFound();

  const groupKey = toGroupKey(contact.group);
  const dto = {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    group: groupKey,
    groupLabel: GROUP_LABEL[groupKey],
    birthdayLabel: formatBirthday(contact.birthday) || null,
    photoUrl: contact.photoUrl,
    cartoonUrl: contact.cartoonUrl,
    cardMessage: contact.cardMessage,
    cartoonStyle: contact.cartoonStyle,
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard">
            <Logo className="text-xl" />
          </Link>
          <Link
            href="/dashboard/birthdays"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-rose-600"
          >
            <ArrowLeft className="h-4 w-4" /> Birthdays
          </Link>
        </div>
      </header>
      <CardStudioClient contact={dto} />
    </>
  );
}
