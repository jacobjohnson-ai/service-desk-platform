import { useState } from "react";
import { showDetailOnPhone } from "../lib/format";
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
  const [search, setSearch] = useState("");

  const tabs = (
    <div className="tabs">
      <button className={tab === "queue" ? "on" : ""} onClick={() => setTab("queue")}>Queue</button>
      <button className={tab === "kb" ? "on" : ""} onClick={() => setTab("kb")}>Knowledge base</button>
    </div>
  );
  if (tab === "kb") return <KnowledgeBase tabs={tabs} />;

  const q = search.trim().toLowerCase().replace(/^#/, "");
  const list = tickets.filter((t) => matches(t, filter, me.id) && (!q ||
    String(t.id) === q || [t.summary, t.name, t.department, t.category].some((v) => v?.toLowerCase().includes(q))));
  // Open the first ticket automatically so the right side is never empty
  const shown = selected !== null && list.some((t) => t.id === selected) ? selected : list[0]?.id ?? null;
  return (
    <div className="split">
      <div className="col">
        {tabs}
        {me.role === "admin" && <StatsRow />}
        <div className="lbl" style={{ marginBottom: 10 }}>Queue · {list.length}</div>
        <input className="search" type="search" placeholder="Search by ticket #, problem, or name" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="filters">
          {FILTERS.map(([f, label]) => (
            <button key={f} className={`s${filter === f ? " on" : ""}`} onClick={() => setFilter(f)}>{label}</button>
          ))}
        </div>
        <div className="list">
          {list.length ? list.slice(0, 80).map((t) => (
            <TicketRow key={t.id} t={t} selected={shown === t.id} onSelect={() => { setSelected(t.id); showDetailOnPhone(); }} />
          )) : <div className="empty">Nothing here.</div>}
        </div>
      </div>
      <div className="col" id="detail">
        {shown ? <TicketDetail id={shown} /> : <div className="empty">No tickets match.</div>}
      </div>
    </div>
  );
}
