// The AI greeting-card writer. A boutique birthday-card "house writer" persona
// that crafts the words to go alongside the cartoon card. Runs on Anthropic
// (same key as the Coach). Server-only.
//   ANTHROPIC_API_KEY  — required
//   SKIP_MODEL         — optional model override (shared with the Coach)

import { GROUP_LABEL, firstName, type GroupKey, type CardTone } from "@/lib/birthday";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const SYSTEM_PROMPT = `You are the lead writer at a boutique greeting-card company that specializes in birthday cards. People come to you for the perfect few lines to go alongside a hand-illustrated cartoon birthday card.

Your craft:
- Write warm, specific, genuine birthday wishes — never generic filler or stacked clichés.
- Keep it short: 2 to 4 sentences that read beautifully on the front-inside of a card.
- Address the person by their first name.
- Match the requested tone and relationship (a note to a client reads differently than one to a sibling).
- If the writer gives you extra context (a shared memory, an inside joke, something they're celebrating), weave it in naturally — don't just list it.
- Sound like a thoughtful human wrote it, not a template.

Output rules: return ONLY the message text. No preamble, no explanation, no surrounding quotation marks, no signature or sign-off line.`;

function groupHint(group: GroupKey): string {
  if (group === "business") return "a professional contact — keep it classy, sincere, and not overly familiar";
  if (group === "family") return "a close family member — be loving, warm, and personal";
  return "a friend — be warm and a little playful";
}

export interface WriteCardInput {
  recipientName: string;
  group: GroupKey;
  tone: CardTone;
  notes?: string;
}

export async function writeCardWords(input: WriteCardInput): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("The card writer isn't set up yet (missing ANTHROPIC_API_KEY).");
  }
  const model = process.env.SKIP_MODEL || "claude-sonnet-4-6";
  const first = firstName(input.recipientName);

  const userMessage = [
    "Write a birthday card message.",
    "",
    `Recipient: ${input.recipientName}`,
    `Relationship: ${GROUP_LABEL[input.group]} — ${groupHint(input.group)}`,
    `Tone: ${input.tone}`,
    input.notes && input.notes.trim()
      ? `Extra context to weave in naturally: ${input.notes.trim()}`
      : "",
    "",
    `Address it to ${first} by first name. 2 to 4 short sentences. Return only the message.`,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[card-writer] Anthropic error", res.status, detail);
    throw new Error("The card writer hit a snag. Try again in a moment.");
  }

  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const reply = Array.isArray(data.content)
    ? data.content
        .filter((b) => b.type === "text" && typeof b.text === "string")
        .map((b) => b.text as string)
        .join("\n")
        .trim()
    : "";

  if (!reply) {
    throw new Error("The card writer didn't return anything. Try again.");
  }
  // Strip any stray wrapping quotes the model might add.
  return reply.replace(/^["']|["']$/g, "").trim();
}
