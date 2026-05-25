"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

type Msg = { role: "user" | "assistant"; content: string; hidden?: boolean };

// Hidden kickoff turn so the API sees a valid user-first conversation, while the
// rep only sees Skip's greeting.
const KICKOFF: Msg = {
  role: "user",
  content: "I just opened the chat and I'm ready to begin.",
  hidden: true,
};

export function CoachChat({ firstName }: { firstName: string }) {
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(history: Msg[]) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "request failed");
      setMessages([...history, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Skip hit a snag. Give it another try in a moment.");
    } finally {
      setLoading(false);
    }
  }

  async function start() {
    setStarted(true);
    const history = [KICKOFF];
    setMessages(history);
    await send(history);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    const history: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(history);
    setInput("");
    await send(history);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  const visible = messages.filter((m) => !m.hidden);

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111827] flex flex-col">
      {/* top bar */}
      <header className="border-b border-gray-100 bg-white">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo className="text-xl" />
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">
            ← Dashboard
          </Link>
        </div>
      </header>

      {!started ? (
        // ---------- INTRO ----------
        <main className="max-w-3xl mx-auto px-6 py-12 w-full">
          <span className="inline-block bg-[#e8f1fb] text-[#3478C0] font-bold text-xs tracking-widest uppercase px-3 py-1.5 rounded-full mb-5">
            Goals Coach
          </span>
          <h1 className="text-4xl font-black tracking-tight leading-tight mb-3">
            Hey {firstName} — meet Skip.
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-2xl">
            Skip is your goals coach. In a calm, one-question-at-a-time conversation, Skip helps
            you get clear on what you actually want, why it matters, and the very first step to
            get there — so you stop running fast in the wrong direction.
          </p>

          <div className="grid sm:grid-cols-3 gap-4 mb-10">
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="text-2xl mb-2">🔒</div>
              <div className="font-bold mb-1">Completely private</div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Everything you share stays on your account. Recruiters never see it.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="text-2xl mb-2">💬</div>
              <div className="font-bold mb-1">One question at a time</div>
              <p className="text-sm text-gray-600 leading-relaxed">
                No forms. Just a conversation, at your pace — about 15–20 minutes.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="text-2xl mb-2">📈</div>
              <div className="font-bold mb-1">Built for reps</div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Skip gets the SDR/BDR world — the grind, the metrics, the next rung.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={start}
              className="inline-flex items-center bg-[#3478C0] text-white font-bold text-base px-7 py-3.5 rounded-full hover:bg-[#2d68a8] transition-colors"
            >
              Start with Skip
            </button>
            <span className="text-sm text-gray-400">Takes about 15–20 minutes</span>
          </div>
        </main>
      ) : (
        // ---------- CHAT ----------
        <>
          <main className="flex-1 w-full">
            <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">
              {visible.map((m, i) => (
                <div
                  key={i}
                  className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={
                      m.role === "user"
                        ? "max-w-[80%] bg-[#3478C0] text-white rounded-2xl rounded-br-md px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap"
                        : "max-w-[80%] bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap"
                    }
                  >
                    {m.role === "assistant" && (
                      <div className="text-xs font-bold text-[#10B981] mb-1">Skip</div>
                    )}
                    {m.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 text-sm text-gray-400">
                    Skip is thinking…
                  </div>
                </div>
              )}

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <div ref={endRef} />
            </div>
          </main>

          {/* composer */}
          <div className="sticky bottom-0 border-t border-gray-100 bg-white">
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-6 py-4 flex items-end gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Type your answer…"
                className="flex-1 resize-none rounded-2xl border border-gray-300 px-4 py-3 text-[15px] leading-relaxed focus:outline-none focus:border-[#3478C0] focus:ring-1 focus:ring-[#3478C0] max-h-40"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-[#3478C0] text-white font-bold px-5 py-3 rounded-full hover:bg-[#2d68a8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
