import { useState } from "react";
import { useDesk } from "../lib/desk";
import type { Ticket } from "../lib/types";
import TicketRow from "./TicketRow";
import TicketDetail from "./TicketDetail";
import StatsRow from "./StatsRow";
import KnowledgeBase from "./KnowledgeBase";

type Filter = "active" | "unassigned" | "mine" | "high" | "resolved";
const FILTERS: [Filter, string][] = [
  ["active", "Active"], ["unassigned", "Unassigned"], ["mine", "Assigned to me"], ["high", "High urgency"], ["resolved", "Resolved"],
];

function matches(t: Ticket, f: Filter, me: string): boolean {
  const active = t.status !== "resolved";
  switch (f) {
    case "active": return active;
    case "unassigned": return active && !t.assigned_to;
    case "mine": return active && t.assigned_to === me;
    case "high": return active && t.urgency === "high";
    case "resolved": return !active;
  }
}

export default function StaffView() {
  const { me, tickets } = useDesk();
  const [tab, setTab] = useState<"queue" | "kb">("queue");
  const [filter, setFilter] = useState<Filter>("active");
  const [selected, setSelected] = useState<number | null>(null);

  const tabs = (
    <div className="tabs">
      <button className={tab === "queue" ? "on" : ""} onClick={() => setTab("queue")}>Queue</button>
      <button className={tab === "kb" ? "on" : ""} onClick={() => setTab("kb")}>Knowledge base</button>
    </div>
  );
  if (tab === "kb") return <KnowledgeBase tabs={tabs} />;

  const list = tickets.filter((t) => matches(t, filter, me.id));
  return (
    <div className="split">
      <div className="col">
        {tabs}
        {me.role === "admin" && <StatsRow />}
        <div className="lbl" style={{ marginBottom: 10 }}>Queue · {list.length}</div>
        <div className="filters">
          {FILTERS.map(([f, label]) => (
            <button key={f} className={`s${filter === f ? " on" : ""}`} onClick={() => setFilter(f)}>{label}</button>
          ))}
        </div>
        <div className="list">
          {list.length ? list.slice(0, 80).map((t) => (
            <TicketRow key={t.id} t={t} selected={selected === t.id} onSelect={() => setSelected(t.id)} />
          )) : <div className="empty">Nothing here.</div>}
        </div>
      </div>
      <div className="col">
        {selected ? <TicketDetail id={selected} /> : <div className="empty">Pick a ticket from the queue.</div>}
      </div>
    </div>
  );
}
