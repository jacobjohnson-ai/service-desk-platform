import { useEffect, useRef, useState, type FormEvent } from "react";
import { AGENT_URL, getToken } from "../lib/api";
import { useDesk } from "../lib/desk";

// The agent receives this user's login token, checks it with Supabase,
// and opens tickets under their account (no name or employee ID needed).
type Line = { role: "user" | "model" | "step"; text: string; ticketId?: number };
interface AgentReply { reply: string; tools?: { name: string }[]; ticket?: { id: number } | null; error?: string }

const STEP: Record<string, string> = {
  search_kb: "Searched the knowledge base",
  check_outages: "Checked the status page",
  check_ticket: "Looked up a ticket",
};
const SUGGESTIONS = [
  "Outlook keeps asking for my password",
  "My laptop won't charge",
  "I think I clicked a phishing link",
  "What's the status of my latest ticket?",
];

// Kept outside the component so the chat survives switching panes
let saved: { user: string; lines: Line[] } = { user: "", lines: [] };

export default function AgentChat({ onOpenTicket }: { onOpenTicket: (id: number) => void }) {
  const { me, reloadTickets } = useDesk();
  const [lines, setLines] = useState<Line[]>(saved.user === me.id ? saved.lines : []);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const msgs = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => { saved = { user: me.id, lines }; msgs.current?.scrollTo(0, msgs.current.scrollHeight); }, [lines, busy, me.id]);
  useEffect(() => { field.current?.focus(); }, []);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const next: Line[] = [...lines, { role: "user", text }];
    setLines(next);
    setInput("");
    setBusy(true);
    const history = next.filter((l) => l.role !== "step").slice(-14).map((l) => ({ role: l.role, text: l.text }));
    try {
      const res = await fetch(AGENT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ messages: history }),
      });
      const j = (await res.json()) as AgentReply;
      if (!res.ok) throw new Error(j.error || "The agent is unavailable right now.");
      const steps: Line[] = (j.tools ?? []).filter((t) => STEP[t.name]).map((t) => ({ role: "step", text: STEP[t.name] }));
      if (j.ticket) steps.push({ role: "step", text: `Opened ticket #${j.ticket.id} under your account`, ticketId: j.ticket.id });
      setLines((l) => [...l, ...steps, { role: "model", text: j.reply }]);
      if (j.ticket) reloadTickets();
    } catch (e) {
      setLines((l) => [...l, { role: "step", text: (e as Error).message }]);
    }
    setBusy(false);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    send(input.trim());
  }

  return (
    <div className="box chat">
      <div className="lbl" style={{ marginBottom: 10 }}>IT Helpdesk Agent</div>
      <div className="msgs" ref={msgs}>
        {!lines.length && (
          <>
            <div className="msg"><div className="who2">Agent</div>
              Hi {me.full_name.split(" ")[0]}, what can I help with? I can walk you through common fixes, check for outages,
              look up your tickets, or open a ticket for a technician.</div>
            <div className="sugg">{SUGGESTIONS.map((s) => <button type="button" key={s} onClick={() => send(s)}>{s}</button>)}</div>
          </>
        )}
        {lines.map((l, i) => l.role === "step"
          ? <div key={i} className="msg step">{l.text}{l.ticketId && <> · <button type="button" className="link" onClick={() => onOpenTicket(l.ticketId!)}>View ticket</button></>}</div>
          : <div key={i} className={`msg${l.role === "user" ? " u" : ""}`}><div className="who2">{l.role === "user" ? "You" : "Agent"}</div>{l.text}</div>)}
        {busy && <div className="msg step">Agent is working…</div>}
      </div>
      <form className="chatin" onSubmit={submit}>
        <input ref={field} maxLength={1000} placeholder="Describe your problem…" autoComplete="off" value={input} onChange={(e) => setInput(e.target.value)} />
        <button disabled={busy}>Send</button>
      </form>
    </div>
  );
}
