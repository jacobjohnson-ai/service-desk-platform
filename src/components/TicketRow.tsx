import { replyDue, splitSummary, when } from "../lib/format";
import { useDesk } from "../lib/desk";
import type { Ticket } from "../lib/types";
import StatusDot from "./StatusDot";

export default function TicketRow({ t, selected, onSelect }: { t: Ticket; selected: boolean; onSelect: () => void }) {
  const { people, isStaff } = useDesk();
  const assignee = t.assigned_to ? people[t.assigned_to] : null;
  const due = isStaff ? replyDue(t) : null;
  return (
    <div className={`item${selected ? " sel" : ""}`} onClick={onSelect}>
      <div className="id">#{t.id}</div>
      <div>
        <div className="t">{splitSummary(t.summary).title || t.message}</div>
        <div className="m">
          {isStaff && <>{t.name}{t.department && ` · ${t.department}`} · </>}
          <span className={t.urgency === "high" ? "urg-high" : ""}>{t.urgency}</span>
          {" · "}{assignee ? `Assigned to ${assignee.full_name}` : "Unassigned"}
          {" · "}{when(t.created_at)}
          {due && <> · <span className={`due${due.late ? " late" : ""}`}>{due.text}</span></>}
        </div>
      </div>
      <StatusDot status={t.status} />
    </div>
  );
}
