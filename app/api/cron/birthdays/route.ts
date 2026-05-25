// Daily cron that powers automated birthday emails.
//
// Vercel calls this once a day (see vercel.json). Each run:
//   • emails the rep an approval draft a few days before each birthday, and
//   • sends approved greetings to recipients on the day.
// Secured with CRON_SECRET: Vercel automatically attaches
// `Authorization: Bearer <CRON_SECRET>` to scheduled invocations when the env
// var is set, so requests without it are rejected.

import { NextResponse } from "next/server";
import { runDailyBirthdayJob } from "@/lib/birthday-dispatch";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const summary = await runDailyBirthdayJob();
    console.log("[cron/birthdays] done:", summary);
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    console.error("[cron/birthdays] failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
