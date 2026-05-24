"use client";

import { useRef, useState, type FormEvent, type ChangeEvent, type ComponentType } from "react";
import {
  Cake,
  Gift,
  Mail,
  Plus,
  Upload,
  X,
  Calendar,
  ShieldCheck,
  Briefcase,
  Heart,
  Home,
  Wand2,
  Image as ImageIcon,
  Loader2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type GroupKey,
  type BirthdayContactDTO,
  GROUP_KEYS,
  GROUP_LABEL,
  formatBirthday,
  birthdayMonth,
  birthdayMessage,
  DEFAULT_GIFT_LABEL,
} from "@/lib/birthday";
import {
  addBirthdayContact,
  importBirthdayContacts,
  removeBirthdayContact,
  updateBirthdayOptions,
  sendApprovalDraft,
} from "./actions";

const ROSE_GRADIENT = "linear-gradient(90deg, #F43F5E, #FB923C)";

type IconType = ComponentType<{ className?: string }>;

const GROUP_META: Record<GroupKey, { icon: IconType; blurb: string; dot: string }> = {
  business: {
    icon: Briefcase,
    blurb: "Clients, prospects, and partners — polished and professional.",
    dot: "bg-sky-500",
  },
  personal: {
    icon: Heart,
    blurb: "Friends and the people you love to celebrate.",
    dot: "bg-rose-500",
  },
  family: {
    icon: Home,
    blurb: "The closest circle — warm, personal, never forgotten.",
    dot: "bg-amber-500",
  },
};

function parseCsv(text: string): { name: string; email: string; birthday: string | null; company: string | null }[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const split = (l: string) => l.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
  const first = split(lines[0]).map((s) => s.toLowerCase());
  const header = first.includes("email") || first.includes("name") ? first : null;
  const idx = (names: string[]) => (header ? header.findIndex((h) => names.includes(h)) : -1);
  const ni = idx(["name", "full name", "fullname"]);
  const ei = idx(["email", "email address"]);
  const bi = idx(["birthday", "birth date", "birthdate", "dob", "date of birth"]);
  const ci = idx(["company", "organization", "org"]);
  const dataLines = header ? lines.slice(1) : lines;

  const out: { name: string; email: string; birthday: string | null; company: string | null }[] = [];
  for (const line of dataLines) {
    const cols = split(line);
    const name = header && ni >= 0 ? cols[ni] : cols[0];
    const email = header && ei >= 0 ? cols[ei] : cols[1];
    const birthday = header && bi >= 0 ? cols[bi] : cols[2];
    const company = header && ci >= 0 ? cols[ci] : cols[3];
    if (!name || !email) continue;
    out.push({ name, email, birthday: birthday || null, company: company || null });
  }
  return out;
}

export function BirthdaysClient({
  initialContacts,
  repEmail,
}: {
  initialContacts: BirthdayContactDTO[];
  repEmail: string;
}) {
  const [contacts, setContacts] = useState<BirthdayContactDTO[]>(initialContacts);
  const [activeGroup, setActiveGroup] = useState<GroupKey>("personal");
  const [form, setForm] = useState({ name: "", email: "", company: "", birthday: "" });
  const [preview, setPreview] = useState<BirthdayContactDTO | null>(null);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flash(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2800);
  }

  const list = contacts.filter((c) => c.group === activeGroup);
  const counts: Record<GroupKey, number> = { business: 0, personal: 0, family: 0 };
  for (const c of contacts) counts[c.group]++;
  const total = contacts.length;
  const curMonth = new Date().getUTCMonth();
  const thisMonth = contacts.filter((c) => birthdayMonth(c.birthday) === curMonth).length;

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setBusy(true);
    try {
      const created = await addBirthdayContact({
        name: form.name,
        email: form.email,
        company: form.company,
        birthday: form.birthday || null,
        group: activeGroup,
      });
      setContacts((prev) => [...prev, created]);
      setForm({ name: "", email: "", company: "", birthday: "" });
      flash(`Added ${created.name} to ${GROUP_LABEL[activeGroup]}`);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const rows = parseCsv(await file.text());
      if (!rows.length) {
        flash("No usable rows found in that file");
        return;
      }
      const created = await importBirthdayContacts(rows, activeGroup);
      setContacts((prev) => [...prev, ...created]);
      flash(`Imported ${created.length} contact${created.length === 1 ? "" : "s"} into ${GROUP_LABEL[activeGroup]}`);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Couldn't read that file");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(id: string) {
    setBusy(true);
    try {
      await removeBirthdayContact(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
      setPreview((p) => (p && p.id === id ? null : p));
    } catch (err) {
      flash(err instanceof Error ? err.message : "Couldn't remove that contact");
    } finally {
      setBusy(false);
    }
  }

  async function toggleOption(id: string, key: "includeGift" | "includeCartoon", value: boolean) {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, [key]: value } : c)));
    setPreview((p) => (p && p.id === id ? { ...p, [key]: value } : p));
    try {
      await updateBirthdayOptions(id, { [key]: value });
    } catch {
      setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, [key]: !value } : c)));
      setPreview((p) => (p && p.id === id ? { ...p, [key]: !value } : p));
      flash("Couldn't save that change");
    }
  }

  async function handleSend(c: BirthdayContactDTO) {
    setSending(true);
    try {
      const res = await sendApprovalDraft(c.id);
      flash(`Approval draft sent to ${res.to}`);
      setPreview(null);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Couldn't send the draft");
    } finally {
      setSending(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100";

  return (
    <main className="bg-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: ROSE_GRADIENT }}>
                <Cake className="h-5 w-5" />
              </span>
              <h1 className="text-3xl font-black tracking-tight">Birthdays</h1>
            </div>
            <p className="mt-1.5 text-gray-600 max-w-xl">
              Never miss a birthday — be the one they remember. Approval-first birthday emails to your contacts.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" /> Nothing sends without your approval
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat icon={Calendar} label="Birthdays this month" value={thisMonth} tint="text-rose-500" />
          <Stat icon={Users} label="Contacts enrolled" value={total} tint="text-sky-500" />
          <Stat icon={Mail} label="Awaiting your approval" value={thisMonth} tint="text-amber-500" />
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {GROUP_KEYS.map((key) => {
                const Icon = GROUP_META[key].icon;
                const active = key === activeGroup;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveGroup(key)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
                      active
                        ? "bg-gray-900 text-white"
                        : "bg-gray-50 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {GROUP_LABEL[key]}
                    <span
                      className={cn(
                        "ml-1 rounded-full px-1.5 text-xs",
                        active ? "bg-white/20" : "bg-white text-gray-500 ring-1 ring-gray-200",
                      )}
                    >
                      {counts[key]}
                    </span>
                  </button>
                );
              })}
            </div>
            <span className="text-sm text-gray-500">{total} enrolled total</span>
          </div>

          <div className="grid gap-0 lg:grid-cols-5">
            <div className="border-b border-gray-100 p-6 lg:col-span-2 lg:border-b-0 lg:border-r">
              <p className="text-sm font-medium text-gray-500">{GROUP_META[activeGroup].blurb}</p>
              <form onSubmit={handleAdd} className="mt-4 space-y-3">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Full name"
                  className={inputCls}
                />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Email address"
                  className={inputCls}
                />
                <input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="Company (optional)"
                  className={inputCls}
                />
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Birthday</label>
                  <input
                    type="date"
                    value={form.birthday}
                    onChange={(e) => setForm({ ...form, birthday: e.target.value })}
                    className={cn(inputCls, "mt-1 text-gray-700")}
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
                  style={{ background: ROSE_GRADIENT }}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add to {GROUP_LABEL[activeGroup]}
                </button>
              </form>

              <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-gray-400">
                <span className="h-px flex-1 bg-gray-200" /> or <span className="h-px flex-1 bg-gray-200" />
              </div>

              <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-600 transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-60"
              >
                <Upload className="h-4 w-4" /> Upload spreadsheet (CSV)
              </button>
              <p className="mt-2 text-center text-xs text-gray-400">Columns: name, email, birthday, company</p>
            </div>

            <div className="p-6 lg:col-span-3">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">{GROUP_LABEL[activeGroup]} contacts</h3>
                <span className="text-sm text-gray-400">{list.length} enrolled</span>
              </div>

              {list.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
                  No one enrolled yet — add someone or upload a CSV on the left.
                </div>
              ) : (
                <ul className="space-y-2">
                  {list.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white", GROUP_META[activeGroup].dot)}>
                        {c.name.trim().charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-800">
                          {c.name}
                          {c.company ? <span className="font-normal text-gray-400"> · {c.company}</span> : null}
                        </p>
                        <p className="truncate text-xs text-gray-500">{c.email}</p>
                      </div>
                      <span className="hidden items-center gap-1 text-xs text-gray-500 sm:flex">
                        <Calendar className="h-3.5 w-3.5" />
                        {c.birthday ? formatBirthday(c.birthday) : "—"}
                      </span>
                      <button
                        onClick={() => setPreview(c)}
                        className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-50"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => handleRemove(c.id)}
                        disabled={busy}
                        className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600 disabled:opacity-50"
                        aria-label={`Remove ${c.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          Phase 1 · Card, cartoon portrait &amp; gift card link. Daily auto-send and the gift catalog are coming next.
        </p>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4" onClick={() => setPreview(null)}>
          <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-rose-500" />
                <span className="text-sm font-semibold">Approval preview</span>
              </div>
              <button onClick={() => setPreview(null)} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600" aria-label="Close preview">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 bg-amber-50 px-5 py-3 text-xs text-amber-700">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              We&apos;ll email this draft to <strong>{repEmail}</strong> first. Nothing sends to {firstWord(preview.name)} until you approve it.
            </div>

            <div className="px-5 py-5">
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <div className="px-6 py-8 text-center text-white" style={{ background: ROSE_GRADIENT }}>
                  <Cake className="mx-auto h-8 w-8" />
                  <p className="mt-2 text-2xl font-bold">Happy Birthday, {firstWord(preview.name)}!</p>
                  <p className="mt-1 text-sm text-rose-50">{preview.birthday ? formatBirthday(preview.birthday) : "On your special day"}</p>
                </div>

                <div className="space-y-4 px-6 py-5">
                  {preview.includeCartoon && (
                    <div className="flex flex-col items-center">
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-rose-50 ring-2 ring-rose-100">
                        <Wand2 className="h-8 w-8 text-rose-400" />
                      </div>
                      <p className="mt-2 text-xs text-gray-400">Cartoon portrait from uploaded photo</p>
                    </div>
                  )}

                  <p className="text-center text-sm leading-relaxed text-gray-700">
                    {birthdayMessage(preview.group, preview.name)}
                  </p>

                  {preview.includeGift && (
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200">
                      <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Gift className="h-4 w-4 text-rose-500" /> {DEFAULT_GIFT_LABEL}
                      </span>
                      <span className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ background: ROSE_GRADIENT }}>
                        Redeem
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Include in this email</p>
                <OptionToggle
                  icon={ImageIcon}
                  label="Cartoon portrait"
                  on={preview.includeCartoon}
                  onClick={() => toggleOption(preview.id, "includeCartoon", !preview.includeCartoon)}
                />
                <OptionToggle
                  icon={Gift}
                  label="Gift card link"
                  on={preview.includeGift}
                  onClick={() => toggleOption(preview.id, "includeGift", !preview.includeGift)}
                />
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                <span className="font-semibold text-gray-600">Will send to:</span>
                {preview.email}
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-gray-100 px-5 py-4">
              <button
                onClick={() => handleSend(preview)}
                disabled={sending}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Email me the approval draft
              </button>
              <button
                onClick={() => setPreview(null)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 ring-1 ring-gray-200 transition hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}

function firstWord(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function Stat({ icon: Icon, label, value, tint }: { icon: IconType; label: string; value: number; tint: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 ring-1 ring-gray-100">
        <Icon className={cn("h-5 w-5", tint)} />
      </span>
      <div>
        <p className="text-xl font-bold leading-none">{value}</p>
        <p className="mt-1 text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function OptionToggle({ icon: Icon, label, on, onClick }: { icon: IconType; label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 text-sm transition hover:bg-gray-50"
    >
      <span className="inline-flex items-center gap-2 font-medium text-gray-700">
        <Icon className="h-4 w-4 text-gray-500" /> {label}
      </span>
      <span className={cn("relative h-5 w-9 rounded-full transition", on ? "bg-emerald-500" : "bg-gray-300")}>
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition", on ? "left-4" : "left-0.5")} />
      </span>
    </button>
  );
}
