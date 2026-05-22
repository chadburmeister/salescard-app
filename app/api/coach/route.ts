import { auth } from "@/lib/auth";
import { SKIP_SYSTEM_PROMPT } from "@/lib/skip-prompt";

// Skip runs on Claude. Model is overridable via env without a code change.
const MODEL = process.env.SKIP_MODEL || "claude-sonnet-4-6";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

type ChatMessage = { role: "user" | "assistant"; content: string };

// ===========================================================================
// POST /api/coach
// Body: { messages: [{ role, content }] } — the full conversation so far.
// Returns: { reply: string } — Skip's next message.
// Everything here is private to the signed-in rep. Nothing is shared.
// ===========================================================================
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Skip isn't configured yet (missing ANTHROPIC_API_KEY)." },
      { status: 500 }
    );
  }

  let body: { messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }

  // Keep only well-formed user/assistant turns.
  const raw = Array.isArray(body.messages) ? body.messages : [];
  const messages: ChatMessage[] = raw
    .filter(
      (m: unknown): m is ChatMessage =>
        !!m &&
        typeof (m as ChatMessage).content === "string" &&
        ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant")
    )
    .map((m: ChatMessage) => ({ role: m.role, content: m.content }));

  if (messages.length === 0 || messages[0].role !== "user") {
    return Response.json({ error: "Conversation must start with a user message." }, { status: 400 });
  }

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: SKIP_SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("[/api/coach] Anthropic error:", res.status, detail);
      return Response.json(
        { error: "Skip hit a snag reaching the coach service.", detail },
        { status: 502 }
      );
    }

    const data = await res.json();
    const reply = Array.isArray(data?.content)
      ? data.content.filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("\n").trim()
      : "";

    if (!reply) {
      return Response.json({ error: "Skip didn't have anything to say. Try again." }, { status: 502 });
    }

    return Response.json({ reply });
  } catch (err) {
    console.error("[/api/coach] request failed:", err);
    return Response.json({ error: "Skip hit a snag. Try again in a moment." }, { status: 500 });
  }
}
