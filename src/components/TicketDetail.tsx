import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { useDesk } from "../lib/desk";
import { replyDue, splitSummary, TARGET_HOURS, when } from "../lib/format";
import type { AuditEntry, Note, Status } from "../lib/types";
import StatusDot from "./StatusDot";

export default function TicketDetail({ id }: { id: number }) {
  const { me, people, tickets, isStaff, reloadTickets } = useDesk();
  const t = tickets.find((x) => x.id === id);
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [n, a] = await Promise.all([
      api<Note[]>(`/rest/v1/ticket_notes?ticket_id=eq.${id}&select=id,author_id,body,internal,created_at&order=id`),
      isStaff ? api<AuditEntry[]>(`/rest/v1/audit_log?ticket_id=eq.${id}&select=action,detail,actor_id,created_at&order=id`) : Promise.resolve([]),
    ]);
    setNotes(n);
    setAudit(a);
  }, [id, isStaff]);

  useEffect(() => {
    setNotes(null);
    setError("");
    load().catch((e: Error) => setError(e.message));
  }, [load]);

  if (!t) return null;
  const assignee = t.assigned_to ? people[t.assigned_to] : null;
  const due = replyDue(t);
  const { title, tried } = splitSummary(t.summary);

  async function update(body: { status?: Status; assigned_to?: string }) {
    setBusy(true);
    setError("");
    try {
      await api(`/rest/v1/tickets?id=eq.${id}`, { method: "PATCH", body, prefer: "return=minimal" });
      await reloadTickets();
      await load();
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api("/rest/v1/ticket_notes", {
        method: "POST", prefer: "return=minimal",
        body: { ticket_id: id, author_id: me.id, body: reply.trim(), internal: isStaff && internal },
      });
      setReply("");
      setInternal(false);
      await Promise.all([load(), reloadTickets()]);
    } catch (err) { setError((err as Error).message); }
    setBusy(false);
  }

  return (
    <div className="box">
      <div className="dh"><h2>#{t.id} · {title || "Ticket"}</h2><StatusDot status={t.status} /></div>
      <div className="meta">
        <span>Requester</span><div>{t.name}{t.department && ` · ${t.department}`}</div>
        <span>Urgency</span><div className={`urg-${t.urgency}`}>{t.urgency} · priority {t.priority_score}/10</div>
        <span>Assigned to</span><div>{assignee ? assignee.full_name : "Nobody yet"}</div>
        <span>Opened</span><div>{when(t.created_at)}</div>
        <span>First reply</span>
        <div>
          {t.first_response_at ? when(t.first_response_at)
            : t.status === "resolved" ? "None"
            : due && <><span className={`due${due.late ? " late" : due.soon ? " soon" : ""}`}>{due.text}</span> <span className="due">(target {TARGET_HOURS[t.urgency]}h)</span></>}
        </div>
        {tried && <><span>Already tried</span><div>{tried}</div></>}
        {t.message && t.message !== t.summary && <><span>Details</span><div className="pre">{t.message}</div></>}
      </div>

      {isStaff && (
        <div className="acts">
          {t.assigned_to !== me.id && <button className="s" disabled={busy} onClick={() => update({ assigned_to: me.id })}>Assign to me</button>}
          {t.status === "open" && (
            <button className="s" disabled={busy} onClick={() => update(t.assigned_to ? { status: "in_progress" } : { status: "in_progress", assigned_to: me.id })}>Start work</button>
          )}
          {t.status !== "resolved"
            ? <button disabled={busy} onClick={() => update({ status: "resolved" })}>Mark resolved</button>
            : <button className="s" disabled={busy} onClick={() => update({ status: "open" })}>Reopen</button>}
        </div>
      )}

      <div className="lbl">Conversation</div>
      <div className="thread">
        {notes === null ? <div className="empty">Loading…</div>
          : notes.length ? notes.map((n) => (
            <div key={n.id} className={`note${n.internal ? " internal" : ""}`}>
              <div className="h"><b>{people[n.author_id]?.full_name ?? "Someone"}</b> · {when(n.created_at)}{n.internal && <span className="tag">Internal note</span>}</div>
              <div className="b">{n.body}</div>
            </div>
          )) : <div className="empty">No replies yet.</div>}
      </div>

      <form className="reply" onSubmit={send}>
        <textarea maxLength={2000} value={reply} onChange={(e) => setReply(e.target.value)}
          placeholder={isStaff ? "Reply to the employee, or add an internal note" : "Add a reply for the technician"} />
        <div className="row">
          {isStaff ? <label className="chk"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Internal note (staff only)</label> : <span />}
          <button disabled={busy}>Send</button>
        </div>
        {error && <div className="err">{error}</div>}
      </form>

      {isStaff && (
        <>
          <div className="sect lbl">Audit log</div>
          <div className="audit">
            {audit.length ? audit.map((a, i) => (
              <div key={i}><span>{when(a.created_at)}</span><span>{(a.actor_id && people[a.actor_id]?.full_name) || "System"} · {a.action}{a.detail && `: ${a.detail}`}</span></div>
            )) : <div><span /><span>No changes recorded yet.</span></div>}
          </div>
        </>
      )}
    </div>
  );
}
