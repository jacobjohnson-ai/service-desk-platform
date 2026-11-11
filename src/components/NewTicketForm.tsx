import { useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { useDesk } from "../lib/desk";
import { workEmail } from "../lib/format";
import type { Ticket, Urgency } from "../lib/types";

const SCORE: Record<Urgency, number> = { low: 3, medium: 5, high: 8 };

export default function NewTicketForm({ onCreated }: { onCreated: (id: number) => void }) {
  const { me, reloadTickets } = useDesk();
  const [summary, setSummary] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("technical_issue");
  const [urgency, setUrgency] = useState<Urgency>("medium");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const [t] = await api<Ticket[]>("/rest/v1/tickets", {
        method: "POST", prefer: "return=representation",
        body: {
          requester_id: me.id, name: me.full_name, email: workEmail(me.full_name), department: me.department,
          summary: summary.trim(), message: message.trim(), category, urgency, priority_score: SCORE[urgency],
        },
      });
      await reloadTickets();
      onCreated(t.id);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="box">
      <div className="lbl" style={{ marginBottom: 14 }}>New ticket</div>
      <form className="form" onSubmit={submit}>
        <div><label>What's the problem?</label>
          <input maxLength={140} required placeholder="Example: Outlook keeps asking for my password" value={summary} onChange={(e) => setSummary(e.target.value)} /></div>
        <div><label>Details</label>
          <textarea maxLength={1500} required placeholder="What happens, when it started, and what you've tried" value={message} onChange={(e) => setMessage(e.target.value)} /></div>
        <div className="two">
          <div><label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="technical_issue">Technical issue</option><option value="billing">Billing</option><option value="general">General</option>
            </select></div>
          <div><label>Urgency</label>
            <select value={urgency} onChange={(e) => setUrgency(e.target.value as Urgency)}>
              <option value="low">Low: it can wait</option><option value="medium">Medium: slowing me down</option><option value="high">High: I can't work</option>
            </select></div>
        </div>
        <div><button disabled={busy}>{busy ? "Submitting…" : "Submit ticket"}</button></div>
        {error && <div className="err">{error}</div>}
      </form>
    </div>
  );
}
