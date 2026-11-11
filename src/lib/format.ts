import type { Status, Ticket, Urgency } from "./types";

export const STATUS_LABEL: Record<Status, string> = { open: "Open", in_progress: "In progress", resolved: "Resolved" };

// Target time to first reply, by urgency (matches response_target_hours() in the database)
export const TARGET_HOURS: Record<Urgency, number> = { high: 4, medium: 24, low: 72 };

export function when(d: string | null | undefined): string {
  if (!d) return "";
  const t = new Date(d);
  return `${t.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

export type Due = { text: string; late: boolean } | null;

export function replyDue(t: Ticket, now = Date.now()): Due {
  if (t.status === "resolved") return null;
  if (t.first_response_at) return { text: "Replied", late: false };
  const left = TARGET_HOURS[t.urgency] - (now - new Date(t.created_at).getTime()) / 36e5;
  if (left < 0) return { text: "Reply overdue", late: true };
  return { text: `Reply due in ${left < 1 ? `${Math.max(1, Math.round(left * 60))}m` : `${Math.round(left)}h`}`, late: false };
}

// Agent tickets store "Problem. Tried: steps" in one field; split them for display.
export function splitSummary(summary: string | null): { title: string; tried: string | null } {
  const s = summary ?? "";
  const i = s.indexOf(" Tried: ");
  return i < 0 ? { title: s, tried: null } : { title: s.slice(0, i), tried: s.slice(i + 8) };
}

export function workEmail(fullName: string): string {
  const parts = fullName.toLowerCase().split(/\s+/).filter(Boolean);
  return `${parts[0]}.${parts[parts.length - 1]}@northwind.example`;
}
